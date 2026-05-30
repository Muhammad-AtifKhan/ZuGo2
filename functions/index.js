// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * SCHEDULED FUNCTION: Runs every 15 minutes
 * Cleans up expired pending bookings and releases seats
 */
exports.cleanupExpiredBookings = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;

    console.log('🧹 Starting expired bookings cleanup at:', new Date().toISOString());

    try {
      // Find all pending bookings with expired deadline
      const expiredBookingsQuery = await db
        .collection('bookings')
        .where('status', '==', 'pending_payment')
        .where('paymentDeadline', '<', now)
        .limit(500)
        .get();

      console.log(`📊 Found ${expiredBookingsQuery.size} expired bookings`);

      if (expiredBookingsQuery.empty) {
        console.log('✅ No expired bookings found');
        return null;
      }

      // Process each expired booking
      for (const bookingDoc of expiredBookingsQuery.docs) {
        const booking = bookingDoc.data();
        const tripId = booking.tripId;
        const seatNumbers = booking.seatNumbers || [];

        console.log(`⏰ Expiring booking: ${bookingDoc.id}, Trip: ${tripId}, Seats: ${seatNumbers.join(', ')}`);

        // 1. Update booking status
        batch.update(bookingDoc.ref, {
          status: 'expired',
          paymentStatus: 'failed',
          expiredAt: now,
          updatedAt: now
        });
        batchCount++;

        // 2. Release all seats for this booking
        if (tripId && seatNumbers.length > 0) {
          for (const seatNum of seatNumbers) {
            const seatRef = db
              .collection('trips')
              .doc(tripId)
              .collection('seats')
              .doc(seatNum);

            batch.update(seatRef, {
              isBooked: false,
              status: 'available',
              reservedBy: null,
              bookingId: null,
              reservedUntil: null,
              updatedAt: now
            });
            batchCount++;
          }
        }

        // 3. Commit batch if reaching limit
        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          console.log(`💾 Committed batch of ${batchCount} operations`);
          // Start new batch
          batchCount = 0;
        }
      }

      // Commit final batch
      if (batchCount > 0) {
        await batch.commit();
        console.log(`💾 Committed final batch of ${batchCount} operations`);
      }

      console.log(`✅ Cleanup completed successfully at: ${new Date().toISOString()}`);
      return null;

    } catch (error) {
      console.error('❌ Error in cleanupExpiredBookings:', error);
      throw error;
    }
  });

/**
 * TRIGGER FUNCTION: Runs when a new booking is created
 * Logs booking creation (optional - for monitoring)
 */
exports.onBookingCreate = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate(async (snapshot, context) => {
    const booking = snapshot.data();
    const bookingId = context.params.bookingId;

    console.log('📝 New booking created:', {
      bookingId,
      userId: booking.userId,
      tripId: booking.tripId,
      status: booking.status,
      paymentMethod: booking.paymentMethod,
      total: booking.totalAmount,
      seats: booking.seatNumbers
    });

    // Optional: Send notification or email here
    // Keep it minimal to save quota

    return null;
  });

/**
 * OPTIONAL: Manual trigger function (for testing)
 * Call this URL to manually run cleanup: https://your-project.cloudfunctions.net/manualCleanup
 */
exports.manualCleanup = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Optional: Add secret key for security
  const secretKey = req.headers['x-cleanup-key'];
  if (secretKey !== 'your-secret-key-here') {
    res.status(401).send('Unauthorized');
    return;
  }

  try {
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    let count = 0;

    const expiredBookingsQuery = await db
      .collection('bookings')
      .where('status', '==', 'pending_payment')
      .where('paymentDeadline', '<', now)
      .limit(100)
      .get();

    for (const bookingDoc of expiredBookingsQuery.docs) {
      const booking = bookingDoc.data();
      const tripId = booking.tripId;
      const seatNumbers = booking.seatNumbers || [];

      batch.update(bookingDoc.ref, {
        status: 'expired',
        paymentStatus: 'failed',
        expiredAt: now,
        updatedAt: now
      });
      count++;

      if (tripId && seatNumbers.length > 0) {
        for (const seatNum of seatNumbers) {
          const seatRef = db
            .collection('trips')
            .doc(tripId)
            .collection('seats')
            .doc(seatNum);

          batch.update(seatRef, {
            status: 'available',
            reservedBy: null,
            bookingId: null,
            reservedUntil: null,
            updatedAt: now
          });
        }
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    res.json({ success: true, cleaned: count });
  } catch (error) {
    console.error('Manual cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * SCHEDULED FUNCTION: Runs every 15 minutes
 * Cleans up scheduled or boarding trips that are not started 1 hour after departure time,
 * marks them as expired, and releases the driver and bus.
 */
exports.cleanupExpiredTrips = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const nowJS = now.toDate();
    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;

    console.log('🧹 Starting expired trips cleanup at:', nowJS.toISOString());

    try {
      // Find all scheduled or boarding trips
      const scheduledTripsQuery = await db
        .collection('trips')
        .where('status', 'in', ['scheduled', 'boarding'])
        .get();

      console.log(`📊 Found ${scheduledTripsQuery.size} active pre-trip candidates`);

      if (scheduledTripsQuery.empty) {
        console.log('✅ No candidate trips found');
        return null;
      }

      for (const tripDoc of scheduledTripsQuery.docs) {
        const trip = tripDoc.data();
        
        if (!trip.date || !trip.departureTime) {
          continue;
        }

        // Parse local PKT date and time
        const [year, month, day] = trip.date.split('-').map(Number);
        const [hours, minutes] = trip.departureTime.split(':').map(Number);

        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
          continue;
        }

        // Pakistan Standard Time is UTC+5. So scheduled time in UTC is PKT - 5 hours.
        const scheduledTimeUTC = new Date(Date.UTC(year, month - 1, day, hours - 5, minutes, 0));

        // Expire if current time is more than 1 hour (3600000 ms) after departure time
        const oneHourMs = 60 * 60 * 1000;
        const timeDiff = nowJS.getTime() - scheduledTimeUTC.getTime();

        if (timeDiff > oneHourMs) {
          console.log(`⚠️ Expiring Trip: ${tripDoc.id} (${trip.routeName}), Scheduled: ${trip.date} ${trip.departureTime}`);

          // 1. Update trip status to expired
          batch.update(tripDoc.ref, {
            status: 'expired',
            updatedAt: now
          });
          batchCount++;

          // 2. Release driver if assigned and currently locked to this trip
          if (trip.driverId) {
            const driverRef = db.collection('drivers').doc(trip.driverId);
            const driverDoc = await driverRef.get();
            if (driverDoc.exists) {
              const driver = driverDoc.data();
              if (driver.currentTripId === tripDoc.id) {
                batch.update(driverRef, {
                  status: 'available',
                  currentTripId: admin.firestore.FieldValue.delete(),
                  lastStatusUpdate: now
                });
                batchCount++;
              }
            }
          }

          // 3. Release bus if assigned and currently locked to this trip
          if (trip.busId) {
            const busRef = db.collection('buses').doc(trip.busId);
            const busDoc = await busRef.get();
            if (busDoc.exists) {
              const bus = busDoc.data();
              if (bus.currentTripId === tripDoc.id) {
                batch.update(busRef, {
                  status: 'available',
                  currentTripId: admin.firestore.FieldValue.delete(),
                  updatedAt: now
                });
                batchCount++;
              }
            }
          }

          // Commit batch if limit reached
          if (batchCount >= MAX_BATCH_SIZE) {
            await batch.commit();
            console.log(`💾 Committed batch of ${batchCount} operations`);
            batchCount = 0;
          }
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        console.log(`💾 Committed final batch of ${batchCount} operations`);
      }

      console.log('✅ Expired trips cleanup completed successfully');
      return null;
    } catch (error) {
      console.error('❌ Error in cleanupExpiredTrips:', error);
      throw error;
    }
  });
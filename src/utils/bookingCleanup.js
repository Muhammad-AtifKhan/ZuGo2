// src/utils/bookingCleanup.js
import firestore from '@react-native-firebase/firestore';

/**
 * Cleanup expired pending bookings for a user
 * @param {string} userId - Current user ID
 * @returns {Promise<void>}
 */
export const cleanupExpiredBookings = async (userId) => {
  if (!userId) return;

  try {
    const db = firestore();
    const now = new Date();

    console.log('🧹 Checking for expired bookings...');

    // Find user's expired pending bookings
    const expiredBookings = await db
      .collection('bookings')
      .where('userId', '==', userId)
      .where('status', '==', 'pending_payment')
      .where('paymentDeadline', '<', now)
      .get();

    if (expiredBookings.empty) {
      console.log('✅ No expired bookings found');
      return;
    }

    console.log(`📊 Found ${expiredBookings.size} expired bookings to clean up`);

    const batch = db.batch();
    const seatRefsToRelease = [];

    // For each booking, we will query its seats to check their state
    for (const bookingDoc of expiredBookings.docs) {
      const booking = bookingDoc.data();
      const tripId = booking.tripId;
      const seatNumbers = booking.seatNumbers || [];

      console.log(`⏰ Expiring booking: ${bookingDoc.id}, Trip: ${tripId}`);

      // 1. Update booking status
      batch.update(bookingDoc.ref, {
        status: 'expired',
        paymentStatus: 'failed',
        expiredAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      // 2. Release all seats for this booking (only if they are still reserved by this user/booking)
      if (tripId && seatNumbers.length > 0) {
        const checkPromises = seatNumbers.map(async (seatNum) => {
          const seatRef = db
            .collection('trips')
            .doc(tripId)
            .collection('seats')
            .doc(seatNum);

          try {
            const seatDoc = await seatRef.get();
            if (seatDoc.exists) {
              const seatData = seatDoc.data();
              // Check if we are authorized to release this seat according to security rules:
              // - It is reserved by the current user, OR
              // - Its bookingId matches the current expired booking
              const isCurrentlyReservedByUser = 
                seatData.status === 'reserved' && 
                seatData.reservedBy === userId;
              
              const isLinkedToThisBooking = 
                seatData.bookingId === bookingDoc.id;

              if (isCurrentlyReservedByUser || isLinkedToThisBooking) {
                seatRefsToRelease.push(seatRef);
              } else {
                console.log(`⚠️ Seat ${seatNum} is in state (status: ${seatData.status}, reservedBy: ${seatData.reservedBy}, bookingId: ${seatData.bookingId}) and does not need/allow client cleanup`);
              }
            }
          } catch (seatError) {
            console.error(`Error checking seat ${seatNum} for trip ${tripId}:`, seatError);
          }
        });

        await Promise.all(checkPromises);
      }
    }

    // Add qualified seat updates to the batch
    for (const seatRef of seatRefsToRelease) {
      batch.update(seatRef, {
        isBooked: false,
        status: 'available',
        reservedBy: null,
        bookingId: null,
        reservedUntil: null,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
    console.log(`✅ Cleaned up ${expiredBookings.size} expired bookings`);

  } catch (error) {
    console.error('❌ Error cleaning up expired bookings:', error);
  }
};

/**
 * Cleanup ALL expired bookings (Admin only - use carefully)
 * @returns {Promise<number>} Number of cleaned bookings
 */
export const cleanupAllExpiredBookings = async () => {
  try {
    const db = firestore();
    const now = new Date();

    const expiredBookings = await db
      .collection('bookings')
      .where('status', '==', 'pending_payment')
      .where('paymentDeadline', '<', now)
      .get();

    if (expiredBookings.empty) {
      return 0;
    }

    const batch = db.batch();
    let count = 0;

    for (const bookingDoc of expiredBookings.docs) {
      const booking = bookingDoc.data();

      batch.update(bookingDoc.ref, {
        status: 'expired',
        paymentStatus: 'failed',
        expiredAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      count++;

      // Batch size limit handle karo
      if (count % 400 === 0) {
        await batch.commit();
      }
    }

    if (count % 400 !== 0) {
      await batch.commit();
    }

    return count;
  } catch (error) {
    console.error('Error in cleanupAllExpiredBookings:', error);
    return 0;
  }
};
// src/scripts/generateExistingTripsSeats.js
// RUN THIS SCRIPT ONLY ONCE TO GENERATE SEATS FOR EXISTING TRIPS

import firestore from '@react-native-firebase/firestore';

/**
 * Generate seats for ALL existing trips that don't have seats yet
 * RUN THIS USING: node src/scripts/generateExistingTripsSeats.js
 */
const generateSeatsForAllTrips = async () => {
  console.log('🚀 STARTING SEAT GENERATION FOR EXISTING TRIPS...');
  console.log('==========================================');

  try {
    const db = firestore();

    // Saare upcoming/active trips fetch karein
    const tripsSnapshot = await db
      .collection('trips')
      .where('status', 'in', ['upcoming', 'active'])
      .get();

    console.log(`📊 Found ${tripsSnapshot.size} trips to process`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const tripDoc of tripsSnapshot.docs) {
      const tripData = tripDoc.data();
      const tripId = tripDoc.id;

      console.log(`\n🔍 Processing trip: ${tripId}`);
      console.log(`   Route: ${tripData.routeName || 'N/A'}`);
      console.log(`   From: ${tripData.from} → To: ${tripData.to}`);

      // Check if seats already exist
      const seatsSnapshot = await db
        .collection('trips')
        .doc(tripId)
        .collection('seats')
        .limit(1)
        .get();

      if (!seatsSnapshot.empty) {
        console.log(`   ⏭️ Seats already exist for this trip, skipping...`);
        skipCount++;
        continue;
      }

      // Generate seats
      const totalSeats = tripData.totalSeats || 40;
      const fare = tripData.fare || 0;

      console.log(`   🪑 Generating ${totalSeats} seats with fare PKR ${fare}...`);

      const batch = db.batch();
      const rows = Math.ceil(totalSeats / 5);
      const columns = 5;

      for (let row = 1; row <= rows; row++) {
        for (let col = 1; col <= columns; col++) {
          const seatNumber = `${row}${String.fromCharCode(64 + col)}`;
          const seatRef = db
            .collection('trips')
            .doc(tripId)
            .collection('seats')
            .doc(seatNumber);

          const isPremium = row <= 2;
          const isWindow = col === 1 || col === 5;
          const isAisle = col === 3;
          const isMiddle = col === 2 || col === 4;
          const hasExtraLegroom = row === 1;
          const isWheelchairAccessible = row === rows && (col === 1 || col === 2);

          batch.set(seatRef, {
            seatNumber,
            row,
            column: col,
            isBooked: false,
            status: 'available',
            price: isPremium ? Math.round(fare * 1.25) : fare,
            type: isWindow ? 'window' : isAisle ? 'aisle' : 'middle',
            isWindow,
            isAisle,
            isMiddle,
            hasExtraLegroom,
            isWheelchairAccessible,
            reservedBy: null,
            reservedUntil: null,
            bookingId: null,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp()
          });
        }
      }

      await batch.commit();
      successCount++;
      console.log(`   ✅ Successfully generated seats for trip ${tripId}`);
    }

    console.log('\n==========================================');
    console.log('🎉 SEAT GENERATION COMPLETE!');
    console.log('==========================================');
    console.log(`📊 Total trips processed: ${tripsSnapshot.size}`);
    console.log(`✅ Successfully generated: ${successCount}`);
    console.log(`⏭️ Already existed (skipped): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('==========================================');

  } catch (error) {
    console.error('❌ FATAL ERROR in generateSeatsForAllTrips:', error);
  }
};

// Run the function
generateSeatsForAllTrips();
// src/utils/seatHelpers.js
// YEH FUNCTIONS APP MEIN USE HONGE

import firestore from '@react-native-firebase/firestore';

/**
 * Get available seats for a trip
 * @param {string} tripId - ID of the trip
 * @returns {Promise<Array>} Array of available seat objects
 */
export const getAvailableSeats = async (tripId) => {
  try {
    console.log(`🔍 Fetching available seats for trip: ${tripId}`);

    const seatsSnapshot = await firestore()
      .collection('trips')
      .doc(tripId)
      .collection('seats')
      .where('status', '==', 'available')
      .orderBy('seatNumber')
      .get();

    const seats = seatsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Found ${seats.length} available seats`);
    return seats;

  } catch (error) {
    console.error('❌ Error getting available seats:', error);
    return [];
  }
};

/**
 * Get all seats for a trip (for layout display)
 * @param {string} tripId - ID of the trip
 * @returns {Promise<Array>} Array of all seat objects
 */
export const getAllSeats = async (tripId) => {
  try {
    const seatsSnapshot = await firestore()
      .collection('trips')
      .doc(tripId)
      .collection('seats')
      .orderBy('seatNumber')
      .get();

    return seatsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error('Error getting all seats:', error);
    return [];
  }
};

/**
 * Check if specific seats are available
 * @param {string} tripId - ID of the trip
 * @param {Array<string>} seatNumbers - Array of seat numbers to check
 * @returns {Promise<Array>} Array of seat availability results
 */
export const checkSeatsAvailability = async (tripId, seatNumbers) => {
  try {
    const db = firestore();
    const results = [];

    for (const seatNum of seatNumbers) {
      const seatDoc = await db
        .collection('trips')
        .doc(tripId)
        .collection('seats')
        .doc(seatNum)
        .get();

      if (!seatDoc.exists) {
        results.push({
          seatNumber: seatNum,
          available: false,
          reason: 'not_found',
          status: 'unknown'
        });
        continue;
      }

      const seatData = seatDoc.data();
      const isAvailable = seatData?.status === 'available';

      results.push({
        seatNumber: seatNum,
        available: isAvailable,
        status: seatData?.status,
        price: seatData?.price,
        type: seatData?.type
      });
    }

    return results;

  } catch (error) {
    console.error('Error checking seats:', error);
    throw error;
  }
};

/**
 * Hold seats for user (15 minutes)
 * @param {string} tripId - ID of the trip
 * @param {Array<string>} seatNumbers - Array of seat numbers to hold
 * @param {string} userId - ID of the user
 * @returns {Promise<Object>} Result with success status and reservedUntil
 */
export const holdSeats = async (tripId, seatNumbers, userId) => {
  const db = firestore();
  const batch = db.batch();
  const holdDuration = 15; // minutes
  const reservedUntil = new Date(Date.now() + holdDuration * 60 * 1000);

  try {
    console.log(`🔒 Attempting to hold ${seatNumbers.length} seats for user ${userId}`);

    // First verify all seats are available
    for (const seatNum of seatNumbers) {
      const seatRef = db.collection('trips').doc(tripId).collection('seats').doc(seatNum);
      const seatDoc = await seatRef.get();

      if (!seatDoc.exists) {
        throw new Error(`Seat ${seatNum} does not exist`);
      }

      const seatData = seatDoc.data();
      if (seatData?.status !== 'available') {
        throw new Error(`Seat ${seatNum} is not available (${seatData?.status})`);
      }
    }

    // Hold all seats
    for (const seatNum of seatNumbers) {
      const seatRef = db.collection('trips').doc(tripId).collection('seats').doc(seatNum);

      batch.update(seatRef, {
        status: 'reserved',
        reservedBy: userId,
        reservedUntil: firestore.Timestamp.fromDate(reservedUntil),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
    console.log(`✅ Successfully held ${seatNumbers.length} seats until ${reservedUntil.toLocaleString()}`);

    return {
      success: true,
      reservedUntil,
      seatNumbers
    };

  } catch (error) {
    console.error('❌ Error holding seats:', error);
    throw error;
  }
};

/**
 * Release held seats (when user cancels or payment fails)
 * @param {string} tripId - ID of the trip
 * @param {Array<string>} seatNumbers - Array of seat numbers to release
 * @returns {Promise<boolean>} Success status
 */
export const releaseSeats = async (tripId, seatNumbers) => {
  const db = firestore();
  const batch = db.batch();

  try {
    for (const seatNum of seatNumbers) {
      const seatRef = db.collection('trips').doc(tripId).collection('seats').doc(seatNum);

      batch.update(seatRef, {
        status: 'available',
        reservedBy: null,
        reservedUntil: null,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
    console.log(`✅ Released ${seatNumbers.length} seats`);
    return true;

  } catch (error) {
    console.error('Error releasing seats:', error);
    return false;
  }
};

/**
 * Book seats permanently (after payment)
 * @param {string} tripId - ID of the trip
 * @param {Array<string>} seatNumbers - Array of seat numbers to book
 * @param {string} bookingId - ID of the booking
 * @returns {Promise<boolean>} Success status
 */
export const bookSeats = async (tripId, seatNumbers, bookingId) => {
  const db = firestore();
  const batch = db.batch();

  try {
    for (const seatNum of seatNumbers) {
      const seatRef = db.collection('trips').doc(tripId).collection('seats').doc(seatNum);

      batch.update(seatRef, {
        isBooked: true,
        status: 'booked',
        bookingId,
        reservedBy: null,
        reservedUntil: null,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
    }

    // Update trip's available seats count
    const tripRef = db.collection('trips').doc(tripId);
    batch.update(tripRef, {
      availableSeats: firestore.FieldValue.increment(-seatNumbers.length),
      updatedAt: firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    console.log(`✅ Booked ${seatNumbers.length} seats for booking ${bookingId}`);
    return true;

  } catch (error) {
    console.error('Error booking seats:', error);
    return false;
  }
};
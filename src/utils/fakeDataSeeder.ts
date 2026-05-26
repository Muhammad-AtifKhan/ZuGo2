import firestore from '@react-native-firebase/firestore';
import { TRIP_STATUS, BUS_STATUS } from '../constants/status';

export const generateMassiveFakeData = async (transporterId: string) => {
  try {
    const batch = firestore().batch();

    // Random string generator
    const generateId = () => Math.random().toString(36).substring(2, 10);
    
    // Create random timestamps within the last 6 months
    const getRandomTimestamp = (daysAgoMax: number) => {
      const msAgo = Math.floor(Math.random() * daysAgoMax * 24 * 60 * 60 * 1000);
      return new Date(Date.now() - msAgo);
    };

    console.log("Starting fake data generation for...", transporterId);

    // 1. Generate 2 Fake Drivers & Buses if none exist, or just fetch existing.
    // To be safe we will just inject data straight to Trips, using fake generic IDs, 
    // but the visualization mainly groups by Transporter. However, some panels 
    // group by Driver / Bus. Let's create dummy drivers and buses in batch.

    const busKeys = [generateId(), generateId()];
    const driverKeys = [generateId(), generateId()];

    busKeys.forEach((busId, index) => {
      const busRef = firestore().collection('buses').doc(busId);
      batch.set(busRef, {
        transporterId,
        busId: busId,
        busNumber: `ABC-${1000 + index}`,
        busModel: index === 0 ? 'Yutong Master' : 'Daewoo BH116',
        capacity: 45,
        status: BUS_STATUS.AVAILABLE,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    });

    driverKeys.forEach((driverId, idx) => {
      const drvRef = firestore().collection('drivers').doc(driverId);
      batch.set(drvRef, {
        transporterId,
        driverId: driverId,
        fullName: idx === 0 ? 'Khwaja Asif' : 'Nawaz Sharif',
        rating: 4.5,
        totalRides: 0, 
        status: 'available',
        contactNumber: `0300123456${idx}`,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    });

    // 2. Generate 50 Historic Trips
    const tripRefs: string[] = [];
    let cumulativeEarnings = 0;

    for (let i = 0; i < 50; i++) {
        const tripId = generateId();
        tripRefs.push(tripId);
        
        const isCompleted = Math.random() > 0.1; // 90% completed, 10% cancelled
        const dateObj = getRandomTimestamp(180);
        const dateStr = dateObj.toISOString().split('T')[0];
        const departureHrs = Math.floor(Math.random() * 24).toString().padStart(2, '0');
        
        const fare = 1500 + Math.floor(Math.random() * 2000);
        const booked = Math.floor(Math.random() * 40) + 5; // 5 to 45 seats booked
        const tripRev = booked * fare;

        if (isCompleted) {
           cumulativeEarnings += tripRev;
        }

        const tRef = firestore().collection('trips').doc(tripId);
        batch.set(tRef, {
            transporterId,
            driverId: driverKeys[i % 2],
            busId: busKeys[i % 2],
            busNumber: `ABC-${1000 + (i%2)}`,
            status: isCompleted ? TRIP_STATUS.COMPLETED : TRIP_STATUS.CANCELLED,
            fare,
            bookedSeats: booked,
            totalSeats: 45,
            revenue: isCompleted ? tripRev : 0,
            routeName: i % 2 === 0 ? 'Lahore to Islamabad' : 'Karachi to Hyderabad',
            from: i % 2 === 0 ? 'Lahore' : 'Karachi',
            to: i % 2 === 0 ? 'Islamabad' : 'Hyderabad',
            date: dateStr,
            startDate: firestore.Timestamp.fromDate(dateObj),
            departureTime: `${departureHrs}:00`,
            arrivalTime: `${(parseInt(departureHrs) + 4) % 24}:00`,
            createdAt: firestore.Timestamp.fromDate(dateObj),
        });

        // 3. Generate 3 Fake Rating per Completed Trip
        if (isCompleted) {
            for (let r = 0; r < 3; r++) {
               const rateRef = firestore().collection('ratings').doc();
               const ratingScore = Math.floor(Math.random() * 3) + 3; // 3, 4, 5
               batch.set(rateRef, {
                   transporterId,
                   driverId: driverKeys[i % 2],
                   tripId: tripId,
                   rating: ratingScore,
                   review: "Nice trip!",
                   passengerId: "fake_passenger_id",
                   createdAt: firestore.Timestamp.fromDate(new Date(dateObj.getTime() + 86400000))
               });
            }
        }
    }
    
    // Add fake notifications
    for (let j = 0; j < 10; j++) {
      const notifRef = firestore().collection('transporter_notifications').doc();
      batch.set(notifRef, {
        transporterId,
        title: j % 2 === 0 ? "Maintenance Required" : "System Notice",
        message: "Generated historic notification block",
        read: false,
        type: j % 2 === 0 ? "warning" : "info",
        createdAt: firestore.Timestamp.fromDate(getRandomTimestamp(30))
      });
    }

    console.log("Committing Batch...");
    await batch.commit();

    // Manually increment Transporter Wallet Balance globally so the UI matches
    await firestore().collection('transporters').doc(transporterId).update({
      walletBalance: firestore.FieldValue.increment(cumulativeEarnings),
      totalTrips: firestore.FieldValue.increment(50)
    });

    return true;
  } catch (error) {
    console.error("Seeder Error:", error);
    return false;
  }
};

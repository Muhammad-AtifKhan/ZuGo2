const admin = require('firebase-admin');
const serviceAccount = require('../scripts/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function releaseExpiredSeats(tripId) {
  console.log(`\n🔄 Releasing expired seats for trip: ${tripId}\n`);

  const seatsRef = db.collection('trips').doc(tripId).collection('seats');
  const snapshot = await seatsRef.get();

  const now = new Date();
  const batch = db.batch();
  let releasedCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.status === 'reserved') {
      const reservedUntil = data.reservedUntil?.toDate?.() || data.reservedUntil;
      const isExpired = reservedUntil && reservedUntil < now;

      if (isExpired) {
        console.log(`✅ Releasing seat ${doc.id} (expired at ${reservedUntil})`);
        batch.update(doc.ref, {
          status: 'available',
          reservedBy: null,
          reservedUntil: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        releasedCount++;
      }
    }
  });

  if (releasedCount > 0) {
    await batch.commit();

    // Trip ka availableSeats count update karo
    await db.collection('trips').doc(tripId).update({
      availableSeats: admin.firestore.FieldValue.increment(releasedCount),
      heldSeats: admin.firestore.FieldValue.increment(-releasedCount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`\n✅ Released ${releasedCount} expired seats successfully!`);
  } else {
    console.log('No expired seats found.');
  }
}

releaseExpiredSeats('iNkv6sc5xijM6qjvTFv6')
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
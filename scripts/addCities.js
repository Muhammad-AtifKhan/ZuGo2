// scripts/addCities.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Firebase se download karo

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const PAKISTAN_CITIES = [
  // Punjab
  { name: 'Lahore', code: 'LHE', province: 'Punjab', popular: true, lat: 31.5204, lng: 74.3587 },
  { name: 'Faisalabad', code: 'FSD', province: 'Punjab', popular: true, lat: 31.4504, lng: 73.1350 },
  { name: 'Rawalpindi', code: 'RWP', province: 'Punjab', popular: true, lat: 33.5651, lng: 73.0169 },
  { name: 'Multan', code: 'MUX', province: 'Punjab', popular: true, lat: 30.1575, lng: 71.5249 },
  { name: 'Gujranwala', code: 'GRW', province: 'Punjab', popular: false, lat: 32.1877, lng: 74.1945 },
  { name: 'Sialkot', code: 'SKT', province: 'Punjab', popular: false, lat: 32.4945, lng: 74.5229 },
  { name: 'Bahawalpur', code: 'BHV', province: 'Punjab', popular: false, lat: 29.3544, lng: 71.6911 },
  { name: 'Sargodha', code: 'SGD', province: 'Punjab', popular: false, lat: 32.0836, lng: 72.6711 },
  { name: 'Sheikhupura', code: 'SKP', province: 'Punjab', popular: false, lat: 31.7167, lng: 74.0000 },
  { name: 'Rahim Yar Khan', code: 'RYK', province: 'Punjab', popular: false, lat: 28.4212, lng: 70.2952 },
  { name: 'Jhang', code: 'JHG', province: 'Punjab', popular: false, lat: 31.2688, lng: 72.3168 },
  { name: 'Dera Ghazi Khan', code: 'DGK', province: 'Punjab', popular: false, lat: 30.0489, lng: 70.6455 },
  { name: 'Gujrat', code: 'GRT', province: 'Punjab', popular: false, lat: 32.5745, lng: 74.0758 },
  { name: 'Sahiwal', code: 'SWL', province: 'Punjab', popular: false, lat: 30.6789, lng: 73.1087 },
  { name: 'Okara', code: 'OKR', province: 'Punjab', popular: false, lat: 30.8091, lng: 73.4599 },
  { name: 'Kasur', code: 'KSR', province: 'Punjab', popular: false, lat: 31.1167, lng: 74.4500 },
  { name: 'Mandi Bahauddin', code: 'MBD', province: 'Punjab', popular: false, lat: 32.5870, lng: 73.4800 },
  { name: 'Chiniot', code: 'CFT', province: 'Punjab', popular: false, lat: 31.7229, lng: 72.9875 },

  // Sindh
  { name: 'Karachi', code: 'KHI', province: 'Sindh', popular: true, lat: 24.8607, lng: 67.0011 },
  { name: 'Hyderabad', code: 'HDD', province: 'Sindh', popular: true, lat: 25.3960, lng: 68.3578 },
  { name: 'Sukkur', code: 'SKZ', province: 'Sindh', popular: false, lat: 27.7052, lng: 68.8574 },
  { name: 'Larkana', code: 'LRK', province: 'Sindh', popular: false, lat: 27.5600, lng: 68.2264 },
  { name: 'Nawabshah', code: 'NWS', province: 'Sindh', popular: false, lat: 26.2442, lng: 68.4100 },
  { name: 'Mirpur Khas', code: 'MPK', province: 'Sindh', popular: false, lat: 25.5269, lng: 69.0111 },
  { name: 'Jacobabad', code: 'JCB', province: 'Sindh', popular: false, lat: 28.2811, lng: 68.4378 },
  { name: 'Shikarpur', code: 'SHP', province: 'Sindh', popular: false, lat: 27.9564, lng: 68.6389 },
  { name: 'Dadu', code: 'DAD', province: 'Sindh', popular: false, lat: 26.7333, lng: 67.7833 },
  { name: 'Tando Allahyar', code: 'TYA', province: 'Sindh', popular: false, lat: 25.4667, lng: 68.7167 },
  { name: 'Ghotki', code: 'GHK', province: 'Sindh', popular: false, lat: 28.0061, lng: 69.3150 },
  { name: 'Kashmore', code: 'KSM', province: 'Sindh', popular: false, lat: 28.4333, lng: 69.5833 },

  // Khyber Pakhtunkhwa
  { name: 'Peshawar', code: 'PEW', province: 'KPK', popular: true, lat: 34.0151, lng: 71.5249 },
  { name: 'Mardan', code: 'MRD', province: 'KPK', popular: false, lat: 34.1959, lng: 72.0445 },
  { name: 'Abbottabad', code: 'ABT', province: 'KPK', popular: false, lat: 34.1688, lng: 73.2215 },
  { name: 'Mingora', code: 'MNG', province: 'KPK', popular: false, lat: 34.7791, lng: 72.3626 },
  { name: 'Kohat', code: 'KHT', province: 'KPK', popular: false, lat: 33.5811, lng: 71.4491 },
  { name: 'Bannu', code: 'BNU', province: 'KPK', popular: false, lat: 32.9859, lng: 70.6046 },
  { name: 'Dera Ismail Khan', code: 'DIK', province: 'KPK', popular: false, lat: 31.8329, lng: 70.9024 },
  { name: 'Charsadda', code: 'CHS', province: 'KPK', popular: false, lat: 34.1448, lng: 71.7406 },
  { name: 'Nowshera', code: 'NWS', province: 'KPK', popular: false, lat: 33.9942, lng: 72.0000 },
  { name: 'Swabi', code: 'SWB', province: 'KPK', popular: false, lat: 34.1167, lng: 72.4667 },
  { name: 'Haripur', code: 'HRP', province: 'KPK', popular: false, lat: 33.9942, lng: 72.9342 },
  { name: 'Mansehra', code: 'MNS', province: 'KPK', popular: false, lat: 34.3333, lng: 73.2000 },
  { name: 'Batkhela', code: 'BTK', province: 'KPK', popular: false, lat: 34.6178, lng: 71.9725 },

  // Balochistan
  { name: 'Quetta', code: 'UET', province: 'Balochistan', popular: true, lat: 30.1798, lng: 66.9750 },
  { name: 'Turbat', code: 'TBT', province: 'Balochistan', popular: false, lat: 26.0019, lng: 63.0489 },
  { name: 'Gwadar', code: 'GWD', province: 'Balochistan', popular: false, lat: 25.1330, lng: 62.3297 },
  { name: 'Khuzdar', code: 'KHZ', province: 'Balochistan', popular: false, lat: 27.8000, lng: 66.6167 },
  { name: 'Chaman', code: 'CMN', province: 'Balochistan', popular: false, lat: 30.9200, lng: 66.4597 },
  { name: 'Sibi', code: 'SBI', province: 'Balochistan', popular: false, lat: 29.5500, lng: 67.8833 },
  { name: 'Zhob', code: 'ZHO', province: 'Balochistan', popular: false, lat: 31.3411, lng: 69.4486 },
  { name: 'Hub', code: 'HUB', province: 'Balochistan', popular: false, lat: 25.0250, lng: 66.8861 },
  { name: 'Pasni', code: 'PSI', province: 'Balochistan', popular: false, lat: 25.2639, lng: 63.4650 },
  { name: 'Usta Muhammad', code: 'USM', province: 'Balochistan', popular: false, lat: 28.1778, lng: 68.0439 },

  // Islamabad
  { name: 'Islamabad', code: 'ISB', province: 'Islamabad', popular: true, lat: 33.6844, lng: 73.0479 },

  // Gilgit-Baltistan
  { name: 'Gilgit', code: 'GIL', province: 'Gilgit-Baltistan', popular: false, lat: 35.9208, lng: 74.3140 },
  { name: 'Skardu', code: 'SKD', province: 'Gilgit-Baltistan', popular: false, lat: 35.2971, lng: 75.6333 },
  { name: 'Hunza', code: 'HNZ', province: 'Gilgit-Baltistan', popular: false, lat: 36.3167, lng: 74.6500 },
  { name: 'Chilas', code: 'CHL', province: 'Gilgit-Baltistan', popular: false, lat: 35.4167, lng: 74.1000 },

  // Azad Kashmir
  { name: 'Muzaffarabad', code: 'MZF', province: 'Azad Kashmir', popular: false, lat: 34.3690, lng: 73.4710 },
  { name: 'Mirpur', code: 'MRP', province: 'Azad Kashmir', popular: false, lat: 33.1461, lng: 73.7699 },
  { name: 'Rawalakot', code: 'RWK', province: 'Azad Kashmir', popular: false, lat: 33.8578, lng: 73.7608 },
  { name: 'Kotli', code: 'KTL', province: 'Azad Kashmir', popular: false, lat: 33.5167, lng: 73.9000 },
  { name: 'Bhimber', code: 'BHR', province: 'Azad Kashmir', popular: false, lat: 32.9833, lng: 74.0667 },
];

async function addCities() {
  console.log(`🚀 Adding ${PAKISTAN_CITIES.length} cities to Firebase...`);

  const batch = db.batch();
  let count = 0;

  for (const city of PAKISTAN_CITIES) {
    try {
      // Create a document with custom ID (city code)
      const cityRef = db.collection('cities').doc(city.code.toLowerCase());

      batch.set(cityRef, {
        name: city.name,
        code: city.code,
        province: city.province,
        popular: city.popular,
        lat: city.lat || null,
        lng: city.lng || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      count++;
      console.log(`✅ Added to batch: ${city.name} (${city.code})`);
    } catch (error) {
      console.error(`❌ Error adding ${city.name}:`, error);
    }
  }

  try {
    await batch.commit();
    console.log(`\n🎉 Successfully added ${count} cities to Firebase!`);
  } catch (error) {
    console.error('❌ Error committing batch:', error);
  }
}

addCities().catch(console.error);
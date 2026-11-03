'use strict';

/**
 * scripts/seed-city-db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds the upgraded SRDV hotel city codes into the MongoDB `hotelcities` collection.
 * Reads from `cities.json` (100,456+ global cities).
 *
 * Usage:
 *   npm run seed:cities
 *   or: node scripts/seed-city-db.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const HotelCity = require('../modules/hotels/hotelCity.model');

const CITIES_FILE_PATH = path.join(__dirname, '..', 'cities.json');
const BATCH_SIZE = 5000;

async function seed() {
  console.log('====================================================');
  console.log('🚀 SEEDING UPGRADED SRDV HOTEL CITIES INTO MONGODB');
  console.log('====================================================\n');

  if (!fs.existsSync(CITIES_FILE_PATH)) {
    console.error(`❌ cities.json not found at: ${CITIES_FILE_PATH}`);
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : undefined;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is not defined in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 10000 });
  console.log('✔ Connected to MongoDB successfully.\n');

  try {
    console.log(`Reading ${CITIES_FILE_PATH}...`);
    const startTime = Date.now();
    const rawData = fs.readFileSync(CITIES_FILE_PATH, 'utf8');
    const cities = JSON.parse(rawData);
    console.log(`✔ Read and parsed ${cities.length.toLocaleString()} cities in ${Date.now() - startTime}ms.\n`);

    console.log('Clearing existing documents in hotelcities collection...');
    const deleteResult = await HotelCity.deleteMany({});
    console.log(`✔ Removed ${deleteResult.deletedCount.toLocaleString()} old city records.\n`);

    console.log(`Inserting ${cities.length.toLocaleString()} new city records in batches of ${BATCH_SIZE}...`);

    let totalInserted = 0;
    const insertStartTime = Date.now();

    for (let i = 0; i < cities.length; i += BATCH_SIZE) {
      const batch = cities.slice(i, i + BATCH_SIZE).map((item) => {
        const parts = (item.FullName || '').split(',').map((s) => s.trim()).filter(Boolean);
        const country = parts.length > 1 ? parts[parts.length - 1] : (item.FullName || '');

        return {
          cityId: String(item.CityId),
          cityName: item.CityName || '',
          countryCode: (item.CountryCode || '').toUpperCase().trim(),
          country: country,
          stateName: item.StateName || '',
          districtName: item.DistrictName || '',
          fullName: item.FullName || '',
          type: item.Type || 'CITY',
          hotelCount: Number(item.HotelCount) || 0,
          source: 'international',
        };
      });

      await HotelCity.insertMany(batch, { ordered: false });
      totalInserted += batch.length;
      const progressPercent = Math.min(100, Math.round((totalInserted / cities.length) * 100));
      process.stdout.write(`\rProgress: ${totalInserted.toLocaleString()} / ${cities.length.toLocaleString()} cities (${progressPercent}%)`);
    }

    const durationSec = ((Date.now() - insertStartTime) / 1000).toFixed(2);
    console.log(`\n\n✔ Successfully inserted ${totalInserted.toLocaleString()} cities into MongoDB in ${durationSec}s!`);

    console.log('\nVerifying indexes on hotelcities collection...');
    await HotelCity.syncIndexes();
    console.log('✔ Indexes synced successfully.');

    const finalCount = await HotelCity.countDocuments();
    console.log(`\nFinal verified count in database: ${finalCount.toLocaleString()} cities.`);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✔ Disconnected from MongoDB. Seeding complete.\n');
  }
}

seed();

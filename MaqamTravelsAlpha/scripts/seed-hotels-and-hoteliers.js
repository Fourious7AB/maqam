'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../modules/auth/auth.model');
const Hotel = require('../modules/hotels/hotelEntity.model');
const HotelStock = require('../modules/packages/stock/hotelStock.model');

async function seed() {
  console.log('=== SEEDING HOTELS, ROOMS & HOTELIERS FOR FRONTEND TESTING ===');
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  try {
    // 1. Ensure Admin exists with Admin1234
    const adminHashedPassword = await bcrypt.hash('Admin1234', 10);
    let admin = await User.findOne({ email: 'admin1@gmail.com' });
    if (!admin) {
      admin = await User.create({
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin1@gmail.com',
        phone: '+919999900001',
        password: adminHashedPassword,
        role: 'admin',
      });
      console.log('✔ Created Admin user: admin1@gmail.com');
    } else {
      admin.password = adminHashedPassword;
      admin.role = 'admin';
      await admin.save();
      console.log('✔ Updated Admin user password to Admin1234');
    }

    // 2. Hotel 1: Atlantis The Royal
    let hotel1 = await Hotel.findOne({ name: 'Atlantis The Royal' });
    if (!hotel1) {
      hotel1 = await Hotel.create({
        name: 'Atlantis The Royal',
        destination: 'Dubai',
        address: 'Palm Jumeirah, Crescent Rd, Dubai, UAE',
        contactPerson: 'Sarah Jenkins',
        contactPhone: '+97144260000',
        contactEmail: 'partners@atlantistheroyal.com',
        amenities: ['Private Beach', 'Infinity Pool', 'Luxury Spa', 'Fine Dining', 'Free WiFi'],
        tieUpStartDate: new Date('2026-01-01'),
        contractNotes: 'Direct wholesale tie-up margin 22%',
        isActive: true,
        createdBy: admin._id,
      });
      console.log('✔ Created Hotel 1:', hotel1._id, hotel1.name);
    } else {
      hotel1.isActive = true;
      await hotel1.save();
      console.log('✔ Hotel 1 ready:', hotel1._id, hotel1.name);
    }

    // 3. Hotelier 1: hotelier1@gmail.com / Hotelier1234!
    const hotelier1Hash = await bcrypt.hash('Hotelier1234!', 10);
    let hotelier1 = await User.findOne({ email: 'hotelier1@gmail.com' });
    if (!hotelier1) {
      hotelier1 = await User.create({
        firstName: 'Sarah',
        lastName: 'Jenkins',
        email: 'hotelier1@gmail.com',
        phone: '+971501112233',
        password: hotelier1Hash,
        role: 'hotelier',
        hotelId: hotel1._id,
      });
      console.log('✔ Created Hotelier 1:', hotelier1.email, 'linked to', hotel1.name);
    } else {
      hotelier1.password = hotelier1Hash;
      hotelier1.hotelId = hotel1._id;
      hotelier1.role = 'hotelier';
      await hotelier1.save();
      console.log('✔ Updated Hotelier 1:', hotelier1.email);
    }

    // 4. HotelStock for Hotel 1 (Admin-Approved Active Stock)
    let stock1 = await HotelStock.findOne({ hotelId: hotel1._id, roomType: 'Royal Sky Suite' });
    if (!stock1) {
      const units1 = Array.from({ length: 10 }, (_, i) => ({
        status: i === 0 ? 'blocked' : 'available', // 1 blocked for maintenance demo
      }));
      stock1 = await HotelStock.create({
        hotelId: hotel1._id,
        hotelName: hotel1.name,
        destination: hotel1.destination,
        roomType: 'Royal Sky Suite',
        checkIn: new Date('2026-11-10T00:00:00.000Z'),
        checkOut: new Date('2026-11-15T00:00:00.000Z'),
        pricePerNight: 5500,
        meals: ['breakfast', 'dinner'],
        reservationRef: 'ATL-ROYAL-BLK-01',
        nameAdditionDeadline: new Date('2026-11-05T00:00:00.000Z'),
        reviewStatus: 'approved',
        reviewedBy: admin._id,
        reviewNotes: 'Admin approved wholesale batch.',
        units: units1,
        createdBy: admin._id,
      });
      console.log('✔ Created Approved Stock 1:', stock1._id, stock1.roomType, 'Available:', stock1.availableUnits, '/', stock1.totalUnits);
    } else {
      console.log('✔ Stock 1 exists:', stock1._id, 'Review status:', stock1.reviewStatus);
    }

    // 5. Hotel 2: Grand Hyatt Dubai
    let hotel2 = await Hotel.findOne({ name: 'Grand Hyatt Dubai' });
    if (!hotel2) {
      hotel2 = await Hotel.create({
        name: 'Grand Hyatt Dubai',
        destination: 'Dubai',
        address: 'Riyadh Street, Sheikh Rashid Rd, Dubai, UAE',
        contactPerson: 'John Doe',
        contactPhone: '+97143171234',
        contactEmail: 'partners@grandhyattdubai.com',
        amenities: ['Resort Pool', 'Tennis Courts', 'Spa', 'Executive Lounge'],
        tieUpStartDate: new Date('2026-02-01'),
        contractNotes: 'Corporate wholesale rate tier',
        isActive: true,
        createdBy: admin._id,
      });
      console.log('✔ Created Hotel 2:', hotel2._id, hotel2.name);
    } else {
      hotel2.isActive = true;
      await hotel2.save();
      console.log('✔ Hotel 2 ready:', hotel2._id, hotel2.name);
    }

    // 6. Hotelier 2: hotelier2@gmail.com / Hotelier1234!
    const hotelier2Hash = await bcrypt.hash('Hotelier1234!', 10);
    let hotelier2 = await User.findOne({ email: 'hotelier2@gmail.com' });
    if (!hotelier2) {
      hotelier2 = await User.create({
        firstName: 'Tariq',
        lastName: 'Mansoor',
        email: 'hotelier2@gmail.com',
        phone: '+971502223344',
        password: hotelier2Hash,
        role: 'hotelier',
        hotelId: hotel2._id,
      });
      console.log('✔ Created Hotelier 2:', hotelier2.email, 'linked to', hotel2.name);
    } else {
      hotelier2.password = hotelier2Hash;
      hotelier2.hotelId = hotel2._id;
      hotelier2.role = 'hotelier';
      await hotelier2.save();
      console.log('✔ Updated Hotelier 2:', hotelier2.email);
    }

    // 7. HotelStock for Hotel 2 (Pending Review Queue Batch)
    let stock2 = await HotelStock.findOne({ hotelId: hotel2._id, roomType: 'Creek View Deluxe Room' });
    if (!stock2) {
      const units2 = Array.from({ length: 6 }, () => ({ status: 'available' }));
      stock2 = await HotelStock.create({
        hotelId: hotel2._id,
        hotelName: hotel2.name,
        destination: hotel2.destination,
        roomType: 'Creek View Deluxe Room',
        checkIn: new Date('2026-12-01T00:00:00.000Z'),
        checkOut: new Date('2026-12-06T00:00:00.000Z'),
        pricePerNight: 3200,
        meals: ['breakfast'],
        reservationRef: 'HYATT-DEC-CRK',
        nameAdditionDeadline: new Date('2026-11-25T00:00:00.000Z'),
        reviewStatus: 'pending_review',
        units: units2,
        createdBy: hotelier2._id,
      });
      console.log('✔ Created Pending Review Stock 2:', stock2._id, stock2.roomType, 'Status:', stock2.reviewStatus);
    } else {
      console.log('✔ Stock 2 exists:', stock2._id, 'Status:', stock2.reviewStatus);
    }

    // 8. Fix existing 'hotalier@gmail.com' in case anyone used it
    const hotalierTypo = await User.findOne({ email: 'hotalier@gmail.com' });
    if (hotalierTypo) {
      hotalierTypo.hotelId = hotel1._id;
      await hotalierTypo.save();
      console.log('✔ Attached hotelId to hotalier@gmail.com typo account');
    }

    console.log('\n================ SUMMARY OF SEEDED TEST DATA ================');
    console.log('ADMIN USER:');
    console.log('  Email: admin1@gmail.com');
    console.log('  Password: Admin1234');
    console.log('\nHOTEL 1 (ATLANTIS THE ROYAL):');
    console.log(`  Hotel ID: ${hotel1._id}`);
    console.log('  Hotelier Email: hotelier1@gmail.com');
    console.log('  Hotelier Password: Hotelier1234!');
    console.log(`  Active Stock ID: ${stock1._id} (Approved, 10 units, 1 blocked)`);
    console.log('\nHOTEL 2 (GRAND HYATT DUBAI):');
    console.log(`  Hotel ID: ${hotel2._id}`);
    console.log('  Hotelier Email: hotelier2@gmail.com');
    console.log('  Hotelier Password: Hotelier1234!');
    console.log(`  Pending Review Stock ID: ${stock2._id} (Status: pending_review, 6 units)`);
    console.log('=============================================================\n');

  } finally {
    await mongoose.connection.close();
  }
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});

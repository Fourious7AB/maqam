const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../modules/auth/auth.model');
const Traveller = require('../modules/account/traveller.model');
const Hotel = require('../modules/hotels/hotelEntity.model');
const HotelStock = require('../modules/packages/stock/hotelStock.model');
const TicketStock = require('../modules/packages/stock/ticketStock.model');
const Package = require('../modules/packages/models/package.model');
const Offer = require('../modules/packages/offers/offer.model');

async function seedData() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_agency_test';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.\n');

  try {
    // 1. Create or Find Admin User
    let admin = await User.findOne({ email: 'admin@travelagency.com' });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('AdminPass123!', 10);
      admin = await User.create({
        email: 'admin@travelagency.com',
        phone: '9876543211',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: 'super_admin',
        isVerified: true,
      });
      console.log('✔ Created Admin user: admin@travelagency.com (Password: AdminPass123!)');
    } else {
      console.log('✔ Found existing Admin user:', admin.email);
    }

    // 2. Create or Find Customer User
    let customer = await User.findOne({ email: 'testcustomer@example.com' });
    if (!customer) {
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      customer = await User.create({
        email: 'testcustomer@example.com',
        phone: '9123456789',
        password: hashedPassword,
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'customer',
        isVerified: true,
      });
      console.log('✔ Created Customer user: testcustomer@example.com (Password: TestPass123!)');
    } else {
      console.log('✔ Found existing Customer user:', customer.email);
    }

    // 3. Create or Find Traveller Profile for Customer
    let traveller = await Traveller.findOne({ userId: customer._id });
    if (!traveller) {
      traveller = await Traveller.create({
        userId: customer._id,
        passengerType: 'Adult',
        title: 'Ms',
        firstName: 'Alice',
        lastName: 'Smith',
        gender: 'Female',
        dateOfBirth: new Date('1995-06-15'),
        email: customer.email,
        phone: customer.phone,
        nationality: 'Indian',
      });
      console.log('✔ Created Traveller Profile for Customer:', traveller._id);
    } else {
      console.log('✔ Found existing Traveller Profile:', traveller._id);
    }

    // 4. Create Hotel Entity
    let hotel = await Hotel.findOne({ name: 'Taj Exotica Resort & Spa' });
    if (!hotel) {
      hotel = await Hotel.create({
        name: 'Taj Exotica Resort & Spa',
        destination: 'Goa',
        address: 'Benaulim Beach, South Goa',
        description: 'Luxury 5-star beachfront resort in South Goa',
        starRating: 5,
        isActive: true,
        createdBy: admin._id,
      });
      console.log('✔ Created Hotel:', hotel.name, hotel._id);
    } else {
      console.log('✔ Found existing Hotel:', hotel.name);
    }

    // 5. Create HotelStock Batch
    let hotelStock = await HotelStock.findOne({ hotelId: hotel._id, reviewStatus: 'approved' });
    if (!hotelStock) {
      const units = Array.from({ length: 10 }, () => ({ status: 'available' }));
      hotelStock = await HotelStock.create({
        hotelId: hotel._id,
        hotelName: hotel.name,
        destination: 'Goa',
        roomType: 'Sea Facing Villa',
        checkIn: new Date(Date.now() + 86400000 * 10),
        checkOut: new Date(Date.now() + 86400000 * 14),
        pricePerNight: 5000,
        meals: ['breakfast', 'dinner'],
        reservationRef: `RES-GOA-${Date.now()}`,
        nameAdditionDeadline: new Date(Date.now() + 86400000 * 8),
        reviewStatus: 'approved',
        units,
        createdBy: admin._id,
      });
      console.log('✔ Created HotelStock (10 units):', hotelStock._id);
    } else {
      console.log('✔ Found existing HotelStock:', hotelStock._id);
    }

    // 6. Create TicketStock Batch
    let ticketStock = await TicketStock.findOne({ origin: 'DEL', destination: 'GOI' });
    if (!ticketStock) {
      const units = Array.from({ length: 10 }, () => ({ status: 'available' }));
      ticketStock = await TicketStock.create({
        airline: 'Air India',
        flightNumber: 'AI-884',
        origin: 'DEL',
        destination: 'GOI',
        departureDate: new Date(Date.now() + 86400000 * 10),
        arrivalDate: new Date(Date.now() + 86400000 * 10 + 3600000 * 2.5),
        cabinClass: 'Economy',
        pnr: 'AI-GRP-9081',
        nameAdditionDeadline: new Date(Date.now() + 86400000 * 8),
        costPerUnit: 4200,
        units,
        createdBy: admin._id,
      });
      console.log('✔ Created TicketStock (10 units):', ticketStock._id);
    } else {
      console.log('✔ Found existing TicketStock:', ticketStock._id);
    }

    // 7. Create Package
    let pkg = await Package.findOne({ title: 'Goa Luxury Beach 5D4N Vacation' });
    if (!pkg) {
      pkg = await Package.create({
        title: 'Goa Luxury Beach 5D4N Vacation',
        destination: 'Goa',
        description: 'Complete 5 Days 4 Nights luxury stay at Taj Exotica with round-trip flights.',
        sellPrice: 24999,
        costPrice: 18000,
        inclusions: ['Round-trip Air India flight', '5-Star Hotel Stay at Taj Exotica', 'Daily Breakfast & Dinner', 'Airport Transfers'],
        exclusions: ['Personal Expenses', 'Water sports fees'],
        itinerary: [
          { day: 1, title: 'Arrival & Welcome Dinner', activities: ['Airport pickup', 'Check-in at Taj Exotica', 'Beachside dinner'] },
          { day: 2, title: 'South Goa Heritage Tour', activities: ['Old Goa Churches', 'Spice plantation lunch', 'Mangueshi Temple'] },
          { day: 3, title: 'Leisure Day & Sunset Cruise', activities: ['Private pool time', 'Mandovi River sunset cruise'] },
          { day: 4, title: 'Beach Day', activities: ['Benaulim beach relaxation', 'Seafood dinner'] },
          { day: 5, title: 'Departure', activities: ['Breakfast', 'Check-out & Airport drop'] },
        ],
        validity: {
          startDate: new Date(Date.now() + 86400000 * 10),
          endDate: new Date(Date.now() + 86400000 * 14),
        },
        flightRefs: [{ stock: ticketStock._id, unitsPerBooking: 1 }],
        hotelRefs: [{ stock: hotelStock._id, unitsPerBooking: 1 }],
        isActive: true,
        createdBy: admin._id,
      });
      console.log('✔ Created Package:', pkg.title, '(ID:', pkg._id, ')');
    } else {
      console.log('✔ Found existing Package:', pkg.title, '(ID:', pkg._id, ')');
    }

    // 8. Create Offer
    let offer = await Offer.findOne({ title: 'Flash Deal: 4-Night Luxury Stay at Taj Exotica Goa' });
    if (!offer) {
      offer = await Offer.create({
        title: 'Flash Deal: 4-Night Luxury Stay at Taj Exotica Goa',
        description: 'Save 40% on luxury sea-facing villa in Goa.',
        destination: 'Goa',
        itemType: 'hotel',
        hotelRef: { stock: hotelStock._id, unitsPerBooking: 1 },
        sellPrice: 9999,
        originalPrice: 16000,
        discountPercentage: 38,
        inclusions: ['4 Nights in Sea Facing Villa', 'Complimentary Breakfast', 'Free Spa Voucher'],
        exclusions: ['Flights', 'Lunch/Dinner'],
        startDate: new Date(Date.now() + 86400000 * 10),
        endDate: new Date(Date.now() + 86400000 * 14),
        isActive: true,
        createdBy: admin._id,
      });
      console.log('✔ Created Offer:', offer.title, '(ID:', offer._id, ')');
    } else {
      console.log('✔ Found existing Offer:', offer.title, '(ID:', offer._id, ')');
    }

    console.log('\n===============================================================');
    console.log('🎉 SEEDING COMPLETE! TEST IDS FOR POSTMAN / FRONTEND:');
    console.log('===============================================================');
    console.log(`👤 Customer Email:    testcustomer@example.com`);
    console.log(`🔑 Customer Password: TestPass123!`);
    console.log(`🧳 Traveller ID:      ${traveller._id}`);
    console.log(`📦 Package ID:        ${pkg._id}  (Price: ₹${pkg.sellPrice})`);
    console.log(`🏷️  Offer ID:          ${offer._id}  (Price: ₹${offer.sellPrice})`);
    console.log('===============================================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

seedData().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

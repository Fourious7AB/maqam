'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../modules/auth/auth.model');
const Hotel = require('../modules/hotels/hotelEntity.model');
const HotelStock = require('../modules/packages/stock/hotelStock.model');
const TicketStock = require('../modules/packages/stock/ticketStock.model');
const Offer = require('../modules/packages/offers/offer.model');
const Package = require('../modules/packages/models/package.model');

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.\n');

  try {
    // 0. Ensure Admin user exists
    let admin = await User.findOne({ role: 'super_admin' }) || await User.findOne({ role: 'admin' });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('AdminPass123!', 10);
      admin = await User.create({
        phone: '9999900001',
        email: 'admin@maqamtravels.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: 'super_admin',
        isVerified: true,
        isActive: true,
      });
      console.log('✔ Created Admin user:', admin._id);
    } else {
      console.log('✔ Found Admin user:', admin._id, admin.email);
    }

    // 1. Create Hotel
    const hotelName = 'Makkah Ultra Grand Palace';
    let hotel = await Hotel.findOne({ name: hotelName });
    if (!hotel) {
      hotel = await Hotel.create({
        name: hotelName,
        destination: 'Makkah',
        address: 'King Abdulaziz Endowment, Abraj Al Bait Complex, Makkah 21955, Saudi Arabia',
        starRating: 5,
        amenities: [
          'Direct Kaaba Views',
          'Free High-Speed WiFi',
          'VIP Haram Audio Transmission',
          'Gourmet Halal Dining',
          '24/7 Butler & Room Service',
          'Luxury Spa & Wellness',
          'Direct Private Access to Haram Courtyard'
        ],
        images: [
          'https://res.cloudinary.com/dsszjlw3u/image/upload/v1790681691/travel-agency/offers/pxsgf4ipw9rdkeqxukm8.jpg',
          'https://res.cloudinary.com/dsszjlw3u/image/upload/v1790681706/travel-agency/offers/wozahydkltlmvocle0sf.jpg'
        ],
        contactPerson: 'Sheikh Tariq Mansoor',
        contactPhone: '+966125717777',
        contactEmail: 'hotelier.makkah@maqamtravels.com',
        contractNotes: 'Direct elite partnership with guaranteed allocation',
        tieUpStartDate: new Date('2026-01-01'),
        isActive: true,
        createdBy: admin._id,
      });
      console.log('✔ Created Hotel:', hotel.name, hotel._id);
    } else {
      hotel.isActive = true;
      await hotel.save();
      console.log('✔ Found existing Hotel:', hotel.name, hotel._id);
    }

    // 2. Create User with role 'hotelier' linked to the hotel
    let hotelierUser = await User.findOne({ email: 'hotelier.makkah@maqamtravels.com' });
    const hotelierHash = await bcrypt.hash('HotelierPass123!', 10);
    if (!hotelierUser) {
      hotelierUser = await User.create({
        firstName: 'Sheikh Tariq',
        lastName: 'Mansoor',
        email: 'hotelier.makkah@maqamtravels.com',
        phone: '9876543299',
        password: hotelierHash,
        role: 'hotelier',
        hotelId: hotel._id,
        isActive: true,
        isVerified: true,
        isPhoneVerified: true,
        createdBy: admin._id,
      });
      console.log('✔ Created Hotelier User:', hotelierUser.email, hotelierUser._id, 'linked to hotelId:', hotelierUser.hotelId);
    } else {
      hotelierUser.role = 'hotelier';
      hotelierUser.hotelId = hotel._id;
      hotelierUser.password = hotelierHash;
      hotelierUser.isActive = true;
      await hotelierUser.save();
      console.log('✔ Updated Hotelier User:', hotelierUser.email, hotelierUser._id, 'role:', hotelierUser.role);
    }

    // 3. Add a Room (HotelStock batch) to that hotel
    const roomType = 'Makkah Ultra Kaaba View Deluxe Suite';
    let hotelStock = await HotelStock.findOne({ hotelId: hotel._id, roomType });
    if (!hotelStock) {
      const units = Array.from({ length: 15 }, () => ({ status: 'available' }));
      hotelStock = await HotelStock.create({
        hotelId: hotel._id,
        hotelName: hotel.name,
        destination: 'Makkah',
        roomType,
        checkIn: new Date('2026-11-15T14:00:00.000Z'),
        checkOut: new Date('2026-11-22T12:00:00.000Z'),
        pricePerNight: 8500,
        meals: ['breakfast', 'dinner'],
        reservationRef: 'RES-MAK-ULTRA-001',
        nameAdditionDeadline: new Date('2026-11-10T00:00:00.000Z'),
        reviewStatus: 'approved',
        reviewedBy: admin._id,
        reviewNotes: 'Approved 5-star inventory allocation for Makkha Ultra packages',
        units,
        createdBy: hotelierUser._id,
      });
      console.log('✔ Created and Approved Room Stock:', hotelStock.roomType, hotelStock._id, 'units:', hotelStock.units.length);
    } else {
      hotelStock.reviewStatus = 'approved';
      hotelStock.reviewedBy = admin._id;
      await hotelStock.save();
      console.log('✔ Found existing Room Stock:', hotelStock.roomType, hotelStock._id);
    }

    // 4. Make that Hotel as an Offer
    const hotelOfferTitle = 'Makkah Ultra Luxury Suite Offer';
    let hotelOffer = await Offer.findOne({ title: hotelOfferTitle });
    if (!hotelOffer) {
      hotelOffer = await Offer.create({
        title: hotelOfferTitle,
        description: '7-night stay in Ultra Kaaba View Deluxe Suite at Makkah Ultra Grand Palace with complimentary gourmet dining.',
        destination: 'Makkah',
        images: [
          'https://res.cloudinary.com/dsszjlw3u/image/upload/v1790681691/travel-agency/offers/pxsgf4ipw9rdkeqxukm8.jpg',
          'https://res.cloudinary.com/dsszjlw3u/image/upload/v1790681706/travel-agency/offers/wozahydkltlmvocle0sf.jpg'
        ],
        itemType: 'hotel',
        hotelRef: {
          stock: hotelStock._id,
          unitsPerBooking: 1,
        },
        sellPrice: 59500,
        originalPrice: 65000,
        discountPercentage: 8,
        inclusions: [
          '7 Nights in Ultra Kaaba View Deluxe Suite',
          'Daily Buffet Breakfast & Dinner',
          'Direct Haram Audio & Video Live Feed',
          '24/7 Dedicated Concierge Service'
        ],
        exclusions: ['Personal Expenses', 'Laundry Service'],
        startDate: new Date('2026-11-15T00:00:00.000Z'),
        endDate: new Date('2026-11-22T23:59:59.000Z'),
        isActive: true,
        createdBy: admin._id,
      });
      console.log('✔ Created Hotel Offer:', hotelOffer.title, hotelOffer._id);
    } else {
      hotelOffer.hotelRef = { stock: hotelStock._id, unitsPerBooking: 1 };
      hotelOffer.isActive = true;
      await hotelOffer.save();
      console.log('✔ Updated existing Hotel Offer:', hotelOffer.title, hotelOffer._id);
    }

    // 5. Ensure a Flight Offer exists
    let flightOffer = await Offer.findOne({ itemType: 'flight', isActive: true });
    if (!flightOffer) {
      // Create a TicketStock if needed
      let ticketStock = await TicketStock.findOne();
      if (!ticketStock) {
        const flightUnits = Array.from({ length: 20 }, () => ({ status: 'available' }));
        ticketStock = await TicketStock.create({
          airline: 'Saudia',
          flightNumber: 'SV-758',
          origin: 'DEL',
          destination: 'JED',
          departureDate: new Date('2026-11-15T08:00:00.000Z'),
          arrivalDate: new Date('2026-11-15T12:30:00.000Z'),
          cabinClass: 'Economy',
          pricePerSeat: 29700,
          pnr: 'SV-JED-01',
          units: flightUnits,
          createdBy: admin._id,
        });
      }

      flightOffer = await Offer.create({
        title: 'Saudia SV-758 DEL → JED Direct Flight Offer',
        description: 'Direct flight from Delhi to Jeddah with Saudia Airlines.',
        destination: 'JED',
        images: [
          'https://res.cloudinary.com/dsszjlw3u/image/upload/v1790681691/travel-agency/offers/pxsgf4ipw9rdkeqxukm8.jpg'
        ],
        itemType: 'flight',
        flightRef: {
          stock: ticketStock._id,
          unitsPerBooking: 1,
        },
        sellPrice: 29700,
        originalPrice: 32000,
        discountPercentage: 7,
        inclusions: ['40kg Checked Baggage', 'In-Flight Halal Meals & Beverages'],
        exclusions: ['Seat Selection Fee'],
        startDate: new Date('2026-11-15T00:00:00.000Z'),
        endDate: new Date('2026-11-22T23:59:59.000Z'),
        isActive: true,
        createdBy: admin._id,
      });
      console.log('✔ Created Flight Offer:', flightOffer.title, flightOffer._id);
    } else {
      console.log('✔ Using existing Flight Offer:', flightOffer.title, flightOffer._id);
    }

    // 6. Create Package: "Makkha Ultra X" combining Hotel Offer and Flight Offer
    const packageTitle = 'Makkha Ultra X';
    let pkg = await Package.findOne({ title: packageTitle });
    const offerRefs = [
      {
        offer: hotelOffer._id,
        unitsPerBooking: 1,
        isOptional: false,
        isDefaultSelected: true,
        allowSwap: true,
        notes: 'Luxury Kaaba View Hotel Suite Component'
      },
      {
        offer: flightOffer._id,
        unitsPerBooking: 1,
        isOptional: false,
        isDefaultSelected: true,
        allowSwap: true,
        notes: 'Direct Flight to Jeddah Component'
      }
    ];

    const itinerary = [
      {
        day: 1,
        title: 'Arrival in Jeddah & VIP Transfer to Makkah',
        description: 'Board Saudia flight to Jeddah. Meet and greet with VIP private executive coach transfer directly to Makkah Ultra Grand Palace. Check-in to Ultra Kaaba View Deluxe Suite and perform initial Umrah.',
        assignedOffers: [{ offer: flightOffer._id, role: 'flight_arrival', notes: 'Arrival flight' }]
      },
      {
        day: 2,
        title: 'Ibadah at Masjid al-Haram & Tawaf',
        description: 'Full day dedicated to prayers and Ibadah at the Grand Mosque with 24/7 Haram audio connection in suite.',
        assignedOffers: [{ offer: hotelOffer._id, role: 'hotel_stay', notes: 'Suite stay' }]
      },
      {
        day: 3,
        title: 'Makkah Holy Sites Ziyarah',
        description: 'Guided private tour of Jabal al-Noor (Cave of Hira), Cave of Thawr, Mina, Muzdalifah, and Arafat.',
        assignedOffers: []
      },
      {
        day: 4,
        title: 'Spiritual Reflections & Personal Prayers',
        description: 'Tahajjud and congregational prayers at the Holy Kaaba with executive hotel dining privileges.',
        assignedOffers: [{ offer: hotelOffer._id, role: 'hotel_stay', notes: 'Suite stay' }]
      },
      {
        day: 5,
        title: 'Kiswah Factory & Exhibition of the Two Holy Mosques',
        description: 'Exclusive visit to the historic Kiswah production center and heritage exhibits.',
        assignedOffers: []
      },
      {
        day: 6,
        title: 'Jummah Prayers at the Holy Kaaba',
        description: 'Experience soul-stirring congregational prayers followed by celebratory evening dinner.',
        assignedOffers: [{ offer: hotelOffer._id, role: 'hotel_stay', notes: 'Suite stay' }]
      },
      {
        day: 7,
        title: 'Wada Tawaf & Departure from Jeddah',
        description: 'Perform farewell Tawaf, hotel checkout, and VIP return transfer to King Abdulaziz International Airport for departure.',
        assignedOffers: [{ offer: hotelOffer._id, role: 'hotel_checkout', notes: 'Check-out' }]
      }
    ];

    if (!pkg) {
      pkg = await Package.create({
        title: packageTitle,
        description: 'The Ultimate Ultra-Luxury Umrah Pilgrimage Experience. Features direct Jeddah flights, 7 nights in Kaaba View Deluxe Suite at Makkah Ultra Grand Palace, complete VIP concierge, and curated Ziyarah tours.',
        destination: 'Makkah',
        images: [
          'https://res.cloudinary.com/dsszjlw3u/image/upload/v1790681691/travel-agency/offers/pxsgf4ipw9rdkeqxukm8.jpg',
          'https://res.cloudinary.com/dsszjlw3u/image/upload/v1790681706/travel-agency/offers/wozahydkltlmvocle0sf.jpg'
        ],
        offerRefs,
        bundleDiscountPercentage: 10,
        sellPrice: 80280, // (59500 + 29700) * 0.9 = 80280
        inclusions: [
          'Roundtrip Flights (Delhi/Mumbai ↔ Jeddah)',
          '7 Nights in Ultra Kaaba View Deluxe Suite at Makkah Ultra Grand Palace',
          'Daily Gourmet Buffet Breakfast & Dinner',
          'VIP Airport Meet & Assist with Private Luxury Transfers',
          'Comprehensive Guided Historical Ziyarah Tours in Makkah',
          'Dedicated 24/7 Pilgrimage Support Specialist'
        ],
        itinerary,
        validity: {
          from: new Date('2026-01-01T00:00:00.000Z'),
          to: new Date('2026-12-31T23:59:59.000Z'),
        },
        isActive: true,
        isPublic: true,
        createdBy: admin._id,
      });
      console.log('✔ Created Package: "Makkha Ultra X"', pkg._id, 'SellPrice:', pkg.sellPrice);
    } else {
      pkg.offerRefs = offerRefs;
      pkg.itinerary = itinerary;
      pkg.isActive = true;
      pkg.isPublic = true;
      pkg.sellPrice = 80280;
      await pkg.save();
      console.log('✔ Updated existing Package: "Makkha Ultra X"', pkg._id);
    }

    console.log('\n=== COMPLETE: Hotel -> Hotelier -> Room -> Offer -> Package "Makkha Ultra X" successfully configured! ===\n');
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

main().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});

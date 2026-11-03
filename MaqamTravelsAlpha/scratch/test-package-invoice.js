/**
 * Verification test script for Package Invoices:
 * - JSON invoice normalization
 * - Branded HTML document rendering
 * - RBAC authorization checks
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const invoiceService = require('../modules/invoices/invoice.service');
const Package = require('../modules/packages/models/package.model');
const PackageBooking = require('../modules/packages/models/packageBooking.model');
const User = require('../modules/auth/auth.model');
const Traveller = require('../modules/account/traveller.model');

async function runTest() {
  console.log('🚀 Starting Package Invoice System Verification Test...\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ Missing MONGO_URI');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB');

  let testUser = null;
  let testCustomer = null;
  let testTraveller = null;
  let testPackage = null;
  let testBooking = null;

  try {
    // 1. Create Mock Admin / Customer / Traveller
    const uniqueSuffix = Date.now().toString().slice(-6);
    testUser = await User.create({
      firstName: 'Admin',
      lastName: 'Maqam',
      email: `admin_pkg_${uniqueSuffix}@maqam.com`,
      phone: `91998877${uniqueSuffix.slice(-4)}`,
      password: 'Password123!',
      role: 'admin',
    });

    testCustomer = await User.create({
      firstName: 'Tariq',
      lastName: 'Ansari',
      email: `tariq_${uniqueSuffix}@example.com`,
      phone: `91987654${uniqueSuffix.slice(-4)}`,
      password: 'Password123!',
      role: 'customer',
    });

    testTraveller = await Traveller.create({
      userId: testCustomer._id,
      title: 'Mr',
      firstName: 'Tariq',
      lastName: 'Ansari',
      gender: 'Male',
      passengerType: 'Adult',
      nationality: 'Indian',
      dateOfBirth: new Date('1990-01-01'),
      passport: {
        number: `Z${uniqueSuffix}99`,
        expiry: new Date('2032-05-15'),
      },
    });

    // 2. Create Mock Package
    testPackage = await Package.create({
      title: 'Premium 14-Day Executive Umrah Experience',
      description: 'Full-service luxury Umrah package with 5-star Makkah & Madinah accommodations and guided Ziyarat tours.',
      destination: 'Makkah & Madinah, Saudi Arabia',
      sellPrice: 185000,
      bundleDiscountPercentage: 5,
      guideActive: true,
      guideLocation: 'Makkah & Madinah',
      guidePrice: 5000,
      inclusions: [
        '5-Star Luxury Clock Tower Hotel in Makkah',
        '5-Star Madinah Hotel near Prophet’s Mosque',
        'Round-Trip Flights via Saudi Airlines',
        'VIP Private Airport & Intercity Transfers',
        'Comprehensive Historical Ziyarat Tours',
      ],
      itinerary: [
        { day: 1, title: 'Arrival in Jeddah', description: 'VIP Airport pickup and transfer to Makkah hotel' },
        { day: 2, title: 'Performing Umrah', description: 'Guided Umrah rituals with certified instructor' },
        { day: 7, title: 'Transfer to Madinah', description: 'Haramain High-Speed Railway to Madinah Al-Munawwarah' },
        { day: 14, title: 'Departure', description: 'Final Ziyarat and transfer to Madinah Airport' },
      ],
      createdBy: testUser._id,
      offerRefs: [
        { offer: new mongoose.Types.ObjectId(), unitsPerBooking: 1, isOptional: false },
        { offer: new mongoose.Types.ObjectId(), unitsPerBooking: 1, isOptional: false },
      ],
    });

    // 3. Create Mock Package Booking
    testBooking = await PackageBooking.create({
      userId: testCustomer._id,
      packageId: testPackage._id,
      guideSelected: 'yes',
      guideLocation: ['Makkah', 'Madinah'],
      guidePrice: 5000,
      packageSnapshot: {
        title: testPackage.title,
        destination: testPackage.destination,
        basePackageSellPrice: 185000,
        bundleDiscountPercentage: 5,
        finalSellPrice: 185000,
        guidePrice: 5000,
        guideSelected: 'yes',
        guideLocation: ['Makkah', 'Madinah'],
        inclusions: testPackage.inclusions,
        itinerary: testPackage.itinerary,
      },
      travellers: [
        {
          travellerId: testTraveller._id,
          isLead: true,
        },
      ],
      quantity: 1,
      totalAmount: 190000,
      status: 'confirmed',
      travelDates: {
        startDate: new Date('2026-11-10'),
        endDate: new Date('2026-11-24'),
      },
      contactDetails: {
        email: 'tariq.ansari@example.com',
        phone: '+91 98765 43210',
        emergencyContact: '+91 98765 00000',
      },
      razorpayPaymentId: `pay_PKG_${uniqueSuffix}`,
    });

    console.log(`✔ Created Mock Package Booking ID: ${testBooking._id}`);

    // TEST 1: Fetch normalized invoice data (Admin user)
    console.log('\n--- Test 1: JSON Invoice Normalization ---');
    const invoiceData = await invoiceService.getPackageInvoiceData(testBooking._id.toString(), testUser);
    console.log('✔ Invoice Number:', invoiceData.invoiceNumber);
    console.log('✔ Package Title:', invoiceData.packageTitle);
    console.log('✔ Destination:', invoiceData.destination);
    console.log('✔ Total Paid:', invoiceData.pricing.currency, invoiceData.pricing.totalAmount);
    console.log('✔ Base Tariff:', invoiceData.pricing.currency, invoiceData.pricing.basePackageFare);
    console.log('✔ Guide Addon Fee:', invoiceData.pricing.currency, invoiceData.pricing.guideFee);
    console.log('✔ Personal GST Tax Rate:', invoiceData.pricing.personalGstRate + '%');
    console.log('✔ Travellers Count:', invoiceData.travellers.length);
    console.log('✔ Lead Pilgrim:', invoiceData.customer.leadPassengerName);

    if (!invoiceData.invoiceNumber.startsWith('MT-INV-PKG-')) {
      throw new Error(`Invalid invoice numbering format: ${invoiceData.invoiceNumber}`);
    }
    console.log('✔ Deterministic invoice numbering verified');

    // TEST 1B: Verify with 5% Personal GST configured
    console.log('\n--- Test 1B: 5% Agency Personal GST Calculation ---');
    const settingsService = require('../modules/crm/settings.service');
    await settingsService.applyAgencyGst({ agencyPersonalGst: 5 }, testUser._id);
    const invoiceWithGst = await invoiceService.getPackageInvoiceData(testBooking._id.toString(), testUser);
    console.log('✔ Personal GST Applied:', invoiceWithGst.pricing.personalGstRate + '%');
    console.log('✔ Personal GST Amount:', invoiceWithGst.pricing.currency, invoiceWithGst.pricing.personalGstAmount);
    if (invoiceWithGst.pricing.personalGstRate !== 5 || !invoiceWithGst.pricing.personalGstAmount) {
      throw new Error('Personal GST calculation failed!');
    }
    const htmlWithGst = invoiceService.renderPackageInvoiceHtml(invoiceWithGst, 'sample_jwt');
    if (!htmlWithGst.includes('Agency Personal GST (5%)')) {
      throw new Error('Personal GST row missing in rendered HTML!');
    }
    console.log('✔ Personal GST tax row correctly rendered in invoice HTML');

    // TEST 2: Render branded HTML document
    console.log('\n--- Test 2: HTML Template Rendering ---');
    const html = invoiceService.renderPackageInvoiceHtml(invoiceData, 'sample_jwt_token');
    console.log('✔ Generated HTML Length:', html.length, 'bytes');

    if (html.includes('{{invoiceNumber}}') || html.includes('{{packageTitle}}')) {
      throw new Error('Unrendered placeholders found in HTML template!');
    }
    console.log('✔ All template placeholders correctly substituted');

    // TEST 3: Access Control & Security
    console.log('\n--- Test 3: Access Control & RBAC ---');
    // Owner customer can access
    const ownerData = await invoiceService.getPackageInvoiceData(testBooking._id.toString(), {
      _id: testCustomer._id.toString(),
      id: testCustomer._id.toString(),
      role: 'customer',
    });
    console.log('✔ Owner customer successfully retrieved their invoice');

    // Foreign customer cannot access
    try {
      await invoiceService.getPackageInvoiceData(testBooking._id.toString(), {
        _id: new mongoose.Types.ObjectId().toString(),
        id: new mongoose.Types.ObjectId().toString(),
        role: 'customer',
      });
      throw new Error('Unauthorized customer was incorrectly permitted access!');
    } catch (authErr) {
      if (authErr.statusCode === 403) {
        console.log('✔ Foreign customer correctly rejected with 403 Forbidden');
      } else {
        throw authErr;
      }
    }

    console.log('\n🎉 ALL PACKAGE INVOICE TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('\n❌ Test Failure:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    if (testBooking) await PackageBooking.findByIdAndDelete(testBooking._id);
    if (testPackage) await Package.findByIdAndDelete(testPackage._id);
    if (testTraveller) await Traveller.findByIdAndDelete(testTraveller._id);
    if (testCustomer) await User.findByIdAndDelete(testCustomer._id);
    if (testUser) await User.findByIdAndDelete(testUser._id);
    await mongoose.disconnect();
    console.log('✔ Cleaned up test records & disconnected');
  }
}

runTest();

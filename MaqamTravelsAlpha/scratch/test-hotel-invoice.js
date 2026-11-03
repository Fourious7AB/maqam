const invoiceService = require('../modules/invoices/invoice.service');
const HotelBooking = require('../modules/hotels/hotel.model');

// Mock Live Hotel Booking
const mockHotelBooking = {
  _id: '66b123456789012345678999',
  provider: 'srdv',
  status: 'confirmed',
  searchId: 'search_mock_123',
  recheckId: 'recheck_mock_456',
  traceId: 'TRC-HTL-998877',
  srdvHotelId: '108842',
  hotelName: 'Pullman Zamzam Makkah',
  destination: 'Abraj Al Bait Complex, King Abdul Aziz Endowment, Mecca, Saudi Arabia',
  checkIn: new Date('2026-11-10T14:00:00Z'),
  checkOut: new Date('2026-11-15T11:00:00Z'),
  createdAt: new Date('2026-10-12T10:30:00Z'),
  
  // Property Snapshot
  hotelSnapshot: {
    name: 'Pullman Zamzam Makkah',
    address: 'Abraj Al Bait Complex, King Abdul Aziz Endowment, Mecca 21955, Saudi Arabia',
    city: 'Mecca',
    state: 'Makkah Province',
    country: 'Saudi Arabia',
    pinCode: '21955',
    rating: 5,
    category: '5-Star Luxury Hotel',
    contactNo: '+966 12 571 5555',
  },

  // Rooms Snapshot (2 Rooms booked)
  roomSnapshots: [
    {
      id: '1',
      name: 'Deluxe Suite Haram View',
      board: 'Bed & Breakfast',
      capacity: 2,
      price: 12000,
      totalPrice: 60000,
      currency: 'INR',
      refundable: true,
      cancellationPolicy: 'Free cancellation until 48 hours prior to check-in date.',
    },
    {
      id: '2',
      name: 'Classic Twin Room City View',
      board: 'Room Only',
      capacity: 2,
      price: 8000,
      totalPrice: 40000,
      currency: 'INR',
      refundable: false,
      cancellationPolicy: 'Non-refundable booking. Full charges apply upon cancellation.',
    },
  ],

  // Guest Manifest
  guests: [
    {
      title: 'Mr',
      firstName: 'Ahmed',
      lastName: 'Khan',
      leadPassenger: true,
      type: 'adult',
      age: 38,
      phone: '+91 98200 12345',
      email: 'ahmed.khan@example.com',
      passportNo: 'Z9876543',
      nationality: 'IN',
    },
    {
      title: 'Mrs',
      firstName: 'Fatima',
      lastName: 'Khan',
      leadPassenger: false,
      type: 'adult',
      age: 34,
      phone: '+91 98200 12345',
      passportNo: 'Z1234567',
      nationality: 'IN',
    },
    {
      title: 'Mstr',
      firstName: 'Zayd',
      lastName: 'Khan',
      leadPassenger: false,
      type: 'child',
      age: 8,
      nationality: 'IN',
    },
  ],

  // Financials (in Minor units - paise for INR)
  currency: 'INR',
  totalPrice: 104500, // 1,00,000 room charges + 3,500 markup + 1,000 fee
  supplierAmountMinor: 10000000, // 1,00,000 INR room base tariff
  markupMinor: 350000,          // 3,500 INR agency markup
  feeMinor: 100000,             // 1,000 INR platform fee
  customerTotalMinor: 10450000, // 1,04,500 INR total
  pricingVersion: 'v1',

  priceSnapshot: {
    perNightPrice: 20900,
    totalPrice: 104500,
    nights: 5,
    currency: 'INR',
    supplierAmountMinor: 10000000,
    markupMinor: 350000,
    feeMinor: 100000,
    customerTotalMinor: 10450000,
  },

  cancellationPolicySnapshot: [
    'Room 1: Free cancellation until 48 hours prior to check-in date.',
    'Room 2: Non-refundable rate policy applies.',
  ],

  // Provider Confirmation & Invoice Details
  providerBookingId: 'SRDV-HTL-99120',
  bookingRefNo: 'BK-MAQAM-7721',
  confirmationNo: 'HTL-PULLMAN-55419',
  invoiceNumber: 'SRDV-INV-2026-8842',
  voucherStatus: true,

  // User
  userId: {
    _id: '66a000000000000000000001',
    firstName: 'Ahmed',
    lastName: 'Khan',
    email: 'ahmed.khan@example.com',
    phone: '+91 98200 12345',
  },

  // Payment
  paymentId: {
    _id: '66c999999999999999999999',
    paymentMethod: 'razorpay',
    status: 'paid',
    amount: 104500,
    currency: 'INR',
    gatewayData: {
      orderId: 'order_RZP_HOTEL_9988',
      captureId: 'pay_RZP_CAP_776655',
    },
  },
};

async function runTests() {
  console.log('--- Testing Hotel Invoice Engine ---');
  const originalFindOne = HotelBooking.findOne;

  try {
    HotelBooking.findOne = () => ({
      populate: () => ({
        populate: () => ({
          lean: async () => mockHotelBooking,
        }),
      }),
    });

    // 1. Test getHotelInvoiceData()
    console.log('\n[1] Fetching Normalized Hotel Invoice Data:');
    const invoiceData = await invoiceService.getHotelInvoiceData('HTL-PULLMAN-55419');

    console.log('✔ Invoice Number:', invoiceData.invoiceNumber);
    console.log('✔ Supplier Invoice:', invoiceData.supplierInvoiceNumber);
    console.log('✔ Confirmation No:', invoiceData.confirmationNo);
    console.log('✔ Property:', invoiceData.hotel.name, `(${invoiceData.hotel.category})`);
    console.log('✔ Location:', invoiceData.hotel.address);
    console.log('✔ Stay Duration:', `${invoiceData.stay.nights} Nights (${invoiceData.stay.checkIn} to ${invoiceData.stay.checkOut})`);
    console.log('✔ Rooms Booked:', invoiceData.rooms.length);
    invoiceData.rooms.forEach((r) => {
      console.log(`   - Room ${r.index}: ${r.name} | ${r.mealPlan} | Nightly: ₹${r.pricePerNight} | Total: ₹${r.totalPrice} | ${r.refundable}`);
    });
    console.log('✔ Guests Manifest:', invoiceData.guests.length);
    invoiceData.guests.forEach((g) => {
      console.log(`   - Guest ${g.index}: ${g.name} (${g.type}, Lead: ${g.isLead}) | Passport: ${g.passportNo || 'N/A'}`);
    });
    console.log('✔ Financial Breakdown:');
    console.log('   - Room Tariff:', invoiceData.pricing.currency, invoiceData.pricing.roomCharges);
    console.log('   - Agency Service/Markup Fee:', invoiceData.pricing.currency, invoiceData.pricing.serviceFee);
    console.log('   - CGST (9%):', invoiceData.pricing.currency, invoiceData.pricing.cgst);
    console.log('   - SGST (9%):', invoiceData.pricing.currency, invoiceData.pricing.sgst);
    console.log('   - Total Paid:', invoiceData.pricing.currency, invoiceData.pricing.totalAmount);
    console.log('✔ Payment Mode:', invoiceData.payment.method, `(${invoiceData.payment.status}) | Ref: ${invoiceData.payment.transactionId}`);

    // Verification assertions
    if (!invoiceData.invoiceNumber.startsWith('MT-INV-HTL-')) {
      throw new Error(`Invalid invoice number format: ${invoiceData.invoiceNumber}`);
    }
    if (invoiceData.stay.nights !== 5) {
      throw new Error(`Expected 5 nights, got ${invoiceData.stay.nights}`);
    }
    if (invoiceData.rooms.length !== 2) {
      throw new Error(`Expected 2 rooms, got ${invoiceData.rooms.length}`);
    }
    if (invoiceData.guests.length !== 3) {
      throw new Error(`Expected 3 guests, got ${invoiceData.guests.length}`);
    }

    // 2. Test renderHotelInvoiceHtml()
    console.log('\n[2] Rendering Hotel Tax Invoice HTML Template:');
    const html = invoiceService.renderHotelInvoiceHtml(invoiceData);
    console.log('✔ HTML length generated:', html.length, 'bytes');

    // Ensure all critical tokens were replaced
    const unreplacedMatches = html.match(/\{\{[a-zA-Z0-9_-]+\}\}/g);
    if (unreplacedMatches && unreplacedMatches.length > 0) {
      throw new Error(`Found unreplaced template placeholders: ${unreplacedMatches.join(', ')}`);
    }

    // Verify key content is in HTML
    if (!html.includes('Pullman Zamzam Makkah')) throw new Error('HTML missing hotel name');
    if (!html.includes('HTL-PULLMAN-55419')) throw new Error('HTML missing confirmation number');
    if (!html.includes('Deluxe Suite Haram View')) throw new Error('HTML missing room 1 name');
    if (!html.includes('Classic Twin Room City View')) throw new Error('HTML missing room 2 name');
    if (!html.includes('Ahmed Khan')) throw new Error('HTML missing guest name');
    if (!html.includes('Z9876543')) throw new Error('HTML missing passport number');
    if (!html.includes('1,04,500.00')) throw new Error('HTML missing total amount');

    console.log('✔ HTML template passed all placeholder and content assertions!');

    // 3. Test Authorization check
    console.log('\n[3] Testing Security & Access Control:');
    const customerUser = { _id: '66a000000000000000000001', role: 'customer' };
    const otherUser = { _id: '66a000000000000000000999', role: 'customer' };
    const adminUser = { _id: '66a000000000000000000888', role: 'admin' };

    // Owner can access
    await invoiceService.getHotelInvoiceData('HTL-PULLMAN-55419', customerUser);
    console.log('✔ Booking owner authorized successfully');

    // Admin can access
    await invoiceService.getHotelInvoiceData('HTL-PULLMAN-55419', adminUser);
    console.log('✔ Admin user authorized successfully');

    // Other customer is denied
    try {
      await invoiceService.getHotelInvoiceData('HTL-PULLMAN-55419', otherUser);
      throw new Error('Unauthorized customer was incorrectly granted access!');
    } catch (authErr) {
      if (authErr.statusCode === 403) {
        console.log('✔ Unauthorized customer correctly denied with 403 Forbidden');
      } else {
        throw authErr;
      }
    }

    console.log('\n=============================================');
    console.log('🎉 ALL HOTEL INVOICE TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================\n');
  } finally {
    HotelBooking.findOne = originalFindOne;
  }
}

runTests().catch((err) => {
  console.error('\n❌ Hotel Invoice test failed:', err);
  process.exit(1);
});

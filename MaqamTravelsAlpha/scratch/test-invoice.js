const invoiceService = require('../modules/invoices/invoice.service');

// Mock LCC Flight Booking
const mockLccBooking = {
  _id: '66a123456789012345678901',
  srdvBookingId: 2106,
  isLCC: true,
  pnr: '6E9XYZ',
  createdAt: new Date('2026-10-10T10:00:00Z'),
  status: 'confirmed',
  ticketStatus: 'Confirmed',
  totalAmount: 5156,
  markupAmount: 250,
  gstDetails: {
    wantsInvoice: true,
    companyName: 'Acme Corp Technologies Pvt Ltd',
    gstNumber: '07AAACA1234F1Z1',
    companyAddress: 'Plot 45, Sector 18, Gurugram, Haryana',
    companyEmail: 'tax@acmecorp.com',
    companyContactNumber: '+91 9876543210',
  },
  user: {
    _id: '66a000000000000000000001',
    firstName: 'Rahul',
    lastName: 'Sharma',
    email: 'rahul.sharma@example.com',
    phone: '+91 99999 88888',
  },
  passengers: [
    {
      ticketNumber: '6E9XYZ-1',
      ticketStatus: 'OK',
    },
  ],
  eTicketData: {
    IsLCC: true,
    Origin: 'DEL',
    Destination: 'AMD',
    Fare: {
      Currency: 'INR',
      BaseFare: 3691,
      Tax: 765,
      YQTax: 700,
      TotalBaggageCharges: 0,
      TotalMealCharges: 0,
      TotalSeatCharges: 0,
    },
    Passenger: [
      {
        Title: 'Mr',
        FirstName: 'Rahul',
        LastName: 'Sharma',
        PaxType: '1',
      },
    ],
    Segments: [
      {
        Airline: { AirlineCode: '6E', AirlineName: 'IndiGo', FlightNumber: '2501' },
        Origin: { AirportCode: 'DEL', CityName: 'Delhi', Terminal: '3' },
        Destination: { AirportCode: 'AMD', CityName: 'Ahmedabad', Terminal: '1' },
        DepTime: '2026-10-15T08:00:00',
        ArrTime: '2026-10-15T09:35:00',
        Duration: 95,
        Baggage: '15 Kg',
        CabinBaggage: '7 Kg',
      },
    ],
  },
  paymentId: {
    paymentMethod: 'razorpay',
    status: 'paid',
    gatewayData: {
      orderId: 'order_Oihw87413k',
    },
  },
};

// Mock GDS Flight Booking
const mockGdsBooking = {
  _id: '66b987654321098765432109',
  srdvBookingId: 5409,
  isLCC: false,
  pnr: 'EK8899',
  gdsPnr: '7ABC89',
  createdAt: new Date('2026-10-11T14:30:00Z'),
  status: 'confirmed',
  ticketStatus: 'OK',
  totalAmount: 48500,
  markupAmount: 1500,
  gstDetails: { wantsInvoice: false },
  user: {
    _id: '66a000000000000000000002',
    firstName: 'Priya',
    lastName: 'Verma',
    email: 'priya.verma@example.com',
    phone: '+91 88888 77777',
  },
  passengers: [
    {
      ticketNumber: '176-9876543210',
      ticketStatus: 'OK',
    },
  ],
  eTicketData: {
    IsLCC: false,
    Origin: 'BOM',
    Destination: 'DXB',
    Fare: {
      Currency: 'INR',
      BaseFare: 38000,
      Tax: 5000,
      YQTax: 4000,
    },
    Passenger: [
      {
        Title: 'Ms',
        FirstName: 'Priya',
        LastName: 'Verma',
        PaxType: '1',
      },
    ],
    Segments: [
      {
        Airline: { AirlineCode: 'EK', AirlineName: 'Emirates', FlightNumber: '501' },
        Origin: { AirportCode: 'BOM', CityName: 'Mumbai', Terminal: '2' },
        Destination: { AirportCode: 'DXB', CityName: 'Dubai', Terminal: '3' },
        DepTime: '2026-11-01T04:30:00',
        ArrTime: '2026-11-01T06:15:00',
        Duration: 195,
        Baggage: '30 Kg',
        CabinBaggage: '7 Kg',
      },
    ],
  },
  paymentId: {
    paymentMethod: 'paypal',
    status: 'captured',
    gatewayData: {
      orderId: 'PAYPAL-987654',
    },
  },
};

async function runTests() {
  console.log('Testing LCC & GDS Invoice Template rendering...');

  // 1. Mock FlightBooking.findOne
  const FlightBooking = require('../modules/flights/flight.model');
  const originalFindOne = FlightBooking.findOne;

  try {
    // Test LCC
    FlightBooking.findOne = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({
            lean: async () => mockLccBooking,
          }),
        }),
      }),
    });

    const lccData = await invoiceService.getInvoiceData('2106');
    console.log('\n[LCC Data]:');
    console.log('Invoice No:', lccData.invoiceNumber);
    console.log('Service Type:', lccData.serviceTypeBadge);
    console.log('Airline PNR:', lccData.airlinePnr);
    console.log('Corporate GST:', lccData.customer.hasCorporateGst, lccData.customer.companyName);
    console.log('Total:', lccData.pricing.currency, lccData.pricing.totalAmount);

    const lccHtml = invoiceService.renderInvoiceHtml(lccData);
    console.log('LCC HTML rendered length:', lccHtml.length);
    if (!lccHtml.includes('MT-INV-LCC') || !lccHtml.includes('IndiGo') || !lccHtml.includes('Acme Corp')) {
      throw new Error('LCC HTML missing key information');
    }

    // Test GDS
    FlightBooking.findOne = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({
            lean: async () => mockGdsBooking,
          }),
        }),
      }),
    });

    const gdsData = await invoiceService.getInvoiceData('5409');
    console.log('\n[GDS Data]:');
    console.log('Invoice No:', gdsData.invoiceNumber);
    console.log('Service Type:', gdsData.serviceTypeBadge);
    console.log('GDS PNR:', gdsData.gdsPnr);
    console.log('E-Ticket No:', gdsData.passengers[0].ticketNumber);
    console.log('Total:', gdsData.pricing.currency, gdsData.pricing.totalAmount);

    const gdsHtml = invoiceService.renderInvoiceHtml(gdsData);
    console.log('GDS HTML rendered length:', gdsHtml.length);
    if (!gdsHtml.includes('MT-INV-GDS') || !gdsHtml.includes('Emirates') || !gdsHtml.includes('176-9876543210')) {
      throw new Error('GDS HTML missing key information');
    }

    console.log('\n✅ All invoice tests passed successfully!');
  } finally {
    FlightBooking.findOne = originalFindOne;
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

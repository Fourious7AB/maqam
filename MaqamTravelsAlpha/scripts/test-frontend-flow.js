'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../modules/auth/auth.model');
const Hotel = require('../modules/hotels/hotelEntity.model');
const HotelStock = require('../modules/packages/stock/hotelStock.model');
const app = require('../app');
const http = require('http');
const axios = require('axios');

async function main() {
  console.log('=== VERIFYING END-TO-END FLOW WITH SEEDED DATA ===');
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  try {
    // 1. Admin Login (POST /api/v1/auth/login)
    const adminLoginRes = await axios.post(`${baseUrl}/api/v1/auth/login`, {
      email: 'admin1@gmail.com',
      password: 'Admin1234',
    });
    const adminToken = adminLoginRes.data.data.accessToken;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    console.log('✔ 1. Admin logged in successfully. User role:', adminLoginRes.data.data.user.role);

    // 2. Admin queries hotel partners list for dropdown (GET /api/v1/crm/hotels)
    const hotelListRes = await axios.get(`${baseUrl}/api/v1/crm/hotels`, { headers: adminHeaders });
    const hotels = hotelListRes.data.data;
    console.log(`✔ 2. Admin fetched ${hotels.length} partner hotels for dropdown.`);
    const atlantis = hotels.find(h => h.name === 'Atlantis The Royal');
    if (!atlantis) throw new Error('Atlantis The Royal not found in hotel list!');
    console.log('   Selected hotel for room creation:', { id: atlantis._id, name: atlantis.name, destination: atlantis.destination });

    // 3. Admin creates room allotment using selected hotelId (POST /api/v1/crm/stocks/hotels)
    const roomPayload = {
      hotelId: atlantis._id,
      roomType: 'Signature Ocean Suite',
      checkIn: '2026-11-20T00:00:00.000Z',
      checkOut: '2026-11-25T00:00:00.000Z',
      pricePerNight: 6200,
      meals: ['breakfast', 'dinner'],
      reservationRef: 'ATL-TEST-SIG-01',
      nameAdditionDeadline: '2026-11-15T00:00:00.000Z',
      totalUnits: 8,
    };
    const createStockRes = await axios.post(`${baseUrl}/api/v1/crm/stocks/hotels`, roomPayload, { headers: adminHeaders });
    const newStock = createStockRes.data.stock;
    console.log('✔ 3. Admin created room stock:', newStock._id, 'Review status:', newStock.reviewStatus, 'Total units:', newStock.totalUnits);

    // 4. Hotelier 1 Login (POST /api/v1/auth/login)
    const hotelierLoginRes = await axios.post(`${baseUrl}/api/v1/auth/login`, {
      email: 'hotelier1@gmail.com',
      password: 'Hotelier1234!',
    });
    const hotelierToken = hotelierLoginRes.data.data.accessToken;
    const hotelierHeaders = { Authorization: `Bearer ${hotelierToken}` };
    console.log('✔ 4. Hotelier logged in successfully:', hotelierLoginRes.data.data.user.email, 'Hotel ID:', hotelierLoginRes.data.data.user.hotelId);

    // 5. Hotelier views inventory dashboard (GET /api/v1/hotelier/stock)
    const hotelierStockRes = await axios.get(`${baseUrl}/api/v1/hotelier/stock`, { headers: hotelierHeaders });
    const hotelierBatches = hotelierStockRes.data.data;
    console.log(`✔ 5. Hotelier fetched ${hotelierBatches.length} stock batches belonging to their hotel.`);
    const foundAdminCreatedBatch = hotelierBatches.find(b => b._id === newStock._id);
    console.log('   Includes the newly admin-created batch:', !!foundAdminCreatedBatch);

    // 6. Hotelier submits a room block batch (POST /api/v1/hotelier/stock)
    const hotelierBatchPayload = {
      roomType: 'Sky View Terrace Club',
      checkIn: '2026-12-10T00:00:00.000Z',
      checkOut: '2026-12-15T00:00:00.000Z',
      pricePerNight: 4800,
      meals: ['breakfast'],
      reservationRef: 'HOTELIER-DEC-SKY',
      nameAdditionDeadline: '2026-12-05T00:00:00.000Z',
      unitCount: 4,
    };
    const submitBatchRes = await axios.post(`${baseUrl}/api/v1/hotelier/stock`, hotelierBatchPayload, { headers: hotelierHeaders });
    const submittedBatch = submitBatchRes.data.data;
    console.log('✔ 6. Hotelier submitted room batch:', submittedBatch._id, 'Status:', submittedBatch.reviewStatus);

    // 7. Admin lists pending queue (GET /api/v1/crm/hotel-stock/pending)
    const pendingRes = await axios.get(`${baseUrl}/api/v1/crm/hotel-stock/pending`, { headers: adminHeaders });
    console.log(`✔ 7. Admin checked review queue. Pending batches count: ${pendingRes.data.meta.total}`);

    // 8. Admin approves the submitted batch (PATCH /api/v1/crm/hotel-stock/:id/review)
    const approveRes = await axios.patch(
      `${baseUrl}/api/v1/crm/hotel-stock/${submittedBatch._id}/review`,
      { decision: 'approved', reviewNotes: 'Verified seasonal rates with hotel manager.' },
      { headers: adminHeaders }
    );
    console.log('✔ 8. Admin approved batch:', approveRes.data.data._id, 'Status:', approveRes.data.data.reviewStatus);

    // 9. Hotelier blocks 1 room for internal maintenance (PATCH /api/v1/hotelier/stock/:id/units/:unitId)
    const unitToBlock = submittedBatch.units[0]._id;
    const blockRes = await axios.patch(
      `${baseUrl}/api/v1/hotelier/stock/${submittedBatch._id}/units/${unitToBlock}`,
      { status: 'blocked' },
      { headers: hotelierHeaders }
    );
    console.log('✔ 9. Hotelier blocked unit for maintenance. Unit status:', blockRes.data.data.units[0].status);

    // 10. Admin checks approved stock for packaging (GET /api/v1/crm/hotel-stock/approved)
    const approvedListRes = await axios.get(`${baseUrl}/api/v1/crm/hotel-stock/approved`, { headers: adminHeaders });
    console.log(`✔ 10. Admin retrieved ${approvedListRes.data.data.length} approved stock batches for Package/Offer creation.`);

    console.log('\n=== ALL 10 TESTS PASSED WITH LIVE REAL DATA PERSISTED! ===');
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

main().catch(err => {
  console.error('Error during flow test:', err.response?.data || err.message);
  process.exit(1);
});

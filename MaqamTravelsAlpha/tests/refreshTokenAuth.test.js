// tests/refreshTokenAuth.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const { generateTokens } = require('../middleware/auth');
const authService = require('../modules/auth/auth.service');
const RefreshToken = require('../modules/auth/refreshToken.model');
const User = require('../modules/auth/auth.model');

describe('Refresh Token Rotation (RTR) Test Suite', () => {
  let testUser;
  let createdTestUser = false;
  let initialRefreshToken;
  let secondRefreshToken;
  let thirdRefreshToken;

  before(async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in .env');
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { family: 4 });
    }

    // Find an existing active user or create a temporary one for testing
    testUser = await User.findOne({ isActive: true });
    if (!testUser) {
      testUser = await User.create({
        phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: '$2a$10$abcdefghijklmnopqrstuu',
        firstName: 'RTR',
        lastName: 'Tester',
        role: 'customer',
        isActive: true,
      });
      createdTestUser = true;
    }
  });

  after(async () => {
    try {
      // Clean up any test tokens associated with testUser
      if (testUser?._id) {
        await RefreshToken.deleteMany({ userId: testUser._id });
      }

      // Clean up temporary test user if we created one
      if (createdTestUser && testUser?._id) {
        await User.deleteOne({ _id: testUser._id });
      }
    } finally {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  });

  it('1. should issue and store a new refresh token on login/session creation', async () => {
    const { accessToken, refreshToken } = generateTokens(testUser._id, testUser.role);
    assert.ok(accessToken, 'Access token should be defined');
    assert.ok(refreshToken, 'Refresh token should be defined');

    // Simulate saving the initial login refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tokenDoc = await RefreshToken.create({
      userId: testUser._id,
      token: refreshToken,
      expiresAt,
    });

    assert.ok(tokenDoc, 'Token document should be created in MongoDB');
    assert.equal(tokenDoc.token, refreshToken);
    assert.equal(tokenDoc.userId.toString(), testUser._id.toString());

    initialRefreshToken = refreshToken;
  });

  it('2. should issue fresh 15m access token while keeping the same 30d refresh token valid', async () => {
    // Refresh access token using initialRefreshToken
    const result = await authService.refreshAccessToken(initialRefreshToken);

    assert.ok(result.accessToken, 'Fresh access token should exist');
    assert.equal(result.refreshToken, initialRefreshToken, 'Refresh token should remain the same (no rotation)');

    // Verify token remains active in database
    const tokenInDb = await RefreshToken.findOne({ token: initialRefreshToken });
    assert.ok(tokenInDb, 'Refresh token must still exist in MongoDB');
    assert.equal(tokenInDb.userId.toString(), testUser._id.toString());
  });

  it('3. should allow multiple sequential access token refreshes using the same 30d refresh token', async () => {
    // Refresh second time
    const result2 = await authService.refreshAccessToken(initialRefreshToken);
    assert.ok(result2.accessToken, 'Second fresh access token should exist');
    assert.equal(result2.refreshToken, initialRefreshToken, 'Refresh token should remain active');

    // Refresh third time
    const result3 = await authService.refreshAccessToken(initialRefreshToken);
    assert.ok(result3.accessToken, 'Third fresh access token should exist');
    assert.equal(result3.refreshToken, initialRefreshToken, 'Refresh token should still remain active');

    // Token must still be in MongoDB
    const tokenInDb = await RefreshToken.findOne({ token: initialRefreshToken });
    assert.ok(tokenInDb, '30d refresh token must remain in MongoDB after multiple refreshes');
  });

  it('4. should reject refresh with completely invalid or tampered token', async () => {
    await assert.rejects(
      async () => {
        await authService.refreshAccessToken('invalid.fake.jwt.token');
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        return true;
      }
    );
  });

  it('5. should revoke token on logout and prevent further refreshes', async () => {
    // Verify token exists before logout
    const beforeLogout = await RefreshToken.findOne({ token: initialRefreshToken });
    assert.ok(beforeLogout, 'Token should exist before logout');

    // Perform logout
    await authService.logoutUser(initialRefreshToken, testUser._id);

    // Verify token is deleted from DB
    const afterLogout = await RefreshToken.findOne({ token: initialRefreshToken });
    assert.equal(afterLogout, null, 'Token must be deleted from MongoDB on logout');

    // Attempt to refresh with logged-out token should fail
    await assert.rejects(
      async () => {
        await authService.refreshAccessToken(initialRefreshToken);
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        return true;
      }
    );
  });
});

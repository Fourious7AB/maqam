const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { AppError } = require("../../middleware/errorHandler");
const logger = require("../../utils/logger");
const bcrypt = require("bcryptjs");
const OTP = require('../../models/otp.model');
const cache = require('../../utils/cache');
const { sendOtpSMS } = require('../../services/fast2sms.service');
const User = require('./auth.model');
const RefreshToken = require('./refreshToken.model');
const Hotel = require('../hotels/hotelEntity.model');

const {
  generateTokens,
} = require("../../middleware/auth");

const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30days
  await RefreshToken.create({
    userId,
    token,
    expiresAt,
  }); 
};


const registerUser = async ({
  email = null,
  password,
  firstName,
  lastName,
  phone,
  avatar = null,
  role,
  hotelId = null
}) => {
  const normalizedPhone = phone?.trim();
  const normalizedEmail = email?.trim().toLowerCase() || null;
  const hashedPassword = await bcrypt.hash(password, 10);
  const allowedAvatars = User.AVATAR_OPTIONS || [];

  if (avatar && !allowedAvatars.includes(avatar)) {
    throw new AppError("Invalid avatar selection", 400);
  }

  const cleanAvatar = avatar || null; 

  

 

  try {
    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      throw new AppError("Phone number already registered", 409);
    }

    if (normalizedEmail) {
      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail) {
        throw new AppError("Email already registered", 409);
      }
    }

    if (role === 'hotelier' && hotelId) {
      const hotelExists = await Hotel.findById(hotelId);
      if (!hotelExists) {
        throw new AppError("Specified hotel does not exist", 404);
      }
    }

    const user = await User.create({
      phone: normalizedPhone,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      email: normalizedEmail || undefined,
      avatar: cleanAvatar,
      hotelId: role === 'hotelier' && hotelId ? hotelId : undefined,
    });

    if (user.role === 'hotelier' && user.hotelId) {
      await user.populate('hotelId', 'name');
    }

    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    await saveRefreshToken(user._id, refreshToken);

    logger.info(`User registered: ${phone}`);

    const isHotelier = user.role === 'hotelier';
    const finalHotelId = user.hotelId?._id || user.hotelId || null;
    const finalHotelName = user.hotelId?.name || null;

    return {
      user: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        ...(isHotelier && {
          hotelId: finalHotelId,
          hotelName: finalHotelName,
        }),
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    logger.error(`Registration failed for ${phone}: ${error.message}`);
    throw error;
  }
};

const getAvatarOptions = () => {
  return User.AVATAR_OPTIONS || [];
};

const loginUser = async ({ email, password }) => {
  try {
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+password").populate('hotelId', 'name');
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError("Invalid credentials", 401);
    }

    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    await saveRefreshToken(user._id, refreshToken);

    logger.info(`User logged in: ${email}`); 

    const isHotelier = user.role === 'hotelier';
    const hotelId = user.hotelId?._id || user.hotelId || null;
    const hotelName = user.hotelId?.name || null;

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        theme: user.theme,
        ...(isHotelier && {
          hotelId,
          hotelName,
        }),
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    logger.error(`Login failed for ${email}: ${error.message}`);
    throw error;
  }
};

const refreshAccessToken = async (refreshToken) => {
  try {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        console.log('refresh token is expire:', refreshToken);
      }
      throw new AppError("Invalid or expired refresh token", 401);
    }

    // Verify token exists in database (not logged out or revoked)
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });

    if (!tokenDoc) {
      throw new AppError("Invalid or revoked refresh token. Please login again.", 401);
    }

    if (tokenDoc.expiresAt && new Date(tokenDoc.expiresAt) < new Date()) {
      console.log('refresh token is expire:', refreshToken);
      throw new AppError("Refresh token has expired. Please login again.", 401);
    }

    // Validate user status
    const user = await User.findById(decoded.id);
    if (!user || user.isActive === false) {
      throw new AppError("User account inactive or not found", 401);
    }

    // Issue a fresh 1-minute access token (keep the same 30-day refresh token)
    const payload = { id: user._id, role: user.role };
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '1m' });

    logger.info(`Access token refreshed successfully for user: ${user._id}`);
    return { accessToken, refreshToken };
  } catch (error) {
    logger.error(`Token refresh failed: ${error.message}`);
    throw error;
  }
};

const forgotPassword = async (phone) => {
  const user = await User.findOne({ phone });
  if (!user) {
    throw new AppError("Phone number not found", 404);
  }
  // otp verification will be added later
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  logger.info(`Password reset requested for phone: ${phone}`);

  return {
    resetToken,
    expiresAt: user.resetPasswordExpires,
  };
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+password");

  if (!user) {
    throw new AppError("Invalid or expired password reset token", 401);
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  // Invalidate all existing refresh tokens for this user on password reset
  await RefreshToken.deleteMany({ userId: user._id });

  logger.info(`Password reset complete for user: ${user.phone}`);

  return {
    id: user._id,
    phone: user.phone,
  };
};

const logoutUser = async (refreshToken, userId = null) => {
  try {
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    } else if (userId) {
      await RefreshToken.deleteMany({ userId });
    }
    logger.info(`User logged out: ${userId || "session"}`);
  } catch (error) {
    logger.error(`Logout failed: ${error.message}`);
  }
};

// ─── OTP-Based Registration ────────────────────────────────────────────────────

const sendOtpService = async (phone) => {
  const normalizedPhone = phone.trim();

  // Validate 10-digit Indian phone format (starts with 6, 7, 8, or 9)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(normalizedPhone)) {
    throw new Error('Please provide a valid 10-digit Indian mobile number.');
  }

  // Generate cryptographically strong 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Expiry timeline (Default: 5 minutes / 300,000 ms)
  const expiryMs = Number(process.env.OTP_EXPIRY_MS) || 5 * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiryMs);

  const otpPayload = {
    otp,
    phone: normalizedPhone,
    attempts: 0,
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // 1. Store in Redis with exact TTL timeline (automatic expiration)
  const redisKey = `otp:${normalizedPhone}`;
  await cache.set(redisKey, otpPayload, expiryMs);
  logger.info(`[Redis] OTP stored under '${redisKey}' with timeline TTL: ${expiryMs / 1000}s`);

  // 2. Persist in MongoDB as resilient fallback
  // await OTP.findOneAndUpdate(
  //   { phone: normalizedPhone },
  //   { otp, expiresAt },
  //   { upsert: true, new: true, setDefaultsOnInsert: true }
  // );

  logger.info(`OTP generated for ${normalizedPhone}, expires at: ${expiresAt.toISOString()}`);

  // 3. Dispatch OTP SMS via Fast2SMS (DISABLED — dev mode, OTP logged to terminal)
  // await sendOtpSMS(normalizedPhone, otp);

  return {
    success: true,
    message: 'OTP dispatched successfully.',
    phone: normalizedPhone,
    otp,
    expiresInSeconds: Math.floor(expiryMs / 1000),
  };
};

const verifyOtpService = async (phone, userOtp) => {
  const normalizedPhone = phone.trim();
  const trimmedOtp = String(userOtp).trim();
  const redisKey = `otp:${normalizedPhone}`;

  // 1. Check Redis first
  let otpRecord = await cache.get(redisKey);

  // Fallback to MongoDB if Redis key is missing or expired in cache
  if (!otpRecord) {
    logger.info(`[Redis] Key '${redisKey}' not found, checking MongoDB fallback...`);
    const dbRecord = await OTP.findOne({ phone: normalizedPhone });
    if (dbRecord) {
      otpRecord = {
        otp: dbRecord.otp,
        phone: dbRecord.phone,
        expiresAt: dbRecord.expiresAt,
        attempts: 0,
        maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
      };
    }
  }

  if (!otpRecord) {
    throw new Error('No OTP request found for this phone number or OTP has expired. Please request a new OTP.');
  }

  // 2. Check Expiration Timeline
  if (new Date() > new Date(otpRecord.expiresAt)) {
    await cache.del(redisKey);
    await OTP.deleteOne({ phone: normalizedPhone });
    throw new Error('OTP has expired. Please request a new one.');
  }

  // 3. Verify OTP & Rate Limit / Failed Attempt Tracking
  const isDev = process.env.NODE_ENV === 'development';
  const isOtpValid = otpRecord.otp === trimmedOtp || (isDev && trimmedOtp === '123456');

  if (!isOtpValid) {
    otpRecord.attempts = (otpRecord.attempts || 0) + 1;
    const maxAttempts = otpRecord.maxAttempts || 5;

    if (otpRecord.attempts >= maxAttempts) {
      await cache.del(redisKey);
      await OTP.deleteOne({ phone: normalizedPhone });
      throw new Error('Maximum OTP verification attempts exceeded. Please request a new OTP.');
    }

    // Update remaining attempts & remaining TTL in Redis
    const remainingTimeMs = new Date(otpRecord.expiresAt).getTime() - Date.now();
    if (remainingTimeMs > 0) {
      await cache.set(redisKey, otpRecord, remainingTimeMs);
    }

    throw new Error(`Invalid OTP provided. ${maxAttempts - otpRecord.attempts} attempt(s) remaining.`);
  }

  // 4. Burn OTP after successful verification (single-use)
  await cache.del(redisKey);
  await OTP.deleteOne({ phone: normalizedPhone });
  logger.info(`[Redis & MongoDB] OTP cleared for ${normalizedPhone} after successful verification.`);

  // 5. Check if user already exists or create new user
  let user = await User.findOne({ phone: normalizedPhone });

  if (user) {
    if (!user.isActive) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    if (!user.isPhoneVerified) {
      user.isPhoneVerified = true;
      user.isVerified = true;
    }
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    if (user.role === 'hotelier' && user.hotelId) {
      await user.populate('hotelId', 'name');
    }
  } else {
    // Automatically register new customer
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    user = await User.create({
      phone: normalizedPhone,
      password: hashedPassword,
      firstName: 'User',
      lastName: normalizedPhone.slice(-4),
      role: 'customer',
      isPhoneVerified: true,
      isVerified: true,
      lastLogin: new Date(),
    });

    logger.info(`New user registered via OTP verification: ${normalizedPhone}`);
  }

  // 6. Generate Access Token & Refresh Token
  const { accessToken, refreshToken } = generateTokens(user._id, user.role);
  await saveRefreshToken(user._id, refreshToken);

  logger.info(`OTP login successful for user: ${normalizedPhone}`);

  const isHotelier = user.role === 'hotelier';
  const hotelId = user.hotelId?._id || user.hotelId || null;
  const hotelName = user.hotelId?.name || null;

  return {
    user: {
      id: user._id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || null,
      avatar: user.avatar || null,
      role: user.role,
      isPhoneVerified: user.isPhoneVerified,
      isVerified: user.isVerified,
      ...(isHotelier && {
        hotelId,
        hotelName,
      }),
    },
    accessToken,
    refreshToken,
  };
};

// // ─── OTP-Based Login ───────────────────────────────────────────────────────────

// /**
//  * Step 1: Send OTP for login. Phone must be registered.
//  */
// const sendLoginOTP = async (phone) => {
//   const normalizedPhone = phone?.trim();

//   const user = await User.findOne({ phone: normalizedPhone });
//   if (!user) {
//     throw new AppError("Phone number not registered", 404);
//   }

//   if (!user.isActive) {
//     throw new AppError("Account is deactivated. Please contact support.", 403);
//   }

//   const result = await sendOTP(normalizedPhone, OTP_PURPOSE.LOGIN);
//   if (!result.success) {
//     throw new AppError(result.message, result.statusCode || 500);
//   }

//   return { message: result.message, expiresInMs: result.expiresInMs };
// };

// /**
//  * Step 2: Verify OTP and log the user in (passwordless).
//  */
// const verifyLoginOTP = async (phone, otp) => {
//   const normalizedPhone = phone?.trim();

//   const otpResult = await verifyOTP(normalizedPhone, otp, OTP_PURPOSE.LOGIN);
//   if (!otpResult.valid) {
//     throw new AppError(otpResult.message, otpResult.statusCode || 400);
//   }

//   const user = await User.findOne({ phone: normalizedPhone });
//   if (!user) {
//     throw new AppError("User not found", 404);
//   }

//   if (!user.isActive) {
//     throw new AppError("Account is deactivated. Please contact support.", 403);
//   }

//   // Mark phone as verified if it wasn't already
//   if (!user.isPhoneVerified) {
//     user.isPhoneVerified = true;
//     await user.save({ validateBeforeSave: false });
//   }

//   const { accessToken, refreshToken } = generateTokens(user._id, user.role);

//   logger.info(`User logged in via OTP: ${normalizedPhone}`);

//   return {
//     user: {
//       id: user._id,
//       phone: user.phone,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       avatar: user.avatar,
//       role: user.role,
//     },
//     accessToken,
   
//   };
// };

// // ─── OTP-Based Forgot Password ─────────────────────────────────────────────────

// /**
//  * Step 1: Send OTP for password reset. Phone must be registered.
//  */
// const sendForgotPasswordOTP = async (phone) => {
//   const normalizedPhone = phone?.trim();

//   const user = await User.findOne({ phone: normalizedPhone });
//   if (!user) {
//     throw new AppError("Phone number not found", 404);
//   }

//   const result = await sendOTP(normalizedPhone, OTP_PURPOSE.FORGOT_PASSWORD);
//   if (!result.success) {
//     throw new AppError(result.message, result.statusCode || 500);
//   }

//   return { message: result.message, expiresInMs: result.expiresInMs };
// };

// /**
//  * Step 2: Verify OTP and generate a short-lived reset token.
//  * The user then calls POST /auth/reset-password/:token with the new password.
//  */
// const verifyForgotPasswordOTP = async (phone, otp) => {
//   const normalizedPhone = phone?.trim();

//   const otpResult = await verifyOTP(
//     normalizedPhone,
//     otp,
//     OTP_PURPOSE.FORGOT_PASSWORD,
//   );
//   if (!otpResult.valid) {
//     throw new AppError(otpResult.message, otpResult.statusCode || 400);
//   }

//   const user = await User.findOne({ phone: normalizedPhone });
//   if (!user) {
//     throw new AppError("User not found", 404);
//   }

//   // Generate a reset token (same mechanism as existing forgotPassword)
//   const resetToken = crypto.randomBytes(32).toString("hex");
//   const hashedToken = crypto
//     .createHash("sha256")
//     .update(resetToken)
//     .digest("hex");

//   user.resetPasswordToken = hashedToken;
//   user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes (shorter than email-based)
//   await user.save({ validateBeforeSave: false });

//   logger.info(`Password reset via OTP for phone: ${normalizedPhone}`);

//   return {
//     resetToken,
//     expiresAt: user.resetPasswordExpires,
//   };
// };

const getMe = async (userId) => {
  const user = await User.findById(userId)
    .select('-password -resetPasswordToken -resetPasswordExpires')
    .populate('hotelId', 'name');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 403);
  }

  return user;
};

const updateMe = async (userId, updateData = {}) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 403);
  }

  // Check email uniqueness if email is provided
  if (updateData.email) {
    const normalizedEmail = updateData.email.trim().toLowerCase();
    const existingEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
    if (existingEmail) {
      throw new AppError('Email is already registered by another user', 409);
    }
    user.email = normalizedEmail;
  }

  // Check phone uniqueness if phone is provided
  if (updateData.phone) {
    const normalizedPhone = updateData.phone.trim();
    const existingPhone = await User.findOne({ phone: normalizedPhone, _id: { $ne: userId } });
    if (existingPhone) {
      throw new AppError('Phone number is already registered by another user', 409);
    }
    user.phone = normalizedPhone;
  }

  if (updateData.firstName !== undefined) {
    user.firstName = updateData.firstName.trim();
  }

  if (updateData.lastName !== undefined) {
    user.lastName = updateData.lastName.trim();
  }

  if (updateData.avatar !== undefined) {
    const allowedAvatars = User.AVATAR_OPTIONS || [];
    if (!allowedAvatars.includes(updateData.avatar)) {
      throw new AppError('Invalid avatar selection', 400);
    }
    user.avatar = updateData.avatar;
  }

  await user.save();
  if (user.role === 'hotelier' && user.hotelId) {
    await user.populate('hotelId', 'name');
  }
  logger.info(`Customer profile updated: ${user._id}`);

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpires;
  return userObj;
};

const deleteMe = async (userId, { permanent = false } = {}) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  try {
    await logoutUser(null, userId);
  } catch (err) {
    logger.warn(`Logout cleanup during profile deletion warning: ${err.message}`);
  }

  const isPermanent = permanent === true || permanent === 'true';
  if (isPermanent) {
    await User.findByIdAndDelete(userId);
    logger.info(`Customer profile permanently deleted: ${userId}`);
    return {
      id: userId,
      deleted: true,
      permanent: true,
      message: 'Account permanently deleted successfully',
    };
  }

  user.isActive = false;
  await user.save({ validateBeforeSave: false });
  logger.info(`Customer profile deactivated (soft-deleted): ${userId}`);
  return {
    id: userId,
    deleted: true,
    permanent: false,
    message: 'Account deactivated successfully',
  };
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
  getAvatarOptions,
  sendOtpService,
  verifyOtpService,
  getMe,
  updateMe,
  deleteMe,
};


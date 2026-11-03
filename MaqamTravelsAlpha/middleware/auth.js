const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const User = require('../modules/auth/auth.model');

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

const AppError = require('../middleware/errorHandler').AppError;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error('Authentication token secrets are not configured');
}

const generateTokens = (userId, role) => {
  const payload = { id: userId, role };
  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' }); 
  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: '30d', 
    jwtid: crypto.randomUUID(),
  }); 
  return { accessToken, refreshToken }; 
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired access token', 401);
  }
};

const generateRefreshAccessToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    // console.log("decoded:\n", decoded)
    // const newAccessToken = jwt.sign({ id: decoded.id, role: decoded.role }, ACCESS_TOKEN_SECRET, { expiresIn: '60m' });
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id, decoded.role); 
    // console.log('Access token:\n', accessToken)
    return { accessToken, newRefreshToken }; 

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('refresh token is expire:', refreshToken);
    }
    throw new AppError('Invalid or expired refresh token', 401);
  }
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token missing', 401);
    }

    const token = authHeader.split(' ')[1].trim();
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.id).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!user) {
      throw new AppError('Invalid token or user not found', 401);
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const tryAuthenticate = async (req) => {
  try {
    let authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader && req.query?.token) {
      authHeader = `Bearer ${req.query.token}`;
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.split(' ')[1].trim();
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.id).select('-password -resetPasswordToken -resetPasswordExpires');
    return user || null;
  } catch (error) {
    return null;
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    const user = await tryAuthenticate(req);
    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    next();
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  generateRefreshAccessToken,
  authenticate,
  optionalAuthenticate,
  authorize,
  tryAuthenticate,
};


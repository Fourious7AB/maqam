const jwt = require("jsonwebtoken");
const authService = require("./auth.service");
const {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendForbidden,
  sendBadRequest
} = require("../../utils/apiResponse");

const User = require("./auth.model");


const isProduction = process.env.NODE_ENV === "production";
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
const clearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, avatar, role='customer' , hotelId} = req.body;

    const result = await authService.registerUser({
      email,
      password,
      firstName,
      lastName,
      phone,
      avatar,
      role, 
      hotelId
    });

    

    const { refreshToken, ...payload } = result;
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
    return sendCreated(res, result, "User registered successfully");
  } catch (error) {
    next(error);
  }
};

const getAvatarOptions = async (req, res, next) => {
  try {
    const options = authService.getAvatarOptions();
    return sendSuccess(res, {
      message: 'Avatar options retrieved successfully',
      data: options,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.loginUser({ email, password });

 
    if (!result) {
      return sendUnauthorized(res, "Invalid email or password");
    }

    // const { refreshToken, ...payload } = result;
   
    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    return sendSuccess(res, {
      message: "Login successful",
      data: result,
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const rawRefreshToken =
      req.cookies?.refreshToken ||
      req.body?.refreshToken ||
      req.body?.refresh_token ||
      req.headers["x-refresh-token"];

    if (!rawRefreshToken) {
      return sendUnauthorized(res, "Refresh token not provided");
    }

    const result = await authService.refreshAccessToken(rawRefreshToken);

    // Keep the 30-day refresh token in HttpOnly cookie
    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    return sendSuccess(res, {
      message: "Token refreshed successfully",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const rawRefreshToken =
      req.cookies?.refreshToken ||
      req.body?.refreshToken ||
      req.body?.refresh_token ||
      req.headers["x-refresh-token"];
    let userId = req.user?._id;

    if(!userId && rawRefreshToken){
      try{
        const decoded = jwt.verify(rawRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        userId = decoded.userId || decoded.id ;

      }catch(_){}  
    }

    await authService.logoutUser(rawRefreshToken, userId);

    res.clearCookie("refreshToken", clearCookieOptions);
    res.clearCookie("accessToken", clearCookieOptions);

    return sendSuccess(res, { message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const result = await authService.forgotPassword(phone);

    return sendSuccess(res, {
      message: "Password reset token generated",
      data: { resetToken: result.resetToken, expiresAt: result.expiresAt },
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const result = await authService.resetPassword(token, password);
    return sendSuccess(res, {
      message: "Password reset successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};



const sendOtpController = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return sendBadRequest(res, 'Phone number is required.');
    }

    const normalizedPhone = phone.trim();

    // Check if user already exists in DB
    const existingUser = await User.findOne({ phone: normalizedPhone });

    // If existing user is deactivated, prevent sending OTP
    if (existingUser && !existingUser.isActive) {
      return sendForbidden(res, 'Account is deactivated. Please contact support.');
    }

    // Send OTP — generate, store in Redis, log to terminal (Fast2SMS disabled)
    const result = await authService.sendOtpService(normalizedPhone);
    console.log(`[DEV] OTP for ${normalizedPhone}: ${result.otp}`);

    return sendSuccess(res, {
      message: result.message,
      data: {
        phone: result.phone,
        otp: result.otp, // Just for now testing 
        isNewUser: !existingUser,
        userExists: !!existingUser,
        expiresInSeconds: result.expiresInSeconds,
      },
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

const verifyOtpController = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return sendBadRequest(res, 'Phone and OTP are required fields.');
    }

    const result = await authService.verifyOtpService(phone, otp);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, refreshTokenCookieOptions);

    return sendSuccess(res, {
      message: 'OTP verified successfully. Login successful.',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        // token: result.accessToken, // alias for backwards compatibility
      },
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return sendUnauthorized(res, 'User is not authenticated');
    }

    const user = await authService.getMe(userId);

    const isHotelier = user.role === 'hotelier';
    const hotelId = user.hotelId?._id || user.hotelId || null;
    const hotelName = user.hotelId?.name || null;

    const userDetails = {
      id: user._id,
      phone: user.phone,
      email: user.email || null,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      isPhoneVerified: user.isPhoneVerified,
      ...(isHotelier && {
        hotelId,
        hotelName,
      }), 
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };

    return sendSuccess(res, {
      message: 'User profile retrieved successfully',
      data: {
        user: userDetails,
       
      },
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return sendUnauthorized(res, 'User is not authenticated');
    }

    const { firstName, lastName, email, phone, avatar } = req.body;
    const updatedUser = await authService.updateMe(userId, {
      firstName,
      lastName,
      email,
      phone,
      avatar,
    });

    const isHotelier = updatedUser.role === 'hotelier';
    const hotelId = updatedUser.hotelId?._id || updatedUser.hotelId || null;
    const hotelName = updatedUser.hotelId?.name || null;

    const userDetails = {
      id: updatedUser._id,
      phone: updatedUser.phone,
      email: updatedUser.email || null,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      fullName: `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim(),
      avatar: updatedUser.avatar,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      isVerified: updatedUser.isVerified,
      isPhoneVerified: updatedUser.isPhoneVerified,
      ...(isHotelier && {
        hotelId,
        hotelName,
      }),
      lastLogin: updatedUser.lastLogin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    return sendSuccess(res, {
      message: 'User profile updated successfully',
      data: {
        user: userDetails,
      },
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

const deleteMe = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return sendUnauthorized(res, 'User is not authenticated');
    }

    const permanent = req.query.permanent === 'true' || req.body?.permanent === true;
    const result = await authService.deleteMe(userId, { permanent });

    // Clear session and auth cookies
    res.clearCookie('accessToken', refreshTokenCookieOptions);
    res.clearCookie('refreshToken', refreshTokenCookieOptions);

    return sendSuccess(res, {
      message: result.message,
      data: result,
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getAvatarOptions,
  sendOtpController,
  verifyOtpController,
  getMe,
  // getMeController: getMe,
  updateMe,
  deleteMe,
};


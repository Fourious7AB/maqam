import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../admin/store/authStore';
import { toast } from 'react-toastify';
import { Phone, Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { tokenService } from '../../admin/services/tokenService';
import travellerService from '../../services/travellerService';

const isGenericPlaceholder = (val) => {
  if (!val || typeof val !== "string") return true;
  const lower = val.trim().toLowerCase();
  return (
    lower === "" ||
    lower === "user" ||
    lower === "authorized user" ||
    lower === "maqam user" ||
    lower === "customer" ||
    lower === "null" ||
    lower === "undefined" ||
    lower === "traveler" ||
    lower === "passenger" ||
    /^\+?\d+$/.test(lower)
  );
};

const extractFirstName = (raw) => {
  if (!raw) return "";
  const obj = raw?.user || raw?.data?.user || raw?.data || raw;
  if (!obj || typeof obj !== "object") return "";

  const first = obj.firstName || obj.first_name || obj.given_name;
  if (first && !isGenericPlaceholder(first)) {
    return first.trim();
  }

  const full =
    obj.fullName ||
    obj.full_name ||
    obj.name ||
    obj.displayName ||
    obj.username;
  if (full && !isGenericPlaceholder(full)) {
    const candidate = full.trim().split(" ")[0];
    if (candidate && !isGenericPlaceholder(candidate)) {
      return candidate;
    }
  }

  return "";
};

const AuthPage = ({ mode = 'login', redirectTo = '/' }) => {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp, login, loading, error, user } = useAuthStore();
  
  const [loginMode, setLoginMode] = useState('otp'); // 'otp' or 'password'
  const [otpStep, setOtpStep] = useState('phone'); // 'phone' or 'verify'
  const [countdown, setCountdown] = useState(0);
  
  const [formData, setFormData] = useState({
    phone: '',
    otp: '',
    password: '',
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(redirectTo);
    }
  }, [user, navigate, redirectTo]);

  // OTP countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle phone input change
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone: value });
  };

  // Handle OTP input change
  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData({ ...formData, otp: value });
  };

  // Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    
    if (formData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      const result = await sendOtp(formData.phone);
      toast.success('OTP sent successfully!');
      setOtpStep('verify');
      setCountdown(result.expiresInSeconds || 300);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP');
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    if (formData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      const res = await verifyOtp(formData.phone, formData.otp);
      let resolvedName = extractFirstName(res);

      if (!resolvedName) {
        try {
          const travellers = await travellerService.getAllTravellers();
          if (Array.isArray(travellers) && travellers.length > 0) {
            const cleanPhone = formData.phone.trim().replace(/\D/g, "").slice(-10);
            const match =
              (cleanPhone &&
                travellers.find(
                  (t) =>
                    t.phone &&
                    String(t.phone).replace(/\D/g, "").slice(-10) === cleanPhone,
                )) ||
              travellers.find((t) => t.isDefault) ||
              travellers[0];
            resolvedName = extractFirstName(match);
          }
        } catch {
          /* ignore */
        }
      }

      if (!resolvedName) {
        try {
          const me = await authService.getMe();
          resolvedName = extractFirstName(me);
        } catch {
          /* ignore */
        }
      }

      if (!resolvedName) {
        resolvedName =
          extractFirstName(tokenService.getUserProfile()) ||
          extractFirstName(JSON.parse(localStorage.getItem("maqam_auth_user") || "null")) ||
          extractFirstName(JSON.parse(localStorage.getItem("maqam_crm_user") || "null")) ||
          extractFirstName(JSON.parse(localStorage.getItem("user") || "null"));
      }

      if (!resolvedName) {
        try {
          const savedTravelers = JSON.parse(
            localStorage.getItem("maqam_saved_travelers") || "[]",
          );
          if (Array.isArray(savedTravelers) && savedTravelers.length > 0) {
            const cleanPhone = formData.phone.trim().replace(/\D/g, "").slice(-10);
            const match =
              (cleanPhone &&
                savedTravelers.find(
                  (t) =>
                    t.phone &&
                    String(t.phone).replace(/\D/g, "").slice(-10) === cleanPhone,
                )) ||
              savedTravelers.find((t) => t.isDefault) ||
              savedTravelers[0];
            resolvedName = extractFirstName(match);
          }
        } catch {
          /* ignore */
        }
      }

      const displayName = resolvedName ? resolvedName.trim() : "User";

      toast.dismiss();
      toast.success(`Welcome back, ${displayName}!`);
      navigate(redirectTo);
    } catch (err) {
      toast.dismiss();
      toast.error(err?.response?.data?.message || 'Invalid OTP');
    }
  };

  // Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    
    if (formData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const res = await login({ phone: formData.phone, password: formData.password });
      
      let resolvedName = extractFirstName(res);

      if (!resolvedName) {
        try {
          const travellers = await travellerService.getAllTravellers();
          if (Array.isArray(travellers) && travellers.length > 0) {
            const cleanPhone = formData.phone.trim().replace(/\D/g, "").slice(-10);
            const match =
              (cleanPhone &&
                travellers.find(
                  (t) =>
                    t.phone &&
                    String(t.phone).replace(/\D/g, "").slice(-10) === cleanPhone,
                )) ||
              travellers.find((t) => t.isDefault) ||
              travellers[0];
            resolvedName = extractFirstName(match);
          }
        } catch {
          /* ignore */
        }
      }

      if (!resolvedName) {
        try {
          const me = await authService.getMe();
          resolvedName = extractFirstName(me);
        } catch {
          /* ignore */
        }
      }

      if (!resolvedName) {
        resolvedName =
          extractFirstName(tokenService.getUserProfile()) ||
          extractFirstName(JSON.parse(localStorage.getItem("maqam_auth_user") || "null")) ||
          extractFirstName(JSON.parse(localStorage.getItem("maqam_crm_user") || "null")) ||
          extractFirstName(JSON.parse(localStorage.getItem("user") || "null"));
      }

      const displayName = resolvedName ? resolvedName.trim() : "User";

      toast.dismiss();
      toast.success(`Welcome back, ${displayName}!`);
      navigate(redirectTo);
    } catch (err) {
      toast.dismiss();
      toast.error(err?.response?.data?.message || 'Login failed');
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    try {
      const result = await sendOtp(formData.phone);
      toast.success('OTP resent successfully!');
      setCountdown(result.expiresInSeconds || 300);
      setFormData({ ...formData, otp: '' });
    } catch (err) {
      toast.error('Failed to resend OTP');
    }
  };

  // Reset to phone input
  const handleBackToPhone = () => {
    setOtpStep('phone');
    setFormData({ ...formData, otp: '' });
    setCountdown(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-blue-100 mt-1">Sign in to continue to Maqam</p>
          </div>

          {/* Body */}
          <div className="p-8">
            {/* Login Mode Tabs */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  setLoginMode('otp');
                  setOtpStep('phone');
                  setFormData({ phone: '', otp: '', password: '' });
                }}
                className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all ${
                  loginMode === 'otp'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Phone className="inline-block w-4 h-4 mr-2" />
                OTP Login
              </button>
              <button
                onClick={() => {
                  setLoginMode('password');
                  setFormData({ phone: '', otp: '', password: '' });
                }}
                className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all ${
                  loginMode === 'password'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Lock className="inline-block w-4 h-4 mr-2" />
                Password
              </button>
            </div>

            {/* OTP Login */}
            {loginMode === 'otp' && (
              <>
                {otpStep === 'phone' ? (
                  <form onSubmit={handleSendOtp}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            placeholder="Enter 10-digit phone number"
                            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            required
                            maxLength="10"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          We'll send you a 6-digit OTP
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || formData.phone.length !== 10}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          <>
                            Send OTP
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp}>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Enter OTP
                          </label>
                          <button
                            type="button"
                            onClick={handleBackToPhone}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Change Number
                          </button>
                        </div>
                        <input
                          type="text"
                          value={formData.otp}
                          onChange={handleOtpChange}
                          placeholder="6-digit OTP"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest"
                          required
                          maxLength="6"
                          autoFocus
                        />
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">
                            Sent to +91 {formData.phone}
                          </p>
                          {countdown > 0 ? (
                            <p className="text-xs text-gray-500">
                              Expires in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendOtp}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Resend OTP
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || formData.otp.length !== 6}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify & Login
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* Password Login */}
            {loginMode === 'password' && (
              <form onSubmit={handlePasswordLogin}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="Enter 10-digit phone number"
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        required
                        maxLength="10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter your password"
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        required
                        minLength="6"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        Login
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

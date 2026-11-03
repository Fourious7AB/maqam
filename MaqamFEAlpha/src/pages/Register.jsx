
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  X,
} from "lucide-react";
import Loginimage from "../assets/login.jpg";
import { useDispatch } from "react-redux";
import {
  requestLoginOtp,
  verifyLoginOtp,
  updateCurrentUserProfile,
  registerUser,
  setAuthSession,
} from "../components/reducer/AuthSlice";
import { toast } from "react-toastify";
import { authSession, normalizeUser } from "../services/authSession";
import { useAuth } from "../store/authContext";

const Register = ({
  setShowLoginPopup,
  setShowRegisterPopup,
  setShowForgetPopup,
  onSuccess,
  redirectPath,
  presentation = "page",
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const timerRef = useRef(null);
  const { isAuthenticated, loginWithToken } = useAuth();
  const wasAlreadyAuth = useRef(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      if (setShowRegisterPopup) {
        setShowRegisterPopup(false);
      } else {
        if (wasAlreadyAuth.current) {
          toast.info("You are already logged in!");
        }
        navigate("/", { replace: true });
      }
    }
  }, [isAuthenticated, navigate, setShowRegisterPopup]);

  const [step, setStep] = useState(1); // 1: Name & Phone, 2: OTP Verification
  const [formData, setFormData] = useState({
    title: "Mr",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState("");
  const [expiresIn, setExpiresIn] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startTimer = (seconds = 300) => {
    clearInterval(timerRef.current);
    setExpiresIn(seconds);
    timerRef.current = setInterval(() => {
      setExpiresIn((current) => {
        if (current <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateStep1 = () => {
    const nextErrors = {};
    if (!formData.firstName.trim()) nextErrors.firstName = "First name is required.";

    const phone = formData.phone.trim();
    if (!phone) {
      nextErrors.phone = "Mobile number is required.";
    } else if (!/^\+?[0-9]{10,15}$/.test(phone)) {
      nextErrors.phone = "Enter a valid 10–15 digit phone number.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const sendOtp = async (event) => {
    event?.preventDefault();
    if (!validateStep1()) return;

    setSubmitting(true);
    try {
      const result = await dispatch(requestLoginOtp(formData.phone.trim())).unwrap();
      const data = result?.data?.data ?? result?.data ?? {};
      setServerOtp(String(data.otp || ""));
      setStep(2);
      setShowOtpPopup(true);
      setOtp("");
      startTimer(Number(data.expiresInSeconds) || 300);
      toast.success(data.message || result?.message || "OTP sent successfully.");
    } catch (error) {
      toast.error(
        error?.data?.message || error?.message || "Unable to send OTP.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Verify OTP and Complete Registration
  const handleVerifyAndRegister = async (e) => {
    e?.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setSubmitting(true);
    try {
      const cleanPhone = formData.phone.trim();
      // 1. Verify OTP server-side: POST /api/v1/auth/verify-otp
      const result = await dispatch(
        verifyLoginOtp({
          phone: cleanPhone,
          otp: cleanOtp,
        }),
      ).unwrap();

      const data = result?.data ?? result ?? {};
      const token = data.accessToken || data.token;
      const refreshToken = data.refreshToken || data.refresh_token;
      let rawUser = data.user || data;

      if (token) authSession.setAccessToken(token);
      if (refreshToken) authSession.setRefreshToken(refreshToken);

      // 2. Persist custom name if entered in Step 1: PUT /api/v1/auth/me
      if (formData.firstName.trim() || formData.lastName.trim()) {
        try {
          const profileResult = await dispatch(
            updateCurrentUserProfile({
              firstName: formData.firstName.trim(),
              lastName: formData.lastName.trim(),
              phone: cleanPhone,
            }),
          ).unwrap();
          if (profileResult) {
            rawUser = profileResult;
          }
        } catch (profileErr) {
          console.warn("Could not save user profile names:", profileErr);
        }
      }

      const user = normalizeUser(rawUser, token);
      if (user) {
        authSession.setStoredUser(user);
        dispatch(setAuthSession({ user, token, accessToken: token, refreshToken }));
      }
      if (loginWithToken && (token || user)) {
        loginWithToken(token, user);
      }

      toast.success(`Registration complete! Welcome, ${formData.firstName || user?.name || "User"}!`);
      if (setShowRegisterPopup) setShowRegisterPopup(false);
      if (onSuccess) {
        onSuccess(result);
      } else if (redirectPath) {
        navigate(redirectPath);
      } else {
        navigate("/");
      }
    } catch (err) {
      toast.error(
        err?.data?.message || err?.message || "Registration failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const verifyAndRegister = handleVerifyAndRegister;

  const switchToLogin = () => {
    setShowRegisterPopup?.(false);
    if (setShowLoginPopup) setShowLoginPopup(true);
    else navigate("/login");
  };

  const resendDisabled = expiresIn > 0 || submitting;
  const mins = String(Math.floor(expiresIn / 60)).padStart(2, "0");
  const secs = String(expiresIn % 60).padStart(2, "0");

  const isPopup = presentation === "popup" || Boolean(setShowRegisterPopup);
  const Container = isPopup ? "div" : "main";
  const containerClass = isPopup
    ? "w-full max-w-4xl mx-auto font-poppins"
    : "min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-poppins";

  return (
    <Container className={containerClass}>
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl md:grid md:grid-cols-2">
        <div
          className="relative hidden min-h-[560px] bg-cover bg-center md:flex md:flex-col md:items-center md:justify-center p-10"
          style={{ backgroundImage: `url(${Loginimage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-teal-950/95 via-teal-900/65 to-teal-950/55" />
          <div className="relative z-10 max-w-sm text-center text-white">
            <h1 className="font-dancing text-4xl font-bold tracking-wide">MAQAM TRAVEL</h1>
            <div className="mx-auto my-4 h-0.5 w-14 rounded-full bg-teal-300/70" />
            <p className="text-sm leading-7 text-teal-50/90">
              Create your account for smoother Makkah, Madinah and travel bookings.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-11">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
              Create your account
            </h2>
            <p className="mt-1 text-center text-sm text-slate-500">
              Verify your phone number to continue.
            </p>

          {/* STEP 1 FORM: Name & Phone */}
          {step === 1 ? (
            <form onSubmit={sendOtp} className="space-y-3.5">
              {/* FIRST NAME WITH TITLE SELECTOR */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First name <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <select
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="absolute left-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-2.5 rounded-lg outline-none cursor-pointer border border-slate-300 z-10 transition"
                  >
                    <option value="Mr">Mr.</option>
                    <option value="Mrs">Mrs.</option>
                    <option value="Ms">Ms.</option>
                    <option value="Dr">Dr.</option>
                  </select>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First name"
                    autoComplete="given-name"
                    required
                    className="w-full rounded-xl border border-slate-200 py-3 pl-24 pr-4 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  />
                </div>
                {errors.firstName && <p className="mt-1 text-xs text-rose-600">{errors.firstName}</p>}
              </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Last name <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last name"
                    autoComplete="family-name"
                    className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Mobile number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={(event) =>
                        handleInputChange({
                          ...event,
                          target: { ...event.target, value: event.target.value.replace(/[^\d+]/g, "") },
                        })
                      }
                      placeholder="+919876543210"
                      inputMode="tel"
                      autoComplete="tel"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
                  {submitting ? "Sending OTP..." : "Continue with OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyAndRegister} className="mt-7 space-y-4">
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm">
                  <p className="font-semibold text-teal-900">Verify {formData.phone}</p>
                  <p className="mt-1 text-xs text-teal-700">
                    We sent a one-time code to this number.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                    OTP
                  </label>
                  <input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    placeholder="Enter OTP"
                    className="w-full rounded-xl border border-slate-200 py-3 px-4 text-center text-xl font-bold tracking-[0.3em] outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                  {submitting ? "Creating account..." : "Verify & Create Account"}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700"
                  >
                    <ArrowLeft size={13} /> Edit details
                  </button>
                  <button
                    type="button"
                    disabled={resendDisabled}
                    onClick={sendOtp}
                    className="font-semibold text-teal-700 disabled:text-slate-400"
                  >
                    {resendDisabled ? `Resend in ${mins}:${secs}` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-7 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={switchToLogin}
                className="font-semibold text-teal-700 hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>

      {showOtpPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowOtpPopup(false)}
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              aria-label="Close OTP popup"
            >
              <X size={18} />
            </button>

            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-teal-50 text-teal-700">
              <ShieldCheck size={22} />
            </div>
            <h3 className="mt-4 text-center text-xl font-bold text-slate-900">Your OTP</h3>
            <p className="mt-1 text-center text-sm text-slate-500">
              Enter the OTP sent to {formData.phone}.
            </p>

            {serverOtp && (
              <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-4 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">OTP</p>
                <p className="mt-1 text-3xl font-black tracking-[0.3em] text-teal-800">{serverOtp}</p>
              </div>
            )}

            <form onSubmit={verifyAndRegister} className="mt-5 space-y-3">
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="Enter OTP"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg font-bold tracking-[0.3em] outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Verify & Continue"}
              </button>
            </form>
          </div>
        </div>
      )}
    </Container>
  );
};

export default Register;

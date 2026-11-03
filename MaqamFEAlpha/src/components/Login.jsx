import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Phone,
  MapPin,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Loader2,
  X,
  ShieldCheck,
  Plane,
  Building2,
  Lock,
} from "lucide-react";
import { useDispatch } from "react-redux";
import {
  requestLoginOtp as sendOtp,
  verifyLoginOtp,
  fetchCurrentUser,
  updateUserProfile,
} from "../components/reducer/AuthSlice";
import { toast } from "react-toastify";
import { useAuth } from "../store/authContext";
import { tokenService } from "../admin/services/tokenService";
import travellerService from "../services/travellerService";
import Loginimage from "../assets/login.jpg";

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
  const obj =
    raw?.user ||
    raw?.data?.user ||
    raw?.traveller ||
    raw?.data?.traveller ||
    raw?.data ||
    raw;
  if (!obj || typeof obj !== "object") return "";

  const first =
    obj.firstName ||
    obj.first_name ||
    obj.given_name ||
    obj.givenName ||
    obj.passengerFirstName;
  if (first && !isGenericPlaceholder(first)) {
    return first.trim();
  }

  const full =
    obj.fullName ||
    obj.full_name ||
    obj.name ||
    obj.displayName ||
    obj.passengerName ||
    obj.username;
  if (full && !isGenericPlaceholder(full)) {
    const candidate = full.trim().split(" ")[0];
    if (candidate && !isGenericPlaceholder(candidate)) {
      return candidate;
    }
  }

  return "";
};

const Login = ({
  setShowLoginPopup,
  setShowRegisterPopup,
  isLoading = false,
  onSuccess,
  redirectPath,
  presentation = "popup",
  showNeedHelp = false,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isAuthenticated, loginWithToken } = useAuth();

  useEffect(() => {
    if (isAuthenticated && setShowLoginPopup) {
      setShowLoginPopup(false);
    }
  }, [isAuthenticated, setShowLoginPopup]);

  // Step 1 = Enter Phone, Step 2 = Enter & Verify OTP
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState("");

  const otpInputsRef = useRef([]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;

    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendTimer]);

  // Clean phone input (digits only, max 10)
  const handlePhoneChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (rawVal.length <= 10) {
      setPhone(rawVal);
    }
  };

  // Step 1: Request OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();

    const cleanPhone = phone.trim();

    if (!cleanPhone || cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setOtpLoading(true);
    setDevOtpHint("");

    try {
      const response = await dispatch(sendOtp(cleanPhone)).unwrap();
      const serverOtp =
        response?.data?.data?.otp ??
        response?.data?.otp ??
        response?.otp;

      toast.success(
        response?.message || `Verification code sent to +91 ${cleanPhone}`
      );

      if (import.meta.env.DEV && serverOtp) {
        setDevOtpHint(String(serverOtp));
      }

      setStep(2);
      setResendTimer(60);
      setOtpDigits(["", "", "", "", "", ""]);

      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    } catch (error) {
      const errorMsg =
        typeof error === "string"
          ? error
          : error?.message || "Failed to send code. Please try again.";

      toast.error(errorMsg);
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle single digit in 6-box OTP
  const handleOtpBoxChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "");

    if (!cleaned) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    if (cleaned.length > 1) {
      const digitsArr = cleaned.slice(0, 6).split("");
      const next = [...otpDigits];

      digitsArr.forEach((d, i) => {
        if (i < 6) next[i] = d;
      });

      setOtpDigits(next);
      const nextFocus = Math.min(digitsArr.length, 5);
      otpInputsRef.current[nextFocus]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = cleaned[0];
    setOtpDigits(next);

    if (index < 5 && cleaned) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;

    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((d, i) => {
      next[i] = d;
    });

    setOtpDigits(next);
    otpInputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleAutoFillOtp = () => {
    if (!devOtpHint) return;
    const digits = devOtpHint.slice(0, 6).split("");
    const next = ["", "", "", "", "", ""];
    digits.forEach((d, i) => {
      next[i] = d;
    });
    setOtpDigits(next);
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();

    const fullOtp = otpDigits.join("");

    if (fullOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    setOtpLoading(true);

    try {
      const response = await dispatch(
        verifyLoginOtp({
          phone: phone.trim(),
          otp: fullOtp,
        })
      ).unwrap();

      const receivedToken = response?.accessToken || response?.token;
      if (receivedToken) {
        tokenService.setAccessToken(receivedToken);
        if (response?.refreshToken) {
          tokenService.setRefreshToken(response.refreshToken);
        }
      }
      if (loginWithToken && (receivedToken || response?.user)) {
        loginWithToken(receivedToken, response?.user);
      }

      let resolvedName =
        extractFirstName(response) ||
        extractFirstName(tokenService.getUserProfile()) ||
        extractFirstName(
          JSON.parse(localStorage.getItem("maqam_auth_user") || "null")
        ) ||
        extractFirstName(
          JSON.parse(localStorage.getItem("maqam_crm_user") || "null")
        ) ||
        extractFirstName(
          JSON.parse(localStorage.getItem("user") || "null")
        );

      const displayName = resolvedName ? resolvedName.trim() : "Traveler";

      toast.dismiss();
      toast.success(`Welcome back, ${displayName}!`);

      if (setShowLoginPopup) {
        setShowLoginPopup(false);
      }

      if (onSuccess) {
        try {
          onSuccess(response);
        } catch (callbackErr) {
          console.error("Login onSuccess error:", callbackErr);
        }
      } else if (redirectPath) {
        navigate(redirectPath);
      } else {
        navigate("/");
      }

      // Background non-blocking profile sync
      if (!resolvedName) {
        (async () => {
          try {
            const travellers = await travellerService.getAllTravellers();
            if (Array.isArray(travellers) && travellers.length > 0) {
              const cleanUserPhone = String(phone || "")
                .replace(/\D/g, "")
                .slice(-10);
              const primary =
                travellers.find((t) => t.isDefault) ||
                travellers.find(
                  (t) =>
                    t.phone &&
                    String(t.phone).replace(/\D/g, "").slice(-10) ===
                      cleanUserPhone
                ) ||
                travellers[0];
              const tName = extractFirstName(primary);
              if (tName) {
                dispatch(
                  updateUserProfile({
                    firstName: primary.firstName,
                    lastName: primary.lastName || "",
                    name: `${primary.firstName || ""} ${
                      primary.lastName || ""
                    }`.trim(),
                  })
                );
                return;
              }
            }
            await dispatch(fetchCurrentUser()).unwrap();
          } catch {
            /* ignore background sync error */
          }
        })();
      }
    } catch (error) {
      const errorMsg =
        typeof error === "string"
          ? error
          : error?.message || "Invalid or expired code. Please try again.";

      toast.dismiss();
      toast.error(errorMsg);
    } finally {
      setOtpLoading(false);
    }
  };

  const formCard = (
    <section className="relative w-full max-w-[880px] lg:max-w-[940px] xl:max-w-[960px] mx-auto overflow-hidden rounded-[28px] sm:rounded-[32px] bg-white dark:bg-[#081813] shadow-[0_32px_90px_rgba(0,0,0,0.35)] border border-emerald-950/10 dark:border-white/10 transition-all font-poppins">
      {/* Floating Close Button */}
      {setShowLoginPopup && (
        <button
          type="button"
          onClick={() => setShowLoginPopup(false)}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition active:scale-95 cursor-pointer border border-slate-200/80 dark:border-white/10 shadow-xs"
          aria-label="Close"
        >
          <X size={17} />
        </button>
      )}

      <div className="grid md:grid-cols-[0.9fr_1.1fr]">
        {/* Left Side: Brand & Visual Atmosphere */}
        <aside
          className="relative hidden md:flex flex-col justify-between p-8 lg:p-9 overflow-hidden bg-cover bg-center min-h-[520px]"
          style={{ backgroundImage: `url(${Loginimage})` }}
          aria-label="Maqam Travel Experience"
        >
          {/* Luxury emerald gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#021811]/95 via-[#04281d]/80 to-[#021811]/60 pointer-events-none" />

          {/* Top Brand Logo & Pill */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-white text-lg">MAQAM</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Travels</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 text-[11px] font-medium text-emerald-200 backdrop-blur-xs">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Verified Portal</span>
            </div>
          </div>

          {/* Middle Value Highlights */}
          <div className="relative z-10 space-y-4 my-auto py-6">
            <h2 className="text-2xl lg:text-[28px] font-black text-white leading-tight tracking-tight">
              Begin your sacred journey with peace of mind.
            </h2>
            <p className="text-xs lg:text-[13px] text-emerald-100/80 leading-relaxed max-w-[340px]">
              Access your personalized Umrah packages, flight tickets, and confirmed Makkah & Madinah hotel stays in one place.
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-white/90">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Plane size={13} />
                </div>
                <span className="font-medium">Direct Umrah & Hajj Flight Bookings</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-white/90">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Building2 size={13} />
                </div>
                <span className="font-medium">Handpicked Luxury Haram-View Hotels</span>
              </div>
            </div>
          </div>

          {/* Bottom Trust Badge */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200/80">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Makkah &amp; Madinah Ready
            </span>
            <span>24/7 Pilgrim Support</span>
          </div>
        </aside>

        {/* Right Side: High-End Auth Form */}
        <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12 bg-white dark:bg-[#081813]">
          <div className="mx-auto w-full max-w-[380px] lg:max-w-[400px]">
            {step === 1 ? (
              /* STEP 1: Phone Number Input */
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tracking-wide uppercase mb-3 border border-emerald-200/60 dark:border-emerald-800/40">
                    <Lock size={12} />
                    <span>Secure Sign In</span>
                  </div>
                  <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 dark:text-white leading-[1.25]">
                    Welcome to Maqam
                  </h1>
                  <p className="mt-2 text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Enter your 10-digit mobile number. We’ll send an instant verification code to sign you in.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="maqam-phone-input"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                  >
                    Mobile Number
                  </label>
                  <div className="flex h-[52px] sm:h-[54px] items-center overflow-hidden rounded-2xl border border-slate-300/80 dark:border-white/15 bg-slate-50/70 dark:bg-white/5 px-3.5 transition-all focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-white/10 focus-within:ring-4 focus-within:ring-emerald-500/15 shadow-2xs">
                    <span
                      className="flex h-7 shrink-0 items-center gap-1.5 border-r border-slate-300/80 dark:border-white/20 pr-3 text-xs sm:text-[13px] font-bold text-slate-700 dark:text-emerald-300 select-none"
                      aria-label="Country code India +91"
                    >
                      <span aria-hidden="true">🇮🇳</span>
                      <span>+91</span>
                    </span>
                    <input
                      id="maqam-phone-input"
                      type="tel"
                      name="phone"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="98765 43210"
                      autoComplete="tel-national"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      aria-describedby="maqam-phone-help"
                      className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm sm:text-base font-semibold tracking-wide text-slate-900 dark:text-white outline-none placeholder:text-slate-400 placeholder:font-normal"
                    />
                    <Phone
                      aria-hidden="true"
                      size={18}
                      className="shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <p
                    id="maqam-phone-help"
                    className="text-[11px] text-slate-400 dark:text-slate-500 px-0.5"
                  >
                    Enter your WhatsApp or SMS enabled mobile number
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={phone.length !== 10 || otpLoading}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-[15px] shadow-[0_10px_25px_rgba(5,150,105,0.3)] hover:shadow-[0_14px_30px_rgba(5,150,105,0.38)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {otpLoading ? (
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </>
                  )}
                </button>

                <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2">
                  <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 text-center">
                    By continuing, you agree to Maqam’s{" "}
                    <Link
                      to="/terms"
                      className="font-semibold text-emerald-700 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-800"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy-policy"
                      className="font-semibold text-emerald-700 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-800"
                    >
                      Privacy Policy
                    </Link>.
                  </p>
                  <div className="flex items-center justify-center pt-1 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Need assistance? </span>
                    <Link
                      to="/booking-help"
                      className="ml-1.5 font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Contact Support
                    </Link>
                  </div>
                </div>
              </form>
            ) : (
              /* STEP 2: 6-Digit OTP Verification */
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition cursor-pointer"
                  >
                    <ArrowLeft size={15} aria-hidden="true" /> Change number (+91 {phone})
                  </button>
                  <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 dark:text-white leading-[1.25]">
                    Verify Code
                  </h1>
                  <p className="mt-1.5 text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    We’ve sent a 6-digit one-time code to{" "}
                    <strong className="font-bold text-slate-900 dark:text-white">
                      +91 {phone}
                    </strong>
                  </p>
                </div>

                {devOtpHint && import.meta.env.DEV && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300/80 bg-emerald-50/90 dark:bg-emerald-950/60 p-2.5 text-xs text-emerald-950 dark:text-emerald-200 shadow-2xs">
                    <span>
                      Test Code:{" "}
                      <strong className="font-mono tracking-wider font-bold">
                        {devOtpHint}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoFillOtp}
                      className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-2.5 py-1 text-xs font-bold text-white transition active:scale-95 cursor-pointer"
                    >
                      Auto-fill
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Enter 6-Digit Code
                  </label>
                  <div
                    className="grid grid-cols-6 gap-2 sm:gap-2.5"
                    onPaste={handleOtpPaste}
                  >
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          otpInputsRef.current[index] = element;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={digit}
                        aria-label={`Digit ${index + 1} of 6`}
                        onChange={(event) =>
                          handleOtpBoxChange(index, event.target.value)
                        }
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        className={`h-12 sm:h-14 min-w-0 rounded-2xl border text-center text-lg sm:text-xl font-black outline-none transition-all ${
                          digit
                            ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                            : "border-slate-300/80 dark:border-white/20 bg-slate-50/60 dark:bg-white/5 text-slate-900 dark:text-white focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Didn’t receive code?</span>
                  {resendTimer > 0 ? (
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      Resend in <strong className="text-emerald-700 dark:text-emerald-400">{resendTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                      className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw size={13} className="inline" aria-hidden="true" />
                      <span>Resend Code</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={otpDigits.join("").length !== 6 || otpLoading}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-[15px] shadow-[0_10px_25px_rgba(5,150,105,0.3)] hover:shadow-[0_14px_30px_rgba(5,150,105,0.38)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {otpLoading ? (
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <>
                      <span>Verify &amp; Continue</span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  if (presentation === "page") {
    return (
      <main className="w-full font-poppins text-slate-900">
        {showNeedHelp && (
          <header className="mb-3.5 flex items-center justify-end px-1">
            <Link
              to="/booking-help"
              onClick={() => setShowLoginPopup?.(false)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20 text-xs font-semibold shadow-xs transition active:scale-95 backdrop-blur-xs"
            >
              <span>Need help?</span>
            </Link>
          </header>
        )}
        {formCard}
      </main>
    );
  }

  return <div className="w-full font-poppins text-slate-900">{formCard}</div>;
};

export default Login;
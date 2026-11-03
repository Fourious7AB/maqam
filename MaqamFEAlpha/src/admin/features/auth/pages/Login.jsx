import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Phone,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import Button from '../../../components/common/Button';
import { authApi } from '../authApi';
import { useAuthStore } from '../../../store/authStore';

const normalisePhone = (value) => value.replace(/\D/g, '').slice(0, 10);

export default function Login() {
  const { accessToken, user, setSession } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [otpVisible, setOtpVisible] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(location.state?.error || '');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  if (accessToken && user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const startCountdown = (seconds) => {
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

  const sendOtp = async (event) => {
    event.preventDefault();
    setError('');

    const cleanPhone = normalisePhone(phone);
    if (!/^\d{10}$/.test(cleanPhone)) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }

    try {
      setLoading(true);
      const result = await authApi.sendOtp(cleanPhone);

      // Development-only display: the backend explicitly returns `data.otp`.
      // Do not persist this OTP in localStorage/sessionStorage.
      if (!result?.otp) {
        throw new Error('OTP was not returned by the backend.');
      }

      setPhone(cleanPhone);
      setDevOtp(String(result.otp));
      setOtp('');
      setOtpVisible(true);
      startCountdown(Number(result.expiresInSeconds) || 300);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event?.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit OTP.');
      return;
    }

    try {
      setVerifying(true);
      const result = await authApi.verifyOtp({
        phone,
        otp,
        purpose: 'login',
      });

      const data = result?.data?.data ?? result?.data ?? {};
      const token = data.accessToken ?? data.token;
      const verified =
        data.verified ??
        data.isVerified ??
        result?.verified ??
        Boolean(token);

      if (!verified) {
        throw new Error(result?.message || data?.message || 'Invalid or expired OTP.');
      }

      if (!token) {
        throw new Error('OTP verified, but the backend did not return an access token.');
      }

      // Refresh token is set by the backend as an HttpOnly cookie.
      const nextUser = setSession(token, data.user ?? data);

      if (nextUser?.role === 'hotelier') {
        setOtpVisible(false);
        setDevOtp('');
        clearInterval(timerRef.current);
        navigate('/hotelier', { replace: true });
        return;
      }

      const allowedRoles = ['admin', 'super_admin'];
      if (!allowedRoles.includes(nextUser?.role)) {
        useAuthStore.getState().clearLocalSession();
        throw new Error('This account does not have administrator access.');
      }

      setOtpVisible(false);
      setDevOtp('');
      clearInterval(timerRef.current);
      navigate(location.state?.from || '/admin/dashboard', { replace: true });

    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to verify OTP.');
    } finally {
      setVerifying(false);
    }
  };

  const resendOtp = async () => {
    if (loading || !/^\d{10}$/.test(phone)) return;
    setError('');
    try {
      setLoading(true);
      const result = await authApi.sendOtp(phone);
      if (!result?.otp) throw new Error('OTP was not returned by the backend.');
      setDevOtp(String(result.otp));
      setOtp('');
      startCountdown(Number(result.expiresInSeconds) || 300);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid lg:grid-cols-[1.05fr_.95fr]">
        <div className="hidden bg-emerald-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-lg font-black text-emerald-900">M</div>
              <div><p className="text-lg font-extrabold">Maqam</p><p className="text-xs text-emerald-200">Travel CRM</p></div>
            </div>
            <div className="mt-24 max-w-md">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Admin Console</p>
              <h1 className="mt-3 text-4xl font-black leading-tight">Secure admin access with phone OTP verification.</h1>
              <p className="mt-5 text-sm leading-6 text-emerald-100">Enter your registered phone number. During development, the OTP returned by the backend is shown in a popup for testing.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-200"><ShieldCheck size={15}/> Admin-only workspace</div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-8 lg:hidden"><p className="text-xl font-black text-emerald-800">Maqam</p><p className="text-xs text-slate-400">Admin Console</p></div>
            <h2 className="text-2xl font-extrabold">Admin sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Use your registered phone number to receive a one-time password.</p>

            {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}

            <form onSubmit={sendOtp} className="mt-7 space-y-5">
              <label className="block text-sm font-medium">
                Phone number
                <div className="relative mt-1.5">
                  <Phone size={17} className="absolute left-3 top-3 text-slate-400"/>
                  <span className="absolute left-9 top-2.5 border-r border-slate-200 pr-2 text-sm text-slate-500">+91</span>
                  <input
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(normalisePhone(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 py-2.75 pl-20 pr-3 text-sm outline-none focus:border-emerald-500"
                    placeholder="9876543210"
                  />
                </div>
              </label>

              {/* Kept hidden from the normal flow. This is only here so older
                  browser autofill/password managers do not break the page. */}
              <div className="hidden" aria-hidden="true">
                <LockKeyhole size={17}/>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} tabIndex={-1}/>
                <button type="button" onClick={() => setShowPassword((v) => !v)}><Eye size={17}/></button>
              </div>

              <Button type="submit" loading={loading} className="w-full py-3">Send OTP</Button>
            </form>

            <p className="mt-5 text-xs text-slate-400">Development mode: the OTP returned by the API is displayed only in the verification popup and is not persisted.</p>
          </div>
        </div>
      </div>

      {otpVisible && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">DEVELOPMENT OTP</div>
                <h3 className="text-2xl font-black text-slate-900">Verify your phone</h3>
                <p className="mt-1 text-sm text-slate-500">OTP sent to +91 {phone}</p>
              </div>
              <button type="button" onClick={() => setOtpVisible(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={20}/></button>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">OTP from backend response</p>
              <p className="mt-2 select-all text-4xl font-black tracking-[0.35em] text-emerald-900">{devOtp}</p>
              <p className="mt-2 text-xs text-emerald-700">{expiresIn > 0 ? `Expires in ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, '0')}` : 'OTP expired — resend a new OTP.'}</p>
            </div>

            <form onSubmit={verifyOtp} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Enter OTP
                <input
                  autoFocus
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:border-emerald-500"
                  placeholder="••••••"
                />
              </label>
              <Button type="submit" loading={verifying} disabled={expiresIn === 0} className="w-full py-3">Verify & Continue</Button>
            </form>

            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <button type="button" onClick={() => { setOtpVisible(false); setOtp(''); }} className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={15}/> Change number</button>
              <button type="button" disabled={loading || expiresIn > 0} onClick={resendOtp} className="inline-flex items-center gap-1 font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw size={15}/> Resend OTP</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import Button from '../../../components/common/Button';
import { useAuthStore } from '../../../store/authStore';
import logo from '../../../../assets/logo.png';
import './VerifyOTP.css';

const PHONE_KEY = 'maqam_admin_otp_phone';
const OTP_LENGTH = 6;
const DEFAULT_EXPIRY_SECONDS = 300;

const maskPhone = (phone) => {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone) return 'your registered number';
  if (cleanPhone.length < 5) return `+91 ${cleanPhone}`;
  return `+91 ${cleanPhone.slice(0, 3)}******${cleanPhone.slice(-2)}`;
};

const formatExpiry = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef([]);
  const [digits, setDigits] = useState(() => Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState(() => (
    Math.max(
      0,
      Number(location.state?.expiresInSeconds) || DEFAULT_EXPIRY_SECONDS,
    )
  ));

  const otp = digits.join('');
  const { verifyOtp, sendOtp } = useAuthStore();
  const phone = location.state?.phone || sessionStorage.getItem(PHONE_KEY) || '';

  useEffect(() => {
    if (location.state?.phone) sessionStorage.setItem(PHONE_KEY, location.state.phone);
  }, [location.state?.phone]);

  useEffect(() => {
    if (expiresIn <= 0) return undefined;
    const timer = setTimeout(() => setExpiresIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [expiresIn]);

  const setDigit = (index, value) => {
    const cleanValue = value.replace(/\D/g, '');
    setDigits((current) => {
      const next = [...current];
      if (!cleanValue) {
        next[index] = '';
        return next;
      }

      let cursor = index;
      cleanValue.split('').forEach((character) => {
        if (cursor < OTP_LENGTH) {
          next[cursor] = character;
          cursor += 1;
        }
      });
      return next;
    });
    setError('');

    if (cleanValue) {
      inputRefs.current[Math.min(index + cleanValue.length, OTP_LENGTH - 1)]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((current) => current.map((value, itemIndex) => (
        itemIndex === index - 1 ? '' : value
      )));
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    setDigits((current) => {
      const next = [...current];
      pasted.split('').forEach((character, index) => {
        next[index] = character;
      });
      return next;
    });
    setError('');
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit OTP sent to the registered number.');
      inputRefs.current[digits.findIndex((digit) => !digit)]?.focus();
      return;
    }

    if (!phone) {
      setError('Phone number missing. Please go back and request a new OTP.');
      return;
    }

    try {
      setLoading(true);
      const loggedIn = await verifyOtp(phone, otp);
      sessionStorage.removeItem(PHONE_KEY);
      navigate(loggedIn?.role === 'hotelier' ? '/hotelier' : '/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to verify OTP.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewOtp = async () => {
    if (!phone) {
      navigate('/admin/administrators/login', { replace: true });
      return;
    }
    try {
      setLoading(true);
      setError('');
      const result = await sendOtp(phone);
      setExpiresIn(Number(result?.expiresInSeconds) || DEFAULT_EXPIRY_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-verify-page">
      <div className="admin-verify-shell">
        <section className="admin-verify-context" aria-label="Admin access information">
          <div>
            <div className="admin-verify-brand">
              <img src={logo} alt="Maqam logo" />
              <div>
                <strong>MAQAM</strong>
                <span>Travel CRM · Admin Console</span>
              </div>
            </div>

            <div className="admin-verify-context-copy">
              <p className="admin-verify-kicker">Secure access · staff only</p>
              <h1>One-time access for authorized staff.</h1>
              <p>
                Use the code sent to your registered phone to enter the admin workspace.
                Your verification is never stored in the browser.
              </p>
            </div>
          </div>

          <div className="admin-verify-trust">
            <ShieldCheck size={18} aria-hidden="true" />
            <div>
              <strong>Protected admin area</strong>
              <span>Access is limited to approved Maqam staff accounts.</span>
            </div>
          </div>
        </section>

        <section className="admin-verify-card" aria-labelledby="verify-otp-title">
          <div className="admin-verify-step-label">Step 2 of 3 · Code verification</div>
          <h2 id="verify-otp-title">Verify your phone</h2>
          <p className="admin-verify-intro">
            Enter the six-digit code sent to your registered number.
          </p>

          <div className="admin-verify-phone" aria-live="polite">
            <div>
              <span>Code sent to</span>
              <strong>{maskPhone(phone)}</strong>
            </div>
            <ShieldCheck size={20} aria-hidden="true" />
          </div>

          <form onSubmit={submit} noValidate>
            <fieldset className="admin-verify-fieldset">
              <legend>One-time password</legend>
              <div className="admin-verify-otp" role="group" aria-label="Six digit OTP">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength="1"
                    value={digit}
                    onChange={(event) => setDigit(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onPaste={handlePaste}
                    aria-label={`OTP digit ${index + 1}`}
                    aria-invalid={Boolean(error)}
                    required
                  />
                ))}
              </div>
            </fieldset>

            <div className="admin-verify-meta">
              <span>
                {expiresIn > 0 ? `Expires in ${formatExpiry(expiresIn)}` : 'OTP expired'}
              </span>
              <button
                type="button"
                className="admin-verify-resend"
                onClick={handleRequestNewOtp}
                disabled={expiresIn > 0}
              >
                <RefreshCw size={14} aria-hidden="true" />
                {expiresIn > 0 ? 'Resend after expiry' : 'Request new OTP'}
              </button>
            </div>

            <Button type="submit" loading={loading} className="admin-verify-submit">
              <CheckCircle2 size={17} aria-hidden="true" />
              Verify &amp; Continue
            </Button>

            {error && (
              <p className="admin-verify-error" role="alert" aria-live="assertive">
                {error}
              </p>
            )}

            <button
              type="button"
              className="admin-verify-change"
              onClick={() => navigate('/administrators/login')}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Change number
            </button>
          </form>

          <div className="admin-verify-steps" aria-label="Login progress">
            <div className="done">
              <span>01 · Done</span>
              <strong>Enter phone</strong>
            </div>
            <div className="current">
              <span>02 · Current</span>
              <strong>Verify code</strong>
            </div>
            <div>
              <span>03 · Next</span>
              <strong>Admin dashboard</strong>
            </div>
          </div>

          <footer className="admin-verify-footer">
            <span>Protected admin area</span>
            <span>Authorized personnel only</span>
          </footer>
        </section>
      </div>
    </main>
  );
}

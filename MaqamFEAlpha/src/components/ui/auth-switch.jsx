import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Smartphone } from 'lucide-react';
import './auth-switch.css';

const OTP_LENGTH = 6;

function BrandMark({ logo, name, caption }) {
  return (
    <div className="asw-brand-row">
      {logo ? (
        <img className="asw-brand-logo" src={logo} alt={`${name} logo`} />
      ) : (
        <div className="asw-brand-fallback" aria-hidden="true">
          {name.slice(0, 1)}
        </div>
      )}
      <div>
        <div className="asw-brand-name">{name}</div>
        <div className="asw-brand-caption">{caption}</div>
      </div>
    </div>
  );
}

// Sliding-panel auth card inspired by the 21st.dev "Auth Switch" reference.
// Authentication remains prop-driven so this component owns only presentational
// state: the selected method, OTP step, input values, and transient feedback.
export function AuthSwitch({
  onSendOtp,
  onVerifyOtp,
  onPasswordLogin,
  onForgotPassword,
  brandLogo,
  brandName = 'MAQAM',
  brandCaption = 'Travel CRM · Administrators',
}) {
  const [method, setMethod] = useState('otp'); // 'otp' | 'password'
  const [otpStage, setOtpStage] = useState('phone'); // 'phone' | 'verify'
  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(null); // 'send' | 'verify' | 'resend' | 'password'
  const [error, setError] = useState('');
  const inputsRef = useRef([]);

  const phoneValid = phone.length === 10;
  const identifierIsEmail = identifier.includes('@');
  const identifierValid = identifierIsEmail
    ? /^\S+@\S+\.\S+$/.test(identifier)
    : /^\d{10}$/.test(identifier);
  const otp = digits.join('');
  const otpComplete = otp.length === OTP_LENGTH;

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const otpExpiryFrom = (result) =>
    Math.max(1, Number(result?.expiresInSeconds) || 30);

  const switchMethod = (next) => {
    if (next === method) return;
    setMethod(next);
    setOtpStage('phone');
    setError('');
  };

  const backToPhone = () => {
    setOtpStage('phone');
    setDigits(Array(OTP_LENGTH).fill(''));
    setResendIn(0);
    setError('');
  };

  const handlePhoneChange = (event) => {
    setPhone(event.target.value.replace(/\D/g, '').slice(0, 10));
    setError('');
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    if (!phoneValid || busy) return;

    setBusy('send');
    setError('');
    try {
      const result = await onSendOtp?.(phone);
      setOtpStage('verify');
      setDigits(Array(OTP_LENGTH).fill(''));
      setResendIn(otpExpiryFrom(result));
      requestAnimationFrame(() => inputsRef.current[0]?.focus());
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Unable to send OTP. Please check your mobile number and try again.',
      );
    } finally {
      setBusy(null);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || busy) return;

    setBusy('resend');
    setError('');
    try {
      const result = await onSendOtp?.(phone);
      setDigits(Array(OTP_LENGTH).fill(''));
      setResendIn(otpExpiryFrom(result));
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to resend OTP. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const setDigit = (index, value) => {
    const clean = value.replace(/\D/g, '');
    setDigits((current) => {
      const next = [...current];
      if (!clean) {
        next[index] = '';
        return next;
      }

      let cursor = index;
      for (const character of clean) {
        if (cursor >= OTP_LENGTH) break;
        next[cursor] = character;
        cursor += 1;
      }
      return next;
    });

    if (clean) {
      const focusIndex = Math.min(index + clean.length, OTP_LENGTH - 1);
      requestAnimationFrame(() => inputsRef.current[focusIndex]?.focus());
    }
    setError('');
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        event.preventDefault();
        setDigits((current) => current.map((value, itemIndex) => (
          itemIndex === index - 1 ? '' : value
        )));
        inputsRef.current[index - 1]?.focus();
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pasted = (event.clipboardData.getData('text') || '')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    setDigits((current) => {
      const next = [...current];
      pasted.split('').forEach((character, index) => {
        next[index] = character;
      });
      return next;
    });

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    requestAnimationFrame(() => inputsRef.current[focusIndex]?.focus());
    setError('');
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!otpComplete || busy) return;

    setBusy('verify');
    setError('');
    try {
      await onVerifyOtp?.(phone, otp);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Invalid OTP. Please check the code and try again.',
      );
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    } finally {
      setBusy(null);
    }
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    if (!identifierValid || password.length < 6 || busy) return;

    setBusy('password');
    setError('');
    try {
      await onPasswordLogin?.(identifier, password);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Login failed. Please check your credentials and try again.',
      );
    } finally {
      setBusy(null);
    }
  };

  const resendLabel =
    resendIn >= 60
      ? `Resend OTP in ${Math.floor(resendIn / 60)}:${String(resendIn % 60).padStart(2, '0')}`
      : `Resend OTP in ${resendIn}s`;

  return (
    <div className={`asw-container${method === 'password' ? ' asw-signup-mode' : ''}`}>
      <div className="asw-signin-signup">
        {/* Primary authentication path: OTP-first admin access. */}
        <form
          className="asw-form asw-form-signin"
          onSubmit={otpStage === 'phone' ? handleSendOtp : handleVerify}
          noValidate
          aria-labelledby="asw-otp-title"
        >
          <BrandMark logo={brandLogo} name={brandName} caption={brandCaption} />
          <div className="asw-form-kicker">Protected administrators area</div>
          <h2 id="asw-otp-title" className="asw-title">
            {otpStage === 'phone' ? 'Administrators sign in' : 'Verify your phone'}
          </h2>
          <p className="asw-subtitle">
            {otpStage === 'phone'
              ? 'Use your registered phone number to receive a one-time password.'
              : 'Enter the 6-digit code we sent to your registered phone number.'}
          </p>

          {otpStage === 'phone' ? (
            <>
              <label className="asw-field-label" htmlFor="asw-phone">
                Phone number
              </label>
              <div className="asw-input-field">
                <span className="asw-input-icon" aria-hidden="true">
                  <Smartphone size={18} />
                </span>
                <span className="asw-phone-prefix">+91</span>
                <input
                  id="asw-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="9876543210"
                  maxLength="10"
                  aria-describedby="asw-phone-help"
                  aria-invalid={Boolean(error)}
                  required
                />
              </div>
              <p id="asw-phone-help" className="asw-helper">
                A 6-digit OTP will be sent to this number.
              </p>
            </>
          ) : (
            <>
              <fieldset className="asw-otp-fieldset">
                <legend className="asw-field-label">One-time password</legend>
                <div className="asw-input-field asw-otp-field" role="group" aria-label="Six digit OTP">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        inputsRef.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      aria-label={`OTP digit ${index + 1}`}
                      value={digit}
                      onChange={(event) => setDigit(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={handleOtpPaste}
                      maxLength="1"
                      className="asw-otp-box"
                      required
                    />
                  ))}
                </div>
              </fieldset>
              <div className="asw-row">
                <span>Sent to +91 {phone}</span>
                {resendIn > 0 ? (
                  <span className="asw-countdown" aria-live="polite">
                    {resendLabel}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="asw-link"
                    onClick={handleResend}
                    disabled={busy === 'resend'}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </>
          )}

          <button
            type="submit"
            className="asw-btn"
            disabled={Boolean(busy) || (otpStage === 'phone' ? !phoneValid : !otpComplete)}
            aria-busy={Boolean(busy)}
          >
            {busy && <Loader2 size={16} className="asw-spinner" aria-hidden="true" />}
            {otpStage === 'phone'
              ? busy === 'send' ? 'Sending…' : 'Send OTP'
              : busy === 'verify' ? 'Verifying…' : 'Verify & Continue'}
            {!busy && <span aria-hidden="true">→</span>}
          </button>

          {otpStage === 'phone' && (
            <div className="asw-dev-note">
              <strong>Development mode:</strong> verification stays in this flow and OTP values are never persisted in the browser.
            </div>
          )}

          {otpStage === 'verify' && (
            <button type="button" className="asw-link asw-change-link" onClick={backToPhone}>
              ← Change mobile number
            </button>
          )}

          {error && (
            <p className="asw-error" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
        </form>

        {/* Secondary authentication path: password login slides into focus. */}
        <form
          className="asw-form asw-form-signup"
          onSubmit={handlePasswordLogin}
          noValidate
          aria-labelledby="asw-password-title"
        >
          <BrandMark logo={brandLogo} name={brandName} caption={brandCaption} />
          <div className="asw-form-kicker">Protected administrators area</div>
          <h2 id="asw-password-title" className="asw-title">Login with mobile &amp; password</h2>
          <p className="asw-subtitle">Use your registered mobile number or email and account password.</p>

          <label className="asw-field-label" htmlFor="asw-identifier">
            Mobile number or email
          </label>
          <div className="asw-input-field">
            <span className="asw-input-icon" aria-hidden="true">
              <Smartphone size={18} />
            </span>
            <input
              id="asw-identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                setError('');
              }}
              placeholder="Mobile number or email"
              aria-invalid={Boolean(error)}
              required
            />
          </div>

          <label className="asw-field-label" htmlFor="asw-password">
            Password
          </label>
          <div className="asw-input-field asw-has-eye">
            <span className="asw-input-icon" aria-hidden="true">
              <Lock size={18} />
            </span>
            <input
              id="asw-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              placeholder="Password"
              aria-invalid={Boolean(error)}
              required
              minLength="6"
            />
            <button
              type="button"
              className="asw-eye"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            className="asw-btn"
            disabled={Boolean(busy) || !identifierValid || password.length < 6}
            aria-busy={busy === 'password'}
          >
            {busy === 'password' && <Loader2 size={16} className="asw-spinner" aria-hidden="true" />}
            {busy === 'password' ? 'Signing in…' : 'Sign in'}
            {busy !== 'password' && <span aria-hidden="true">→</span>}
          </button>

          <button type="button" className="asw-link asw-forgot" onClick={onForgotPassword}>
            Forgot password?
          </button>

          {error && (
            <p className="asw-error" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
        </form>
      </div>

      {/* Sliding side panels provide the method switch, as in the reference. */}
      <div className="asw-panels" aria-hidden="false">
        <div className="asw-panel asw-left-panel">
          <div className="asw-panel-content">
            <p className="asw-panel-kicker">Alternative access</p>
            <h3>Have your password?</h3>
            <p>Sign in with your registered phone number or email and password instead.</p>
            <button type="button" className="asw-btn asw-btn-transparent" onClick={() => switchMethod('password')}>
              Password
            </button>
            <span className="asw-panel-hint">↗ Switch to password</span>
          </div>
        </div>

        <div className="asw-panel asw-right-panel">
          <div className="asw-panel-content">
            <p className="asw-panel-kicker">Alternative access</p>
            <h3>Prefer OTP?</h3>
            <p>Get a one-time password on your phone, no password needed.</p>
            <button type="button" className="asw-btn asw-btn-transparent" onClick={() => switchMethod('otp')}>
              Login with OTP
            </button>
            <span className="asw-panel-hint">↗ Switch to OTP</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthSwitch;

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AuthSwitch from '../../components/ui/auth-switch';
import logo from '../../assets/logo.png';
import { useAuthStore } from '../store/authStore';
import LumaSpin from '../../components/ui/LumaSpin';
import './AdminLogin.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp, login, user, initialized, loading, initialize, authStatus } = useAuthStore();

  // Hotelier accounts get the green self-service dashboard; admin roles go
  // to the Admin CRM (which enforces its own role gate).
  const routeFor = (u) => (u?.role === 'hotelier' ? '/hotelier' : '/admin/dashboard');

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  useEffect(() => {
    if (user && authStatus === 'AUTHENTICATED') {
      navigate(routeFor(user), { replace: true });
    }
  }, [user, authStatus, navigate]);

  // While checking existing session on initial load, avoid flashing the login form (Section 3)
  if (!initialized || loading || authStatus === 'AUTHENTICATING') {
    return (
      <main className="admin-auth-page grid min-h-screen place-items-center bg-[#070d1e]">
        <LumaSpin
          size="lg"
          variant="emerald"
          showProgress={true}
          text="Wait user, we are loading your page..."
          subtext="Verifying administrator session…"
        />
      </main>
    );
  }

  // Already authenticated, waiting for navigate()
  if (user && authStatus === 'AUTHENTICATED') {
    return null;
  }

  const handleSendOtp = async (phone) => {
    const result = await sendOtp(phone);
    toast.success('OTP sent successfully. Check your phone.');
    return result;
  };

  const handleVerifyOtp = async (phone, otp) => {
    // Role validation remains in ProtectedRoute after authentication.
    const loggedIn = await verifyOtp(phone, otp);
    toast.success('Welcome back.');
    navigate(routeFor(loggedIn));
  };

  const handlePasswordLogin = async (identifier, password) => {
    const credentials = identifier.includes('@')
      ? { email: identifier, password }
      : { phone: identifier, password };
    const loggedIn = await login(credentials);
    toast.success('Welcome back.');
    navigate(routeFor(loggedIn));
  };

  const handleForgotPassword = () => {
    toast.info('Password resets are handled by support. Contact support@maqam.com.');
  };

  return (
    <main className="admin-auth-page">
      <div className="admin-auth-frame">
        <AuthSwitch
          brandLogo={logo}
          brandName="MAQAM"
          brandCaption="Travel CRM · Administrators"
          onSendOtp={handleSendOtp}
          onVerifyOtp={handleVerifyOtp}
          onPasswordLogin={handlePasswordLogin}
          onForgotPassword={handleForgotPassword}
        />
        <footer className="admin-auth-footer">
          <span>
            <strong>Protected administrators area.</strong> Authorized personnel only.
          </span>
          <span>Successful verification routes to the administrators dashboard.</span>
        </footer>
      </div>
    </main>
  );
};

export default AdminLogin;

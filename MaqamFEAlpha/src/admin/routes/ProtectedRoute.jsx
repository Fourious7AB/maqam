import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuthStore } from '../store/authStore';
import { tokenService } from '../services/tokenService';

export default function ProtectedRoute() {
  const { accessToken, user, loading, initialized, initialize, logout, authStatus } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  useEffect(() => {
    if (initialized && !loading && user) {
      if (user.role === 'hotelier') {
        navigate('/hotelier', { replace: true });
      }
    }
  }, [initialized, loading, user, navigate]);

  // Never redirect while initial boot check or silent handshake is running (AUTHENTICATING)
  if (!initialized || loading || authStatus === 'AUTHENTICATING') return <LoadingSpinner fullScreen />;

  const hasSession = Boolean(user && (accessToken || tokenService.getRefreshToken() || tokenService.getAccessToken()));
  if (authStatus === 'UNAUTHENTICATED' || !hasSession) {
    return <Navigate to="/admin/administrators/login" replace state={{ from: location.pathname }} />;
  }

  // Gracefully route hotelier to hotelier dashboard
  if (user.role === 'hotelier') {
    return <Navigate to="/hotelier" replace />;
  }

  // Only allow admin and super_admin roles to access admin CRM
  const allowedRoles = ['admin', 'super_admin'];

  // If user role is not allowed, show Access Denied view without silently wiping cookies
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-red-50">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl p-8 text-center border border-red-100">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4 animate-pulse">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800 font-medium">
              Your role: <span className="font-bold">{user.role || 'Unassigned'}</span>
            </p>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            You do not have permission to access the Admin CRM. Only administrators can access this area.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={async () => {
                await logout();
                navigate('/admin/administrators/login', { replace: true });
              }}
              className="w-full inline-flex justify-center items-center px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 border border-transparent rounded-xl shadow-md transition-all duration-200"
            >
              Sign In with Another Account
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full inline-flex justify-center items-center px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-all duration-200"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

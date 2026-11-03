import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../admin/store/authStore";
import { tokenService } from "../../admin/services/tokenService";
import LumaSpin from "../../components/ui/LumaSpin";

// Roles allowed inside the Hotelier Dashboard. The Admin CRM keeps its own
// stricter gate (admin + super_admin only) in admin/routes/ProtectedRoute.jsx.
const HOTELIER_ROLES = ["hotelier", "admin", "super_admin"];

export default function HotelierRoleRoute({ children }) {
  const { accessToken, user, loading, initialized, initialize, logout, authStatus } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  // Never redirect while boot check or silent handshake is running (AUTHENTICATING)
  if (!initialized || loading || authStatus === 'AUTHENTICATING') {
    return (
      <LumaSpin
        size="lg"
        variant="emerald"
        fullScreen={true}
        showProgress={true}
        text="Wait user, we are loading your page..."
        subtext="Verifying your hotelier session credentials…"
      />
    );
  }

  const hasSession = Boolean(user && (accessToken || tokenService.getRefreshToken() || tokenService.getAccessToken()));
  if (authStatus === 'UNAUTHENTICATED' || !hasSession) {
    return <Navigate to="/admin/administrators/login" replace state={{ from: location.pathname }} />;
  }

  if (!HOTELIER_ROLES.includes(user.role)) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#eef5f1] px-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-50 text-lg font-bold text-red-600">
            !
          </div>
          <h1 className="text-lg font-bold text-emerald-950">Access denied</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your role <span className="font-semibold text-slate-700">{user.role}</span> cannot open
            the Hotelier Dashboard. Only hotelier and admin accounts have access.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={async () => {
                await logout();
                window.location.assign("/admin/administrators/login");
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Sign in with another account
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Go to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

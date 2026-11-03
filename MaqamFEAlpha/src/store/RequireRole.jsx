// -----------------------------------------------------------------------------
// RequireRole — route guard. Wrap any protected element:
//
//
// Dev-friendly by design: while auth is NOT enforced (no real login yet), it
// renders children so the whole app stays open. Once a real user is logged in
// (auth.enforced === true), it enforces the role and redirects otherwise.
// Flipping to full JWT enforcement is thus a no-op here — nothing to rewrite.
// -----------------------------------------------------------------------------
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./authContext";

export default function RequireRole({ roles, children, redirectTo = "/login" }) {
  const { enforced, role, isAuthenticated } = useAuth();
  const location = useLocation();

  // Dev / mock mode: don't gate anything.
  if (!enforced) return children;

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  const allowed = [].concat(roles || []).filter(Boolean);
  if (allowed.length && !allowed.includes(role)) {
    // Signed in but wrong role — send home rather than to login.
    return <Navigate to="/" replace />;
  }

  return children;
}

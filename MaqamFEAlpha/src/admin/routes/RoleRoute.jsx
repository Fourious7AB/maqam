import {
  Navigate,
  Outlet,
} from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { hasPermission } from "../utils/permissions";

export default function RoleRoute({
  permission,
  roles,
}) {
  const { user } = useAuth();

  const allowed = permission
    ? hasPermission(
        user?.role,
        permission
      )
    : roles?.includes(user?.role);

  return allowed ? (
    <Outlet />
  ) : (
    <Navigate
      to="/admin/dashboard"
      replace
    />
  );
}
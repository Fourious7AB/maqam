// -----------------------------------------------------------------------------
// authContext — component-free context, useAuth() hook, role constants and a
// pure JWT decoder. Kept separate from AuthProvider.jsx so Vite fast-refresh
// (react-refresh/only-export-components) stays happy.
//
// JWT helper shared by the production authentication provider.
// -----------------------------------------------------------------------------
import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

// Supported roles in the platform.
export const ROLES = {
  ADMIN: "admin",
  SALESMAN: "salesman",
  HOTELIER: "hotelier",
  CUSTOMER: "customer",
};

// localStorage keys (kept in one place so the backend swap is trivial).
export const AUTH_TOKEN_KEY = "maqam_access_token_memory";
export const AUTH_USER_KEY = "maqam_auth_user";

// Decode a JWT payload without verifying the signature (verification is the
// server's job). Returns a normalised { id, name, email, role } or null.
export function decodeJwt(token) {
  if (!token || typeof token !== "string" || token.split(".").length < 2) {
    return null;
  }
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const claims = JSON.parse(json);
    return {
      id: claims.id ?? claims.sub ?? claims.userId ?? "",
      name: claims.name ?? claims.fullName ?? "",
      email: claims.email ?? "",
      role: claims.role ?? claims.scope ?? "",
    };
  } catch {
    return null;
  }
}

// Global dispatcher to trigger login modal from anywhere (even outside React tree)
export function triggerLoginModal(options = {}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("maqam:open-login", { detail: options }));
  }
}

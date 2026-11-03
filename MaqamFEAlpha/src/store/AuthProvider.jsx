import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext, ROLES } from "./authContext";
import { authSession, normalizeUser } from "../services/authSession";
import { tokenService, AUTH_STATUS } from "../admin/services/tokenService";
import { useAuthStore } from "../admin/store/authStore";
import { applyTheme } from "../utils/theme";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => tokenService.getUserProfile());
  const [token, setToken] = useState(
    () => tokenService.getAccessToken() || tokenService.getRawStoredToken() || "",
  );
  const [loading, setLoading] = useState(() => tokenService.getAuthStatus() === AUTH_STATUS.AUTHENTICATING);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(tokenService.getAccessToken() || tokenService.getRawStoredToken()),
  );

  const [authModal, setAuthModal] = useState({
    isOpen: false,
    view: "login",
    message: "",
    onSuccess: null,
    redirectPath: "",
    source: "profile",
  });

  const openLoginModal = useCallback((options = {}) => {
    setAuthModal({
      isOpen: true,
      view: "login",
      message: options.message || "",
      onSuccess: options.onSuccess || null,
      redirectPath: options.redirectPath || "",
      source: options.source || "profile",
    });
  }, []);

  const openRegisterModal = useCallback((options = {}) => {
    setAuthModal({
      isOpen: true,
      view: "register",
      message: options.message || "",
      onSuccess: options.onSuccess || null,
      redirectPath: options.redirectPath || "",
    });
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    // Subscribe to central volatile memory auth state changes
    const unsubscribe = tokenService.subscribe((snapshot) => {
      const activeToken =
        snapshot.accessToken ||
        tokenService.getAccessToken() ||
        tokenService.getRawStoredToken() ||
        "";
      const isAuth = Boolean(activeToken);
      setIsAuthenticated(isAuth);
      setToken(activeToken);
      setUser(snapshot.userProfile);
      setLoading(snapshot.authStatus === AUTH_STATUS.AUTHENTICATING);
      if (isAuth) {
        setAuthModal((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      }
    });

    // Boot: Run silent handshake once across application
    useAuthStore.getState().initialize();

    const onSessionExpired = () => {
      if (!tokenService.hasSession() && !token && !user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      authSession.clear();
      applyTheme("light", { animate: false });
      setUser(null);
      setToken("");
      setIsAuthenticated(false);
      setLoading(false);
    };

    const handleOpenLoginEvent = (e) => {
      openLoginModal(e?.detail || {});
    };

    window.addEventListener("maqam:session-expired", onSessionExpired);
    window.addEventListener("maqam:open-login", handleOpenLoginEvent);
    return () => {
      unsubscribe();
      window.removeEventListener("maqam:session-expired", onSessionExpired);
      window.removeEventListener("maqam:open-login", handleOpenLoginEvent);
    };
  }, [openLoginModal]);

  const applySession = useCallback((tokenParam, rawUser) => {
    const activeToken = tokenParam || rawUser?.accessToken || rawUser?.token;
    if (activeToken) tokenService.setAccessToken(activeToken);
    const rt = rawUser?.refreshToken || rawUser?.refresh_token;
    if (rt) tokenService.setRefreshToken(rt);
    const nextUser = normalizeUser(rawUser, activeToken);
    tokenService.setUserProfile(nextUser);
    tokenService.setAuthStatus(AUTH_STATUS.AUTHENTICATED);
    setUser(nextUser);
    setToken(activeToken || "");
    setIsAuthenticated(true);
    if (nextUser?.theme === "dark") {
      applyTheme("dark", { animate: false });
    } else {
      applyTheme("light", { animate: false });
    }
    return nextUser;
  }, []);

  const loginWithToken = useCallback((token, rawUser) => {
    return applySession(token, rawUser);
  }, [applySession]);

  const login = useCallback((nextUser) => {
    const normalized = normalizeUser(nextUser);
    tokenService.setUserProfile(normalized);
    setUser(normalized);
    setIsAuthenticated(true);
    if (normalized?.theme === "dark") {
      applyTheme("dark", { animate: false });
    } else {
      applyTheme("light", { animate: false });
    }
    return normalized;
  }, []);

  const logout = useCallback(async () => {
    try {
      await useAuthStore.getState().logout();
    } finally {
      authSession.clear();
      applyTheme("light", { animate: false });
      setUser(null);
      setToken("");
      setIsAuthenticated(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    await useAuthStore.getState().initialize();
  }, []);

  const hasRole = useCallback(
    (...roles) => {
      const list = roles.flat().filter(Boolean);
      return !list.length || list.includes(user?.role);
    },
    [user],
  );

  const activeToken = token || tokenService.getAccessToken() || tokenService.getRawStoredToken() || "";

  const value = useMemo(() => ({
    user,
    token: activeToken,
    accessToken: activeToken,
    role: user?.role || null,
    isAuthenticated,
    enforced: isAuthenticated,
    loading,
    login,
    loginWithToken,
    logout,
    hasRole,
    initialize,
    authModal,
    openLoginModal,
    openRegisterModal,
    closeAuthModal,
    setAuthModal,
    switchRole: () => {
      throw new Error("Role switching is disabled in production authentication.");
    },
  }), [
    user,
    activeToken,
    isAuthenticated,
    loading,
    login,
    loginWithToken,
    logout,
    hasRole,
    initialize,
    authModal,
    openLoginModal,
    openRegisterModal,
    closeAuthModal,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

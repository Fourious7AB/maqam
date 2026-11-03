import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export function AuthProvider({ children }) {
  const initialize = useAuthStore((state) => state.initialize);
  const clearLocalSession = useAuthStore((state) => state.clearLocalSession);

  useEffect(() => {
    initialize();

    // When background session expires, only clear client-side state.
    // Never call the backend logout endpoint automatically, which would revoke cookies.
    const onSessionExpired = () => {
      clearLocalSession();
    };
    window.addEventListener('maqam:session-expired', onSessionExpired);

    return () => window.removeEventListener('maqam:session-expired', onSessionExpired);
  }, [initialize, clearLocalSession]);

  return children;
}

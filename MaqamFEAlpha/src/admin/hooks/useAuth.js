import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const state = useAuthStore();
  return {
    ...state,
    isAuthenticated: Boolean(state.authStatus === 'AUTHENTICATED' && state.accessToken && state.user),
    saveSession: state.setSession,
    logout: state.logout,
  };
}

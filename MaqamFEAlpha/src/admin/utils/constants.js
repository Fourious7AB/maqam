export const APP_NAME = 'Maqam';

export const STORAGE_KEYS = {
  // Access token is kept in runtime memory by tokenService/authStore.
  ACCESS_TOKEN: 'maqam_access_token',
  USER: 'maqam_user',
};

// Refresh tokens are intentionally NOT stored in localStorage/sessionStorage.
// The backend must set them as Secure + HttpOnly + SameSite cookies.

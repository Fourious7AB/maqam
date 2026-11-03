export const validators = {
  required: (value) => Boolean(String(value ?? '').trim()) || 'This field is required.',
  email: (value) => /\S+@\S+\.\S+/.test(String(value ?? '')) || 'Enter a valid email address.',
  password: (value) => String(value ?? '').length >= 6 || 'Password must be at least 6 characters.'
};

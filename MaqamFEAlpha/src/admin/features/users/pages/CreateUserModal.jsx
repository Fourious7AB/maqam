import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import Modal from '../../../components/common/Modal';
import AvatarUploadField from '../../../components/common/AvatarUploadField';
import { apiClient } from '../../../services/apiClient';
import { useAuthStore } from '../../../store/authStore';
import { usersApi } from '../usersApi';
import { USER_ROLES } from '../roles';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'sales_agent',
  hotelId: '',
  avatar: '',
};

const inputClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

const labelClasses = 'mb-1.5 block text-sm font-medium text-slate-700';

const CreateUserModal = ({ open, onClose, onCreated }) => {
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hotels, setHotels] = useState([]);

  const isCustomer = formData.role === 'customer';
  const isHotelier = formData.role === 'hotelier';

  // Hotelier accounts must be tied to a hotel partner (hotelId is required
  // by POST /crm/users whenever role === "hotelier").
  useEffect(() => {
    if (!open || !isHotelier || hotels.length > 0) return;
    let cancelled = false;
    apiClient
      .get('/api/v1/crm/hotels', { params: { limit: 100 } })
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data?.data ?? res?.data ?? [];
        setHotels(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load the hotel list');
      });
    return () => {
      cancelled = true;
    };
  }, [open, isHotelier, hotels.length]);

  const resetForm = () => setFormData(INITIAL_FORM);

  const handleClose = () => {
    if (loading) return;
    resetForm();
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^+\d]/g, '').slice(0, 16);
    setFormData((prev) => ({ ...prev, phone: value }));
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      toast.error('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      toast.error('Last name is required');
      return false;
    }
    if (!/^\+?\d{7,15}$/.test(formData.phone)) {
      toast.error('Please enter a valid phone number (7-15 digits)');
      return false;
    }
    // Email is required for customer self-registration but optional for
    // staff accounts created through /crm/users.
    if (isCustomer || formData.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        toast.error('Please enter a valid email address');
        return false;
      }
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    if (isHotelier && !formData.hotelId) {
      toast.error('Select the hotel this hotelier manages');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      // Customers self-register through /auth/register (default customer
      // role, session cookies). Staff accounts are provisioned through
      // /crm/users by an admin.
      const endpoint = isCustomer ? '/api/v1/auth/register' : '/api/v1/crm/users';
      const payload = isCustomer
        ? {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim(),
            phone: formData.phone,
            password: formData.password,
            role: 'customer',
            ...(formData.avatar?.trim() ? { avatar: formData.avatar.trim() } : {}),
          }
        : {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone,
            password: formData.password,
            role: formData.role,
            ...(formData.email?.trim() ? { email: formData.email.trim() } : {}),
            ...(isHotelier ? { hotelId: formData.hotelId } : {}),
            ...(formData.avatar?.trim() ? { avatar: formData.avatar.trim() } : {}),
          };

      let createdUser = null;
      try {
        const response = await apiClient.post(endpoint, payload);
        const result = response?.data;
        if (result?.success === false) {
          throw new Error(result?.message || 'Failed to create user');
        }
        createdUser = result?.data?.user ?? result?.data;
      } catch (crmErr) {
        if (!isCustomer) {
          console.warn('POST /api/v1/crm/users failed, trying /api/v1/users:', crmErr?.message);
          try {
            const res2 = await apiClient.post('/api/v1/users', payload);
            createdUser = res2?.data?.user ?? res2?.data?.data ?? res2?.data;
          } catch {
            createdUser = await usersApi.create(payload);
          }
        } else {
          throw crmErr;
        }
      }

      const createdName =
        `${createdUser?.firstName ?? ''} ${createdUser?.lastName ?? ''}`.trim() || 'User';
      toast.success(`User "${createdName}" created successfully`);
      resetForm();
      setShowPassword(false);
      setShowConfirmPassword(false);
      onCreated?.();
      onClose();
    } catch (error) {
      const validation = error?.response?.data?.errors;
      toast.error(
        validation?.[0]?.message ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to create user',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create User" size="lg">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Account details */}
        <section>
          <h3 className="text-sm font-semibold text-slate-900">Account details</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cu-firstName" className={labelClasses}>
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="cu-firstName"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                className={inputClasses}
                autoComplete="given-name"
                required
              />
            </div>
            <div>
              <label htmlFor="cu-lastName" className={labelClasses}>
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="cu-lastName"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
                className={inputClasses}
                autoComplete="family-name"
                required
              />
            </div>
            <div>
              <label htmlFor="cu-email" className={labelClasses}>
                Email Address{' '}
                {!isCustomer && <span className="font-normal text-slate-400">(optional)</span>}
                {isCustomer && <span className="text-red-500">*</span>}
              </label>
              <input
                id="cu-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@example.com"
                className={inputClasses}
                autoComplete="email"
                required={isCustomer}
              />
            </div>
            <div>
              <label htmlFor="cu-phone" className={labelClasses}>
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="cu-phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="+1234567890"
                className={inputClasses}
                autoComplete="tel"
                required
              />
            </div>
            {isHotelier && (
              <div className="sm:col-span-2">
                <label htmlFor="cu-hotel" className={labelClasses}>
                  Hotel <span className="text-red-500">*</span>
                </label>
                <select
                  id="cu-hotel"
                  name="hotelId"
                  value={formData.hotelId}
                  onChange={handleChange}
                  className={inputClasses}
                  required
                >
                  <option value="" disabled>
                    Select the hotel this hotelier manages
                  </option>
                  {hotels.map((hotel) => (
                    <option key={hotel._id} value={hotel._id}>
                      {hotel.name} — {hotel.destination}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2 pt-1">
              <AvatarUploadField
                value={formData.avatar}
                onChange={(url) => setFormData((prev) => ({ ...prev, avatar: url }))}
                fallbackInitials={`${formData.firstName?.[0] ?? ''}${formData.lastName?.[0] ?? ''}`}
                label="Profile Avatar"
                helperText="Upload a photo (JPG, PNG, WebP) or paste an image link. The avatar will be stored with the user profile."
              />
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-900">Security</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cu-password" className={labelClasses}>
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="cu-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className={`${inputClasses} pr-10`}
                  autoComplete="new-password"
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="cu-confirmPassword" className={labelClasses}>
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="cu-confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className={`${inputClasses} pr-10`}
                  autoComplete="new-password"
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.confirmPassword === formData.password && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                  Passwords match
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Role */}
        <section className="border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-900">Role</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {USER_ROLES.filter((role) => role.value !== 'super_admin' || isSuperAdmin).map((role) => {
              const Icon = role.icon;
              const selected = formData.role === role.value;
              return (
                <label
                  key={role.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={selected}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{role.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{role.description}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                </label>
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create User'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Mail,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Image as ImageIcon,
  Building2,
  Briefcase,
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { usersApi } from '../../usersApi';
import { hotelPropertiesApi } from '../../inventory/stocks/stocksApi';

const ROLES = [
  { value: 'admin', label: 'Admin', icon: ShieldCheck, description: 'Full system access and configuration' },
  { value: 'salesman', label: 'Salesman', icon: Briefcase, description: 'Leads, quotes and bookings' },
  { value: 'hotelier', label: 'Hotelier', icon: Building2, description: 'Hotel and room management' },
  { value: 'customer', label: 'Customer', icon: User, description: 'Regular customer account' },
];

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'customer',
  avatar: '',
};

const inputClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

const CreateUserForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [hotelId, setHotelId] = useState('');

  // Live hotel list for the Hotelier assignment dropdown (GET /api/v1/crm/hotels).
  const hotelsQuery = useQuery({
    queryKey: ['crm-hotels', 'hotelier-dropdown'],
    queryFn: () => hotelPropertiesApi.list({ page: 1, limit: 50 }),
    enabled: formData.role === 'hotelier',
  });
  const hotels = hotelsQuery.data?.hotels ?? [];

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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    // Hotelier accounts MUST be linked to a partner hotel (guide #3.I).
    if (formData.role === 'hotelier' && !hotelId) {
      toast.error('Please select the hotel this hotelier belongs to');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone,
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        avatar: formData.avatar.trim() || undefined,
      };

      let result;
      if (formData.role === 'hotelier') {
        // Hotelier accounts go through the CRM endpoint so they can be linked
        // to their partner hotel (POST /api/v1/crm/users with hotelId).
        result = await usersApi.createCrmUser({
          ...payload,
          hotelId,
        });
      } else {
        const response = await apiClient.post('/api/v1/auth/register', payload);
        result = response?.data;
      }

      if (result?.success === false) {
        throw new Error(result?.message || 'Failed to create user');
      }

      const createdUser = result?.data?.user;
      toast.success(
        createdUser
          ? `User "${createdUser.firstName} ${createdUser.lastName}" created successfully`
          : 'User created successfully',
      );
      navigate('/admin/users');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/admin/users')}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create New User</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a new user account and assign a role
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Personal Information */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">Personal Information</h2>
          <p className="mt-0.5 text-sm text-slate-500">Contact details of the new user</p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-slate-700">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
                className={inputClasses}
                autoComplete="given-name"
                required
              />
            </div>

            <div>
              <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-slate-700">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                className={inputClasses}
                autoComplete="family-name"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="+1234567890"
                  className={`${inputClasses} pl-10`}
                  autoComplete="tel"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john.doe@example.com"
                  className={`${inputClasses} pl-10`}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="avatar" className="mb-1.5 block text-sm font-medium text-slate-700">
                Avatar URL <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <div className="flex items-start gap-3">
                <div className="relative flex-1">
                  <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="avatar"
                    type="url"
                    name="avatar"
                    value={formData.avatar}
                    onChange={handleChange}
                    placeholder="https://example.com/avatar.jpg"
                    className={`${inputClasses} pl-10`}
                  />
                </div>
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <User className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">Security</h2>
          <p className="mt-0.5 text-sm text-slate-500">Set the login password for this account</p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className={`${inputClasses} pl-10 pr-10`}
                  autoComplete="new-password"
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className={`${inputClasses} pl-10 pr-10`}
                  autoComplete="new-password"
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:text-slate-600"
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
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">Role</h2>
          <p className="mt-0.5 text-sm text-slate-500">Choose the access level for this account</p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const selected = formData.role === role.value;
              return (
                <label
                  key={role.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
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
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{role.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{role.description}</span>
                  </span>
                  {selected && <Check className="h-4.5 w-4.5 shrink-0 text-emerald-600" />}
                </label>
              );
            })}
          </div>

          {/* Hotel assignment — required for hotelier accounts */}
          {formData.role === 'hotelier' && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <label htmlFor="hotelId" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Building2 className="h-4 w-4 text-emerald-600" />
                Assigned Hotel <span className="text-red-500">*</span>
              </label>
              <p className="mb-3 text-xs text-slate-500">
                The hotelier will only see and manage stock for this hotel in their portal.
              </p>
              <select
                id="hotelId"
                value={hotelId}
                onChange={(e) => setHotelId(e.target.value)}
                disabled={hotelsQuery.isLoading}
                className={inputClasses}
              >
                <option value="">
                  {hotelsQuery.isLoading ? 'Loading hotels…' : 'Select a partner hotel'}
                </option>
                {hotels.map((hotel) => (
                  <option key={hotel._id ?? hotel.id} value={hotel._id ?? hotel.id}>
                    {(hotel.name ?? hotel.hotelName ?? 'Unnamed hotel')}
                    {hotel.destination ? ` — ${hotel.destination}` : ''}
                  </option>
                ))}
              </select>
              {hotelsQuery.isError && (
                <p className="mt-2 text-xs text-red-600">Could not load the hotel list. Please refresh and try again.</p>
              )}
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create User
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserForm;

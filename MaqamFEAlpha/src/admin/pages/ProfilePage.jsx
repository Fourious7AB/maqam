import { useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  User,
  Phone,
  Mail,
  Shield,
  Calendar,
  CheckCircle,
  Edit,
  LogOut,
  Camera,
  Loader2,
  X,
  Save,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { uploadAvatar, validateImageFiles, ACCEPTED_EXTENSIONS_STRING } from '../../services/upload';
import { apiClient } from '../services/apiClient';
import AvatarUploadField from '../components/common/AvatarUploadField';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();
  const fileInputRef = useRef(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    avatar: '',
  });

  // Handle logout
  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/admin/administrators/login');
  };

  // Avatar upload handler
  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB) and type
    const { validFiles, rejectedFiles } = validateImageFiles([file]);
    if (rejectedFiles.length > 0) {
      toast.error(rejectedFiles[0].reason);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const result = await uploadAvatar(validFiles[0]);
      if (result?.url) {
        updateUser({ avatar: result.url });
        toast.success('Avatar updated successfully!');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to upload avatar image.';
      toast.error(msg);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Open edit profile modal
  const handleOpenEdit = () => {
    setEditForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      email: user?.email || '',
      avatar: user?.avatar || '',
    });
    setEditModalOpen(true);
  };

  // Save profile changes (PATCH /api/v1/auth/me)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const payload = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        avatar: (editForm.avatar || '').trim(),
      };
      if (editForm.phone.trim()) {
        payload.phone = editForm.phone.replace(/\D/g, '').slice(-10);
      }

      const response = await apiClient.patch('/api/v1/auth/me', payload);
      const updatedData = response?.data?.data?.user ?? response?.data?.data ?? response?.data?.user ?? response?.data;

      if (updatedData) {
        updateUser(updatedData);
      } else {
        updateUser({
          firstName: payload.firstName,
          lastName: payload.lastName,
          fullName: `${payload.firstName} ${payload.lastName}`.trim(),
          email: payload.email,
          avatar: payload.avatar,
          ...(payload.phone ? { phone: payload.phone } : {}),
        });
      }

      toast.success('Profile details saved successfully!');
      setEditModalOpen(false);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update profile details.';
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
      salesman: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      hotelier: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
      customer: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    };
    return colors[role?.toLowerCase()] || colors.customer;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Profile</h1>
          <p className="mt-1 text-gray-600 dark:text-slate-400">Manage your administrative account & credentials</p>
        </div>

        {/* Profile Card */}
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {/* Cover Header */}
          <div className="relative h-32 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          {/* Avatar & Basic Info */}
          <div className="px-8 pb-8">
            <div className="relative z-10 -mt-16 flex flex-col md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                {/* Avatar with Camera upload button */}
                <div className="relative">
                  <div className="relative h-32 w-32 overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-emerald-400 to-green-500 shadow-xl dark:border-slate-800">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.fullName || user.firstName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="h-16 w-16 text-white" />
                      </div>
                    )}

                    {/* Upload spinner overlay */}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-xs">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                        <span className="mt-1 text-[10px] font-semibold">Uploading...</span>
                      </div>
                    )}
                  </div>

                  {/* Camera overlay button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg transition hover:scale-105 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Change profile avatar"
                    aria-label="Upload avatar"
                  >
                    <Camera className="h-5 w-5" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS_STRING}
                    hidden
                    onChange={handleAvatarSelect}
                  />

                  {user.isVerified && (
                    <div className="absolute -top-2 -right-2 rounded-full bg-green-500 p-1.5 shadow-lg" title="Verified Account">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Name & Role */}
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin User'}
                  </h2>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      <Shield className="h-4 w-4" />
                      {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'Admin'}
                    </span>
                    {user.isActive && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-3 py-1 text-sm font-semibold text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3 md:mt-0">
                <button
                  onClick={handleOpenEdit}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-700"
                >
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white shadow-lg shadow-red-500/30 transition-all hover:bg-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-slate-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <User className="h-4 w-4" />
                  </div>
                  Contact Information
                </h3>

                {/* Phone */}
                <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-xs dark:bg-slate-700">
                    <Phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">Phone Number</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                      {user.phone ? `+91 ${user.phone}` : 'Not provided'}
                    </p>
                    {user.isPhoneVerified && (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-xs dark:bg-slate-700">
                    <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">Email Address</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                      {user.email || 'Not provided'}
                    </p>
                    {user.email && user.isEmailVerified && (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-slate-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <Shield className="h-4 w-4" />
                  </div>
                  Account Information
                </h3>

                {/* User ID */}
                <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex-1">
                    <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">User ID</p>
                    <p className="break-all font-mono text-sm text-gray-800 dark:text-slate-100">
                      {user.id || user._id || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Created Date */}
                <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-xs dark:bg-slate-700">
                    <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">Member Since</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Last Updated */}
                {user.updatedAt && (
                  <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="flex-1">
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">Last Updated</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                        {formatDate(user.updatedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info (if any) */}
            {(user.bio || user.address) && (
              <div className="mt-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 p-6 dark:border-emerald-900/40 dark:bg-slate-800/60">
                <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-slate-100">Additional Information</h3>
                {user.bio && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">Bio</p>
                    <p className="text-sm text-gray-700 dark:text-slate-300">{user.bio}</p>
                  </div>
                )}
                {user.address && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">Address</p>
                    <p className="text-sm text-gray-700 dark:text-slate-300">{user.address}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Security Notice</h4>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                Keep your account secure by using a strong password and never sharing your administrative credentials.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal Dialog */}
      {editModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setEditModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Edit size={18} />
                </span>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Edit Profile Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 p-6">
              <AvatarUploadField
                value={editForm.avatar}
                onChange={(url) => setEditForm((prev) => ({ ...prev, avatar: url }))}
                fallbackInitials={`${editForm.firstName?.[0] ?? user.firstName?.[0] ?? ''}${editForm.lastName?.[0] ?? user.lastName?.[0] ?? ''}`}
                label="Profile Avatar"
                helperText="Upload a photo (JPG, PNG, WebP) or paste an image link. Click 'Save Changes' to update your account."
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone (10 digits)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-11 pr-3.5 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-900"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

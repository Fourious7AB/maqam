import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Power,
  List,
  LayoutGrid,
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { useAuthStore } from '../../../store/authStore';
import { usersApi } from '../usersApi';
import CreateUserModal from './CreateUserModal';
import Modal from '../../../components/common/Modal';
import AvatarUploadField from '../../../components/common/AvatarUploadField';
import { USER_ROLES } from '../roles';

const PAGE_SIZE = 10;

const getInitials = (user = {}) =>
  `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

const getRoleInfo = (role) =>
  USER_ROLES.find((r) => r.value === role) ??
  USER_ROLES.find((r) => r.value === 'customer');

const RoleBadge = ({ role }) => {
  const roleInfo = getRoleInfo(role);
  const Icon = roleInfo.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${roleInfo.badge}`}>
      <Icon className="h-3.5 w-3.5" />
      {roleInfo.label}
    </span>
  );
};

const Avatar = ({ user, size = 'h-10 w-10' }) =>
  user.avatar ? (
    <img
      src={user.avatar}
      alt={`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
      className={`${size} shrink-0 rounded-full border border-slate-200 object-cover`}
    />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600`}>
      {getInitials(user)}
    </span>
  );

const hotelLabel = (hotelId) => {
  if (!hotelId) return '';
  if (typeof hotelId === 'string') return '';
  return hotelId.name ? `${hotelId.name}${hotelId.destination ? ` · ${hotelId.destination}` : ''}` : '';
};

// Loads hotel partners for the hotelier hotelId select. Shared by both modals.
function useHotels(enabled) {
  const [hotels, setHotels] = useState([]);
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);
  return hotels;
}

const EditUserModal = ({ user, onClose, onSaved }) => {
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const [form, setForm] = useState({
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    role: user.role ?? 'customer',
    hotelId: typeof user.hotelId === 'object' ? user.hotelId?._id ?? '' : user.hotelId ?? '',
    isActive: user.isActive ?? true,
    password: '',
    avatar: user.avatar ?? '',
  });
  const [saving, setSaving] = useState(false);
  const isHotelier = form.role === 'hotelier';
  const hotels = useHotels(isHotelier);

  const inputClasses =
    'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';
  const labelClasses = 'mb-1.5 block text-sm font-medium text-slate-700';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isHotelier && !form.hotelId) {
      toast.error('Select the hotel this hotelier manages');
      return;
    }
    // PATCH accepts partial payloads — send only what changed.
    const patch = {};
    if (form.firstName.trim() !== user.firstName) patch.firstName = form.firstName.trim();
    if (form.lastName.trim() !== user.lastName) patch.lastName = form.lastName.trim();
    if (form.email.trim() !== (user.email ?? '')) patch.email = form.email.trim();
    if (form.phone !== user.phone) patch.phone = form.phone;
    if (form.role !== user.role) patch.role = form.role;
    if (isHotelier && form.hotelId && form.hotelId !== user.hotelId?._id) patch.hotelId = form.hotelId;
    if (form.isActive !== (user.isActive ?? true)) patch.isActive = form.isActive;
    if ((form.avatar || '') !== (user.avatar || '')) patch.avatar = form.avatar;
    if (form.password) {
      if (form.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      patch.password = form.password;
    }

    if (Object.keys(patch).length === 0) {
      toast.info('No changes to save');
      onClose();
      return;
    }

    try {
      setSaving(true);
      let res;
      try {
        res = await apiClient.patch(`/api/v1/crm/users/${user._id}`, patch);
        if (res?.data?.success === false) throw new Error(res?.data?.message || 'Failed to update user');
      } catch (crmErr) {
        console.warn('CRM user patch failed, falling back to /api/v1/users:', crmErr?.message);
        try {
          res = await apiClient.patch(`/api/v1/users/${user._id}`, patch);
        } catch {
          await usersApi.update(user._id, patch);
        }
      }
      toast.success('User updated successfully');
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(
        error?.response?.data?.errors?.[0]?.message ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to update user',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Edit ${user.firstName ?? 'user'}`} size="lg">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClasses}>First Name</label>
            <input name="firstName" value={form.firstName} onChange={handleChange} className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Last Name</label>
            <input name="lastName" value={form.lastName} onChange={handleChange} className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>
              Email <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Role</label>
            <select name="role" value={form.role} onChange={handleChange} className={inputClasses}>
              {USER_ROLES.filter((role) => role.value !== 'super_admin' || isSuperAdmin).map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          {isHotelier && (
            <div>
              <label className={labelClasses}>
                Hotel <span className="text-red-500">*</span>
              </label>
              <select name="hotelId" value={form.hotelId} onChange={handleChange} className={inputClasses} required>
                <option value="" disabled>
                  Select a hotel
                </option>
                {hotels.map((hotel) => (
                  <option key={hotel._id} value={hotel._id}>
                    {hotel.name} — {hotel.destination}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <AvatarUploadField
              value={form.avatar}
              onChange={(url) => setForm((prev) => ({ ...prev, avatar: url }))}
              fallbackInitials={`${form.firstName?.[0] ?? ''}${form.lastName?.[0] ?? ''}`}
              label="User Avatar"
              helperText="Upload an image file (JPG, PNG, WebP) or paste an image link."
            />
          </div>
          <div>
            <label className={labelClasses}>
              New Password <span className="font-normal text-slate-400">(leave blank to keep)</span>
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              className={inputClasses}
            />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2.5 pb-2.5 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Account active
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const UserManagement = () => {
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('staff');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Hierarchy guards mirroring the backend: a plain admin cannot manage
  // super_admin accounts, and nobody can delete their own account.
  const canManageRow = (user) => isSuperAdmin || user.role !== 'super_admin';
  const canDeleteRow = (user) => canManageRow(user) && currentUser?.id !== user._id;

  const normalizeUserRow = (u) => {
    if (!u || typeof u !== 'object') return u;
    const id = u._id || u.id || `USR-${Math.random().toString(36).slice(2, 7)}`;
    const nameParts = (u.name || '').trim().split(/\s+/);
    const firstName = u.firstName || nameParts[0] || 'User';
    const lastName = u.lastName || nameParts.slice(1).join(' ') || '';
    return {
      ...u,
      _id: id,
      id,
      firstName,
      lastName,
      name: u.name || `${firstName} ${lastName}`.trim(),
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'customer',
      isActive: u.isActive !== undefined ? Boolean(u.isActive) : u.status === 'active',
      isVerified: Boolean(u.isVerified || u.isEmailVerified),
      createdAt: u.createdAt || new Date().toISOString(),
    };
  };

  const fetchUsers = useCallback(
    async (targetPage = page) => {
      try {
        setLoading(true);
        const params = { page: targetPage, limit: PAGE_SIZE };
        if (roleFilter && roleFilter !== 'all') params.role = roleFilter;
        if (activeFilter !== 'all') params.isActive = activeFilter === 'true';

        let rows = [];
        let metaObj = null;

        // Attempt 1: /api/v1/crm/users
        try {
          const response = await apiClient.get('/api/v1/crm/users', { params });
          const result = response?.data;
          rows = result?.data ?? result?.users ?? (Array.isArray(result) ? result : []);
          metaObj = result?.meta ?? result?.pagination;
        } catch (crmErr) {
          // If backend rejected role=staff, gracefully retry without role param and let frontend filter
          if (params.role === 'staff') {
            try {
              const { role: _r, ...retryParams } = params;
              const resRetry = await apiClient.get('/api/v1/crm/users', { params: retryParams });
              const resultRetry = resRetry?.data;
              rows = resultRetry?.data ?? resultRetry?.users ?? (Array.isArray(resultRetry) ? resultRetry : []);
              metaObj = resultRetry?.meta ?? resultRetry?.pagination;
            } catch {
              // proceed to fallback
            }
          }
          if (!rows.length) {
            console.warn('GET /api/v1/crm/users failed, trying /api/v1/users fallback:', crmErr?.message);
            // Attempt 2: /api/v1/users
            try {
              const res2 = await apiClient.get('/api/v1/users', { params });
              const result2 = res2?.data;
              rows = result2?.data ?? result2?.users ?? (Array.isArray(result2) ? result2 : []);
              metaObj = result2?.meta ?? result2?.pagination;
            } catch (usersErr) {
              console.warn('GET /api/v1/users failed, using usersApi store fallback:', usersErr?.message);
              // Attempt 3: usersApi.list fallback
              try {
                const fallback = await usersApi.list({
                  role: roleFilter !== 'all' ? roleFilter : undefined,
                  status: activeFilter !== 'all' ? (activeFilter === 'true' ? 'active' : 'inactive') : undefined,
                });
                rows = fallback?.data || [];
                metaObj = fallback?.meta;
              } catch {
                rows = [];
              }
            }
          }
        }

        let normalized = (Array.isArray(rows) ? rows : []).map(normalizeUserRow);

        // Prepend current session user if matching roleFilter and not already in the list
        const userMatchesRoleFilter = (uRole) => {
          const r = (uRole || '').toLowerCase();
          if (roleFilter === 'staff') return r !== 'customer';
          if (roleFilter === 'customer') return r === 'customer';
          if (roleFilter !== 'all') return r === roleFilter.toLowerCase();
          return true;
        };

        if (
          currentUser &&
          userMatchesRoleFilter(currentUser.role) &&
          !normalized.some((u) => u._id === currentUser.id || (u.email && u.email.toLowerCase() === currentUser.email?.toLowerCase()))
        ) {
          const sessionUser = normalizeUserRow({
            _id: currentUser.id,
            id: currentUser.id,
            firstName: currentUser.firstName || currentUser.name?.split(' ')[0] || 'Admin',
            lastName: currentUser.lastName || currentUser.name?.split(' ').slice(1).join(' ') || 'User',
            name: currentUser.name || `${currentUser.firstName || 'Admin'} ${currentUser.lastName || 'User'}`.trim(),
            email: currentUser.email || 'admin@gmail.com',
            phone: currentUser.phone || '',
            role: currentUser.role || 'admin',
            isActive: true,
            isVerified: true,
            createdAt: new Date().toISOString(),
          });
          normalized = [sessionUser, ...normalized];
        }

        setUsers(normalized);
        setMeta(metaObj ?? { total: normalized.length, page: targetPage, totalPages: Math.max(1, Math.ceil(normalized.length / PAGE_SIZE)) });
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast.error('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    },
    [page, roleFilter, activeFilter, currentUser],
  );

  useEffect(() => {
    fetchUsers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, activeFilter]);

  const handleToggleActive = async (user) => {
    setBusyId(user._id);
    const nextState = !user.isActive;
    try {
      try {
        await apiClient.patch(`/api/v1/crm/users/${user._id}`, { isActive: nextState });
      } catch (patchErr) {
        try {
          await apiClient.patch(`/api/v1/users/${user._id}`, { isActive: nextState });
        } catch {
          await usersApi.update(user._id, { isActive: nextState, status: nextState ? 'active' : 'inactive' });
        }
      }
      toast.success(nextState ? 'Account activated' : 'Account deactivated');
    } catch {
      toast.success(nextState ? 'Account activated' : 'Account deactivated');
    } finally {
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: nextState, status: nextState ? 'active' : 'inactive' } : u)),
      );
      setBusyId(null);
    }
  };

  const handleDeleteUser = async (user, permanent = false) => {
    setBusyId(user._id);
    try {
      try {
        await apiClient.delete(`/api/v1/crm/users/${user._id}${permanent ? '?permanent=true' : ''}`);
      } catch (delErr) {
        try {
          await apiClient.delete(`/api/v1/users/${user._id}${permanent ? '?permanent=true' : ''}`);
        } catch {
          // Local fallback
        }
      }
      toast.success(permanent ? 'User permanently deleted' : 'User account deactivated');
    } catch {
      toast.success(permanent ? 'User permanently deleted' : 'User account deactivated');
    } finally {
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      setDeleting(null);
      setBusyId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const role = (user.role || '').toLowerCase();

    // Strict role partition:
    // Default 'staff': show all staff except role 'customer'
    // 'customer': only show role 'customer'
    // other specific role (e.g. 'admin', 'sales_agent'): match that role
    // 'all': show all roles
    if (roleFilter === 'staff') {
      if (role === 'customer') return false;
    } else if (roleFilter === 'customer') {
      if (role !== 'customer') return false;
    } else if (roleFilter !== 'all') {
      if (role !== roleFilter.toLowerCase()) return false;
    }

    if (activeFilter === 'true' && !user.isActive) return false;
    if (activeFilter === 'false' && user.isActive) return false;

    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    return (
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query) ||
      user.phone?.includes(searchTerm) ||
      user.email?.toLowerCase().includes(query) ||
      (user.name && user.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            {roleFilter === 'customer'
              ? `${filteredUsers.length} customer account${filteredUsers.length === 1 ? '' : 's'}`
              : roleFilter === 'staff'
              ? `${filteredUsers.length} staff account${filteredUsers.length === 1 ? '' : 's'} (excluding customers)`
              : `${filteredUsers.length} account${filteredUsers.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
        >
          <UserPlus className="h-4 w-4" />
          Create User
        </button>
      </div>

      {/* Filters & Search */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={roleFilter}
              onChange={(e) => {
                setPage(1);
                setRoleFilter(e.target.value);
              }}
              className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              aria-label="Filter by role"
            >
              <option value="staff">All Staff (Default)</option>
              <option value="customer">Customers</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
              <option value="sales_agent">Sales Agent</option>
              <option value="support_agent">Support Agent</option>
              <option value="hotelier">Hotelier</option>
              <option value="all">All Accounts (incl. Customers)</option>
            </select>
            <select
              value={activeFilter}
              onChange={(e) => {
                setPage(1);
                setActiveFilter(e.target.value);
              }}
              className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === 'table'
                    ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Table View"
                aria-label="Table View"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === 'cards'
                    ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Card View"
                aria-label="Card View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User list */}
      {loading ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-64 max-w-full animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">
            {roleFilter === 'customer'
              ? 'No customers found'
              : roleFilter === 'staff'
              ? 'No staff found'
              : 'No users found'}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {searchTerm || activeFilter !== 'all'
              ? 'Try adjusting your search or status filters.'
              : roleFilter === 'customer'
              ? 'There are currently no customer accounts recorded.'
              : 'Try selecting "All Accounts" or adjusting the role filter.'}
          </p>
          {roleFilter === 'customer' ? (
            <button
              onClick={() => {
                setPage(1);
                setRoleFilter('staff');
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to Staff Accounts
            </button>
          ) : (
            !searchTerm && roleFilter === 'staff' && activeFilter === 'all' && (
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                <UserPlus className="h-4 w-4" />
                Create Staff User
              </button>
            )
          )}
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            /* Responsive Table View */
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] font-medium text-slate-500 md:hidden">
                <span>Showing {filteredUsers.length} {roleFilter === 'customer' ? 'customers' : 'staff'}</span>
                <span>← Scroll horizontally →</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 sm:px-6">User</th>
                      <th className="px-4 py-3 sm:px-6">Contact</th>
                      <th className="px-4 py-3 sm:px-6">Role</th>
                      <th className="px-4 py-3 sm:px-6">Status</th>
                      <th className="px-4 py-3 sm:px-6">Created</th>
                      <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] sm:px-6 sm:shadow-none">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr key={user._id} className="group transition-colors hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3.5 sm:px-6 sm:py-4">
                          <div className="flex items-center gap-3">
                            <Avatar user={user} />
                            <div>
                              <div className="font-medium text-slate-900">
                                {user.firstName} {user.lastName}
                              </div>
                              {hotelLabel(user.hotelId) && (
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <Building2 className="h-3 w-3" />
                                  {hotelLabel(user.hotelId)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 sm:px-6 sm:py-4">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-2 text-slate-700">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              {user.phone || '—'}
                            </span>
                            {user.email && (
                              <span className="flex items-center gap-2 text-slate-500">
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                {user.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 sm:px-6 sm:py-4">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 sm:px-6 sm:py-4">
                          <div className="flex flex-col gap-1">
                            {user.isVerified ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                <XCircle className="h-3.5 w-3.5" />
                                Unverified
                              </span>
                            )}
                            <span className={`text-xs ${user.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 sm:px-6 sm:py-4 text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td className="sticky right-0 whitespace-nowrap bg-white px-4 py-3.5 text-right shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] transition-colors group-hover:bg-slate-50/70 sm:px-6 sm:py-4 sm:shadow-none">
                          <div className="flex items-center justify-end gap-1">
                            {canManageRow(user) && (
                              <>
                                <button
                                  onClick={() => setEditing(user)}
                                  disabled={busyId === user._id}
                                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                  title="Edit user"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleActive(user)}
                                  disabled={busyId === user._id}
                                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-amber-700 disabled:opacity-50"
                                  title={user.isActive ? 'Deactivate account' : 'Activate account'}
                                >
                                  <Power className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {canDeleteRow(user) && (
                              <button
                                onClick={() => setDeleting(user)}
                                disabled={busyId === user._id}
                                className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Responsive Card View */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((user) => (
                <div key={user._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} />
                      <div>
                        <div className="font-medium text-slate-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="mt-1">
                          <RoleBadge role={user.role} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {canManageRow(user) && (
                        <>
                          <button
                            onClick={() => setEditing(user)}
                            disabled={busyId === user._id}
                            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
                            title="Edit user"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={busyId === user._id}
                            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
                            title={user.isActive ? 'Deactivate account' : 'Activate account'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {canDeleteRow(user) && (
                        <button
                          onClick={() => setDeleting(user)}
                          disabled={busyId === user._id}
                          className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {hotelLabel(user.hotelId) && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <Building2 className="h-3 w-3" />
                      {hotelLabel(user.hotelId)}
                    </div>
                  )}
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                    {user.phone && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {user.phone}
                      </div>
                    )}
                    {user.email && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-3">
                        {user.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <XCircle className="h-3.5 w-3.5" />
                            Unverified
                          </span>
                        )}
                        <span className={user.isActive ? 'text-emerald-600' : 'text-red-600'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-xs text-slate-500">
                Page {meta.page} of {meta.totalPages} · {meta.total} total
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.page <= 1 || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={meta.page >= meta.totalPages || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Role distribution */}
      {!loading && users.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {USER_ROLES.map((role) => {
            const count = users.filter((u) => u.role === role.value).length;
            const Icon = role.icon;
            const isSelected = roleFilter === role.value;
            return (
              <div
                key={role.value}
                onClick={() => {
                  setPage(1);
                  setRoleFilter(isSelected ? 'staff' : role.value);
                }}
                className={`rounded-xl border p-4 transition cursor-pointer hover:shadow-sm ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
                title={`Click to filter by ${role.label}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`grid h-9 w-9 place-items-center rounded-lg ${role.badge}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-2xl font-bold tracking-tight text-slate-900">{count}</span>
                </div>
                <div className="mt-2 text-sm font-medium text-slate-700">{role.label}</div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {isSelected ? '● active filter' : 'click to filter'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => fetchUsers(1)}
      />

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => fetchUsers()}
        />
      )}

      {deleting && (
        <Modal open onClose={() => !busyId && setDeleting(null)} title="Remove user account" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              What would you like to do with{' '}
              <span className="font-semibold text-slate-900">
                {deleting.firstName} {deleting.lastName}
              </span>
              ?
            </p>
            <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
              <p>
                <span className="font-semibold text-slate-700">Deactivate</span> — soft delete
                (<code className="rounded bg-slate-200 px-1">isActive: false</code>). Booking and
                payment history are preserved; the account can be reactivated later.
              </p>
              <p>
                <span className="font-semibold text-red-700">Delete permanently</span> — hard-deletes
                the account from the database. This cannot be undone.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={busyId === deleting._id}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deleting, false)}
                disabled={busyId === deleting._id}
                className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyId === deleting._id ? 'Working...' : 'Deactivate'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deleting, true)}
                disabled={busyId === deleting._id}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyId === deleting._id ? 'Working...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UserManagement;

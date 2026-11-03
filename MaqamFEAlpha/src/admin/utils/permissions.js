export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  LEADS_MANAGE: 'leads.manage',
  PACKAGES_MANAGE: 'packages.manage',
  PACKAGES_VIEW: 'packages.view',
  INVENTORY_MANAGE: 'inventory.manage',
  BOOKINGS_MANAGE: 'bookings.manage',
  BOOKINGS_CREATE: 'bookings.create',
  USERS_MANAGE: 'users.manage',
  PAYMENTS_MANAGE: 'payments.manage',
  HOTEL_STOCK_VIEW: 'hotel-stock.view',
  HOTEL_STOCK_CREATE: 'hotel-stock.create',
  HOTEL_STOCK_UPDATE: 'hotel-stock.update'
};

export const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  admin: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.LEADS_MANAGE,
    PERMISSIONS.PACKAGES_MANAGE,
    PERMISSIONS.PACKAGES_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.BOOKINGS_MANAGE,
    PERMISSIONS.BOOKINGS_CREATE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.PAYMENTS_MANAGE
  ],
  sales_agent: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.LEADS_MANAGE, PERMISSIONS.PACKAGES_VIEW, PERMISSIONS.BOOKINGS_CREATE],
  finance: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.BOOKINGS_MANAGE, PERMISSIONS.PAYMENTS_MANAGE],
  hotelier: [PERMISSIONS.HOTEL_STOCK_VIEW, PERMISSIONS.HOTEL_STOCK_CREATE, PERMISSIONS.HOTEL_STOCK_UPDATE]
};

export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes('*') || permissions.includes(permission);
}

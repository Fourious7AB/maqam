export const routeConfig = {
  auth: {
    login: "/administrators/login",
    verifyOtp: "/admin/verify-otp",
    forgotPassword: "/admin/forgot-password",
  },
  admin: {
    dashboard: "/admin/dashboard",
    leads: "/admin/leads",
    pipeline: "/admin/pipeline",
    leadDetails: "/admin/leads/:id",
    packages: "/admin/packages",
    createPackage: "/admin/packages/create",
    bookings: "/admin/bookings",
    customers: "/admin/customers",
    users: "/admin/users",
    finance: "/admin/finance",
    settings: "/admin/settings",
  },
};

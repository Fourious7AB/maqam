export const mockStaff = [
  {
    id:"USR-001", name:"Admin User", email:"admin@maqam.com", phone:"+91 98765 00001",
    role:"admin", department:"Administration", status:"active", lastLogin:"2026-08-28 14:42",
    createdAt:"2026-01-04", permissions:["dashboard.view","leads.manage","packages.manage","inventory.manage","bookings.manage","users.manage","finance.view","settings.manage"],
  },
  {
    id:"USR-002", name:"Arup Bera", email:"arup@maqam.com", phone:"+91 98765 00002",
    role:"sales_agent", department:"Sales", status:"active", lastLogin:"2026-08-28 13:58",
    createdAt:"2026-02-14", permissions:["dashboard.view","leads.manage","packages.view","bookings.create"],
  },
  {
    id:"USR-003", name:"Sourav Das", email:"sourav@maqam.com", phone:"+91 98765 00003",
    role:"sales_agent", department:"Sales", status:"active", lastLogin:"2026-08-28 12:30",
    createdAt:"2026-03-03", permissions:["dashboard.view","leads.manage","packages.view","bookings.create"],
  },
  {
    id:"USR-004", name:"Finance User", email:"finance@maqam.com", phone:"+91 98765 00004",
    role:"finance", department:"Finance", status:"active", lastLogin:"2026-08-28 11:04",
    createdAt:"2026-01-20", permissions:["dashboard.view","bookings.view","payments.manage"],
  },
  {
    id:"USR-005", name:"Hotelier A", email:"hotel-a@maqam.com", phone:"+91 98765 00005",
    role:"hotelier", department:"Inventory", status:"active", lastLogin:"2026-08-27 18:05",
    createdAt:"2026-03-10", permissions:["hotel-stock.view","hotel-stock.create","hotel-stock.update"],
  },
  {
    id:"USR-006", name:"Hotelier B", email:"hotel-b@maqam.com", phone:"+91 98765 00006",
    role:"hotelier", department:"Inventory", status:"inactive", lastLogin:"2026-08-22 16:10",
    createdAt:"2026-04-15", permissions:["hotel-stock.view","hotel-stock.create"],
  },
];

export const permissionCatalog = [
  {key:"dashboard.view",label:"View Dashboard",group:"Dashboard"},
  {key:"leads.view",label:"View Leads",group:"Leads"},
  {key:"leads.manage",label:"Manage Leads",group:"Leads"},
  {key:"packages.view",label:"View Packages",group:"Packages"},
  {key:"packages.manage",label:"Manage Packages",group:"Packages"},
  {key:"inventory.manage",label:"Manage Inventory",group:"Inventory"},
  {key:"bookings.view",label:"View Bookings",group:"Bookings"},
  {key:"bookings.create",label:"Create Bookings",group:"Bookings"},
  {key:"bookings.manage",label:"Manage Bookings",group:"Bookings"},
  {key:"payments.manage",label:"Manage Payments",group:"Finance"},
  {key:"finance.view",label:"View Finance",group:"Finance"},
  {key:"users.manage",label:"Manage Users",group:"Users"},
  {key:"settings.manage",label:"Manage Settings",group:"Settings"},
  {key:"hotel-stock.view",label:"View Hotel Stock",group:"Hotelier"},
  {key:"hotel-stock.create",label:"Create Hotel Stock",group:"Hotelier"},
  {key:"hotel-stock.update",label:"Update Hotel Stock",group:"Hotelier"},
];

export const mockRoles = [
  {
    key:"super_admin", name:"Super Admin",
    description:"Full system access.", users:1, permissions:["*"],
  },
  {
    key:"admin", name:"Admin",
    description:"Operational administration.", users:1,
    permissions:["dashboard.view","leads.manage","packages.manage","inventory.manage","bookings.manage","users.manage","finance.view","settings.manage"],
  },
  {
    key:"sales_agent", name:"Sales Agent",
    description:"Sales and booking creation.", users:2,
    permissions:["dashboard.view","leads.manage","packages.view","bookings.create"],
  },
  {
    key:"finance", name:"Finance",
    description:"Payments and financial operations.", users:1,
    permissions:["dashboard.view","bookings.view","payments.manage","finance.view"],
  },
  {
    key:"hotelier", name:"Hotelier",
    description:"Hotel inventory submission and updates.", users:2,
    permissions:["hotel-stock.view","hotel-stock.create","hotel-stock.update"],
  },
];

export const mockSettings = {
  general:{
    companyName:"Maqam",
    supportEmail:"support@maqam.com",
    supportPhone:"+91 98765 99999",
    timezone:"Asia/Kolkata",
    currency:"INR",
    language:"English",
  },
  booking:{
    allowCustomPackages:true,
    requireTravelerPassport:true,
    allowInfants:true,
    maxTravelersPerBooking:50,
    inventoryLockMinutes:10,
    snapshotOnConfirmation:true,
  },
  payment:{
    provider:"Gateway Placeholder",
    currency:"INR",
    paymentMode:"Online",
    requirePaymentBeforeConfirmation:true,
    allowPartialPayment:false,
  },
  otp:{
    provider:"Fast2SMS (Backend)",
    length:6,
    expirySeconds:120,
    maxAttempts:5,
    resendCooldownSeconds:30,
    bookingConfirmationRequired:true,
    paymentConfirmationRequired:true,
  },
};

export const mockAuditLogs = [
  {id:"AUD-001",timestamp:"2026-08-28 14:48:22",actor:"Admin User",actorRole:"admin",action:"PACKAGE_PRICE_UPDATE",entity:"PKG-001",description:"Premium Umrah package sell price changed.",ip:"192.168.1.21",severity:"info"},
  {id:"AUD-002",timestamp:"2026-08-28 14:42:10",actor:"Admin User",actorRole:"admin",action:"USER_PERMISSION_UPDATE",entity:"USR-002",description:"Sales Agent permissions updated.",ip:"192.168.1.21",severity:"warning"},
  {id:"AUD-003",timestamp:"2026-08-28 13:58:46",actor:"Arup Bera",actorRole:"sales_agent",action:"LEAD_UPDATED",entity:"LD-1001",description:"Lead status moved to Contacted.",ip:"192.168.1.44",severity:"info"},
  {id:"AUD-004",timestamp:"2026-08-28 11:21:03",actor:"Finance User",actorRole:"finance",action:"PAYMENT_CONFIRMED",entity:"BK-2026-000124",description:"Booking payment marked as paid.",ip:"192.168.1.51",severity:"info"},
  {id:"AUD-005",timestamp:"2026-08-27 18:07:11",actor:"Hotelier A",actorRole:"hotelier",action:"HOTEL_STOCK_SUBMITTED",entity:"HST-P-001",description:"New hotel stock submitted for approval.",ip:"192.168.1.72",severity:"info"},
];

export const clonePhase7Data=()=>({
  staff:structuredClone(mockStaff),
  roles:structuredClone(mockRoles),
  settings:structuredClone(mockSettings),
  auditLogs:structuredClone(mockAuditLogs),
  permissionCatalog:structuredClone(permissionCatalog),
});

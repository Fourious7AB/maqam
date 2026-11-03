import {
  Plane,
  Building2,
  Car,
  ClipboardList,
  Gift,
  Tag,
  CalendarDays,
  Settings,
  TrendingUp,
} from "lucide-react";

/* =========================================================
   DASHBOARD STATISTICS
========================================================= */

export const stats = [
  {
    label: "Total Bookings",
    value: "3,842",
    positive: true,
    icon: ClipboardList,
    iconClass: "bg-violet-100 text-violet-600",
  },

  {
    label: "Total Revenue",
    value: "$786,540",
    positive: true,
    icon: Gift,
    iconClass: "bg-emerald-100 text-emerald-600",
  },

  {
    label: "Active Customers",
    value: "2,458",
    // change: "12.5%",
    positive: true,
    icon: ClipboardList,
    iconClass: "bg-blue-100 text-blue-600",
  },

  // ------That section may be use for latter------

  // {
  //   label: "Available Inventory",
  //   value: "1,247",
  //   change: "8.6%",
  //   positive: true,
  //   icon: Tag,
  //   iconClass: "bg-orange-100 text-orange-600",
  // },

  // {
  //   label: "Pending Bookings",
  //   value: "128",
  //   change: "5.3%",
  //   positive: false,
  //   icon: CalendarDays,
  //   iconClass: "bg-rose-100 text-rose-600",
  // },
];

/* =========================================================
   INVENTORY MANAGEMENT
========================================================= */

export const managementData = [
  {
    title: "Flights Management",

    // FIXED: Plane instead of plane / Airplane
    icon: Plane,

    iconClass: "bg-blue-100 text-blue-600",

    metrics: [
      ["Total Flights", "632"],
      ["Active Routes", "186"],
      ["Airlines", "24"],
    ],

    tableTitle: "Popular Routes",

    columns: [
      "Route",
      "Available Seats",
      "Price (One Way)",
    ],

    rows: [
      // ["JED → MED", "23", "$320"],
      // ["RUH → JED", "15", "$280"],
     
    ],

    footer: "Manage Flights",
  },

  {
    title: "Hotels Management",

    icon: Building2,

    iconClass: "bg-emerald-100 text-emerald-600",

    metrics: [
      ["Total Hotels", "152"],
      ["Cities", "6"],
      ["Countries", "2"],
    ],

    tableTitle: "Top Cities",

    columns: [
      "City",
      "Available Rooms",
      "Avg. Price/Night",
    ],

    rows: [
      // ["Makkah", "420", "$95"],
      // ["Madinah", "365", "$85"],
      // ["Jeddah", "245", "$78"],
      // ["Taif", "180", "$65"],
    ],

    footer: "Manage Hotels",
  },

  {
    title: "Packages Management",

    icon: Gift,

    iconClass: "bg-violet-100 text-violet-600",

    metrics: [
      ["Total Packages", "214"],
      ["Active Packages", "168"],
      ["Categories", "12"],
    ],

    tableTitle: "Popular Packages",

    columns: [
      "Package",
      "Duration",
      "Price",
    ],

    rows: [
      // ["Makkah Umrah", "5D/4N", "$450"],
      // ["Madinah Heritage", "4D/3N", "$390"],
      // ["Makkah + Madinah", "7D/6N", "$680"],
      // ["Holy Cities Premium", "9D/8N", "$920"],
    ],

    footer: "Manage Packages",
  },

  {
    title: "Cabs Management",

    icon: Car,

    iconClass: "bg-orange-100 text-orange-600",

    metrics: [
      ["Total Cabs", "350"],
      ["Cities Covered", "58"],
      ["Partners", "18"],
    ],

    tableTitle: "Popular Routes",

    columns: [
      "Route",
      "Vehicle Type",
      "Price",
    ],

    rows: [
      // ["JED Airport → Makkah", "Sedan", "$25"],
      // ["Makkah → Madinah", "SUV", "$110"],
      // ["Madinah → Airport", "SUV", "$45"],
      // ["Jeddah → Madinah", "Innova", "$120"],
    ],

    footer: "Manage Cabs",
  },
];

/* =========================================================
   PRICING
========================================================= */

export const pricingItems = [
  [
    "Flights Pricing",
    "Update base fares, taxes & discounts",

    // FIXED
    Plane,

    "Updated",
    "bg-violet-100 text-violet-600",
  ],

  [
    "Hotels Pricing",
    "Manage hotel rates & seasonal pricing",

    Building2,

    "Updated",
    "bg-blue-100 text-blue-600",
  ],

  [
    "Packages Pricing",
    "Update package prices & offers",

    Gift,

    "Updated",
    "bg-orange-100 text-orange-600",
  ],

  [
    "Cabs Pricing",
    "Manage cab fares & distance pricing",

    Car,

    "Updated",
    "bg-emerald-100 text-emerald-600",
  ],
];

/* =========================================================
   RECENT BOOKINGS
========================================================= */

export const bookings = [
  // [
  //   "BK-2026-1285",
  //   "Rahul Sharma",
  //   "Flight",
  //   "$320",
  //   "Confirmed",
  // ],

  // [
  //   "BK-2026-1284",
  //   "Priya Patel",
  //   "Hotel",
  //   "$240",
  //   "Pending",
  // ],

  // [
  //   "BK-2026-1283",
  //   "Amit Kumar",
  //   "Package",
  //   "$680",
  //   "Confirmed",
  // ],

  // [
  //   "BK-2026-1282",
  //   "Neha Singh",
  //   "Cab",
  //   "$80",
  //   "Cancelled",
  // ],

  // [
  //   "BK-2026-1281",
  //   "Vikram Joshi",
  //   "Package",
  //   "$520",
  //   "Confirmed",
  // ],
];

/* =========================================================
   REVENUE
========================================================= */

export const revenueData = [
  {
    day: "Aug 14",
    revenue: 100,
  },

  {
    day: "Aug 15",
    revenue: 150,
  },

  {
    day: "Aug 16",
    revenue: 125,
  },

  {
    day: "Aug 17",
    revenue: 205,
  },

  {
    day: "Aug 18",
    revenue: 160,
  },

  {
    day: "Aug 19",
    revenue: 185,
  },

  {
    day: "Aug 20",
    revenue: 192,
  },
];

/* =========================================================
   TOP DESTINATIONS
========================================================= */

export const destinations = [
  ["Makkah", 845],
  ["Madinah", 642],
  ["Jeddah", 512],
  ["Taif", 480],
  ["Riyadh", 410],
];

/* =========================================================
   QUICK ACTIONS
========================================================= */

export const quickActions = [
  [
    "Add Flight",
    Plane,
    "bg-blue-50 text-blue-600",
  ],

  [
    "Add Hotel",
    Building2,
    "bg-orange-50 text-orange-600",
  ],

  [
    "Create Package",
    Gift,
    "bg-emerald-50 text-emerald-600",
  ],

  [
    "Add Cab",
    Car,
    "bg-orange-50 text-orange-600",
  ],

  [
    "Update Prices",
    Tag,
    "bg-violet-50 text-violet-600",
  ],

  [
    "Check Availability",
    CalendarDays,
    "bg-blue-50 text-blue-600",
  ],

  [
    "Manage Offers",
    Settings,
    "bg-violet-50 text-violet-600",
  ],

  // [
  //   "View Reports",
  //   TrendingUp,
  //   "bg-emerald-50 text-emerald-600",
  // ],
];
export const mockCustomersPhase6 = [
  { id:"CUS-001", name:"Ahmed Khan", phone:"+91 98765 43210", email:"ahmed@example.com", nationality:"Indian", city:"Kolkata", totalBookings:3, totalSpent:540000, status:"active", createdAt:"2026-06-12", travelersCount:4, notes:"Family traveler." },
  { id:"CUS-002", name:"Fatima Noor", phone:"+91 99887 11223", email:"fatima@example.com", nationality:"Indian", city:"Delhi", totalBookings:1, totalSpent:150000, status:"active", createdAt:"2026-07-04", travelersCount:2, notes:"Prefers premium hotel rooms." },
  { id:"CUS-003", name:"Omar Hassan", phone:"+91 90000 12345", email:"omar@example.com", nationality:"Indian", city:"Mumbai", totalBookings:2, totalSpent:720000, status:"active", createdAt:"2026-05-19", travelersCount:6, notes:"Group travel customer." },
  { id:"CUS-004", name:"Riya Singh", phone:"+91 95555 67890", email:"riya@example.com", nationality:"Indian", city:"Bengaluru", totalBookings:1, totalSpent:210000, status:"inactive", createdAt:"2026-04-16", travelersCount:4, notes:"Converted from lead." },
];

export const mockCustomerTravelers = {
  "CUS-001":[
    {id:"TRV-001",name:"Ahmed Khan",dob:"1990-01-01",gender:"Male",passport:"P1234567",nationality:"Indian"},
    {id:"TRV-002",name:"Fatima Khan",dob:"1992-05-10",gender:"Female",passport:"P2345678",nationality:"Indian"},
    {id:"TRV-003",name:"Ali Khan",dob:"2015-04-03",gender:"Male",passport:"P3456789",nationality:"Indian"},
    {id:"TRV-004",name:"Sara Khan",dob:"1995-08-08",gender:"Female",passport:"P4567890",nationality:"Indian"},
  ],
  "CUS-002":[
    {id:"TRV-005",name:"Fatima Noor",dob:"1989-02-12",gender:"Female",passport:"P5678901",nationality:"Indian"},
    {id:"TRV-006",name:"Ayaan Noor",dob:"2016-06-10",gender:"Male",passport:"P6789012",nationality:"Indian"},
  ],
  "CUS-003":[
    {id:"TRV-007",name:"Omar Hassan",dob:"1987-03-11",gender:"Male",passport:"P7890123",nationality:"Indian"},
  ],
  "CUS-004":[
    {id:"TRV-008",name:"Riya Singh",dob:"1993-08-18",gender:"Female",passport:"P8901234",nationality:"Indian"},
  ],
};

export const mockTransactions = [
  {id:"TXN-99881",date:"2026-08-28",bookingNumber:"BK-2026-000124",customer:"Ahmed Khan",type:"payment",method:"UPI",amount:260000,status:"success",reference:"UPI-99881"},
  {id:"TXN-99882",date:"2026-08-28",bookingNumber:"BK-2026-000125",customer:"Fatima Noor",type:"payment",method:"Card",amount:50000,status:"success",reference:"CARD-99882"},
  {id:"TXN-99883",date:"2026-08-27",bookingNumber:"BK-2026-000118",customer:"Omar Hassan",type:"refund",method:"Bank",amount:-35000,status:"success",reference:"RF-99883"},
  {id:"TXN-99884",date:"2026-08-27",bookingNumber:"BK-2026-000117",customer:"Riya Singh",type:"payment",method:"UPI",amount:210000,status:"success",reference:"UPI-99884"},
  {id:"TXN-99885",date:"2026-08-26",bookingNumber:"BK-2026-000114",customer:"Neha Gupta",type:"payment",method:"Net Banking",amount:125000,status:"pending",reference:"NB-99885"},
];

export const mockRefunds = [
  {id:"RF-001",bookingNumber:"BK-2026-000118",customer:"Omar Hassan",requestedAt:"2026-08-27",amount:35000,reason:"Travel date change",status:"processed"},
  {id:"RF-002",bookingNumber:"BK-2026-000109",customer:"Priya Mehta",requestedAt:"2026-08-25",amount:18000,reason:"Package cancellation",status:"pending"},
  {id:"RF-003",bookingNumber:"BK-2026-000101",customer:"Aamir Siddiqui",requestedAt:"2026-08-22",amount:22000,reason:"Hotel downgrade",status:"approved"},
];

export const mockRevenueReport = {
  months:[
    {label:"Mar",revenue:12.2,bookings:58},
    {label:"Apr",revenue:13.8,bookings:64},
    {label:"May",revenue:12.9,bookings:61},
    {label:"Jun",revenue:15.4,bookings:70},
    {label:"Jul",revenue:16.7,bookings:76},
    {label:"Aug",revenue:18.4,bookings:86},
  ],
  channels:[
    {label:"Website",value:32},
    {label:"Sales Agents",value:28},
    {label:"Referral",value:18},
    {label:"WhatsApp",value:14},
    {label:"Other",value:8},
  ]
};

export function clonePhase6Data(){
  return {
    customers:structuredClone(mockCustomersPhase6),
    travelers:structuredClone(mockCustomerTravelers),
    transactions:structuredClone(mockTransactions),
    refunds:structuredClone(mockRefunds),
    reports:structuredClone(mockRevenueReport),
  };
}

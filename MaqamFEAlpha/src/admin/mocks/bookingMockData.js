export const mockCustomers = [
  { id:"CUS-001", name:"Ahmed Khan", phone:"+91 98765 43210", email:"ahmed@example.com", nationality:"Indian" },
  { id:"CUS-002", name:"Fatima Noor", phone:"+91 99887 11223", email:"fatima@example.com", nationality:"Indian" },
  { id:"CUS-003", name:"Omar Hassan", phone:"+91 90000 12345", email:"omar@example.com", nationality:"Indian" },
  { id:"CUS-004", name:"Riya Singh", phone:"+91 95555 67890", email:"riya@example.com", nationality:"Indian" },
];

export const mockBookings = [
  {
    id:"BK-2026-000124",
    bookingNumber:"BK-2026-000124",
    customerId:"CUS-001",
    customerName:"Ahmed Khan",
    packageId:"PKG-001",
    packageName:"Premium Umrah",
    tripType:"existing_package",
    travelDate:"2026-09-12",
    returnDate:"2026-09-21",
    travelers:[
      { id:"TRV-001", firstName:"Ahmed", lastName:"Khan", dateOfBirth:"1990-01-01", gender:"male", passportNumber:"P1234567", nationality:"Indian", phone:"+91 98765 43210", email:"ahmed@example.com", type:"adult", status:"confirmed" },
      { id:"TRV-002", firstName:"Fatima", lastName:"Khan", dateOfBirth:"1992-05-10", gender:"female", passportNumber:"P2345678", nationality:"Indian", phone:"+91 98765 43210", email:"fatima@example.com", type:"adult", status:"confirmed" },
      { id:"TRV-003", firstName:"Ali", lastName:"Khan", dateOfBirth:"2015-04-03", gender:"male", passportNumber:"P3456789", nationality:"Indian", phone:"+91 98765 43210", email:"ali@example.com", type:"child", status:"confirmed" },
      { id:"TRV-004", firstName:"Sara", lastName:"Khan", dateOfBirth:"1995-08-08", gender:"female", passportNumber:"P4567890", nationality:"Indian", phone:"+91 98765 43210", email:"sara@example.com", type:"adult", status:"confirmed" },
    ],
    inventoryClaims:[
      { id:"CLM-F-1", type:"flight", label:"DEL → JED", quantity:4, status:"confirmed", lockStatus:"released" },
      { id:"CLM-H-1", type:"hotel", label:"Clock Tower · Deluxe Double", quantity:2, unit:"rooms", status:"confirmed", lockStatus:"released" },
      { id:"CLM-G-1", type:"guide", label:"Private guide", quantity:1, status:"confirmed", lockStatus:"released" },
      { id:"CLM-V-1", type:"visa", label:"Saudi Tourist E-Visa", quantity:4, status:"confirmed", lockStatus:"released" },
    ],
    pricing:{
      components:[
        { label:"Flight", amount:80000 },
        { label:"Hotel", amount:100000 },
        { label:"Visa", amount:32000 },
        { label:"Guide", amount:12000 },
        { label:"Transfers", amount:5000 },
      ],
      subtotal:229000,
      discount:0,
      total:260000,
      cost:229000,
      profit:31000,
      currency:"INR",
    },
    payment:{ status:"paid", method:"online", transactionId:"TXN-99881", paidAmount:260000, paidAt:"2026-08-28T11:20:00" },
    otpVerification:{ verified:true, verificationToken:"masked-token", verifiedAt:"2026-08-28T11:10:00" },
    status:"confirmed",
    createdAt:"2026-08-28T10:50:00",
    packageSnapshot:{
      title:"Premium Umrah",
      sellPrice:85000,
      destination:"Makkah & Madinah",
      durationDays:10,
      itineraryVersion:"v1",
    },
    activity:[
      { id:"A1", title:"Booking created", detail:"Booking request was created.", time:"28 Aug, 10:50" },
      { id:"A2", title:"Inventory locked", detail:"4 seats and 2 rooms were locked.", time:"28 Aug, 10:55" },
      { id:"A3", title:"OTP verified", detail:"Customer phone verified.", time:"28 Aug, 11:10" },
      { id:"A4", title:"Payment received", detail:"Payment successfully captured.", time:"28 Aug, 11:20" },
    ],
  },
  {
    id:"BK-2026-000125",
    bookingNumber:"BK-2026-000125",
    customerId:"CUS-002",
    customerName:"Fatima Noor",
    packageId:"PKG-002",
    packageName:"Dubai Luxury",
    tripType:"existing_package",
    travelDate:"2026-10-05",
    returnDate:"2026-10-11",
    travelers:[
      { id:"TRV-005", firstName:"Fatima", lastName:"Noor", dateOfBirth:"1989-02-12", gender:"female", passportNumber:"P5678901", nationality:"Indian", phone:"+91 99887 11223", email:"fatima@example.com", type:"adult", status:"pending" },
      { id:"TRV-006", firstName:"Ayaan", lastName:"Noor", dateOfBirth:"2016-06-10", gender:"male", passportNumber:"P6789012", nationality:"Indian", phone:"+91 99887 11223", email:"ayaan@example.com", type:"child", status:"pending" },
    ],
    inventoryClaims:[],
    pricing:{ components:[{label:"Flight",amount:48000},{label:"Hotel",amount:87000}], subtotal:135000, discount:0,total:150000,cost:135000,profit:15000,currency:"INR" },
    payment:{ status:"pending", method:null, transactionId:null, paidAmount:0, paidAt:null },
    otpVerification:{ verified:false, verificationToken:null, verifiedAt:null },
    status:"payment_pending",
    createdAt:"2026-08-28T12:00:00",
    packageSnapshot:{ title:"Dubai Luxury", sellPrice:125000, destination:"Dubai", durationDays:7, itineraryVersion:"v1" },
    activity:[{id:"A5",title:"Booking created",detail:"Booking is awaiting OTP/payment.",time:"28 Aug, 12:00"}],
  },
];

export const mockBookingPackages = [
  {
    id:"PKG-001", title:"Premium Umrah", destination:"Makkah & Madinah",
    sellPrice:85000, durationDays:10, nights:9, defaultTravelers:1,
    flights:[{id:"FLT-STK-001",label:"DEL → JED · Saudia · ABC123",available:32,costPerTraveler:20000}],
    hotels:[{id:"HST-001",label:"Clock Tower · Deluxe Double",availableRooms:18,occupancy:2,pricePerNight:10000}],
    guide:{enabled:true,cost:12000}, visa:{enabled:true,costPerTraveler:8000},
    transfers:[{id:"TR-001",label:"Private Transfer",price:5000}],
  },
  {
    id:"PKG-002", title:"Dubai Luxury", destination:"Dubai",
    sellPrice:125000,durationDays:7,nights:6,defaultTravelers:1,
    flights:[{id:"FLT-STK-003",label:"DEL → DXB · Emirates · DXB222",available:20,costPerTraveler:24000}],
    hotels:[{id:"HST-003",label:"Downtown Grand · Deluxe King",availableRooms:12,occupancy:2,pricePerNight:14500}],
    guide:{enabled:false,cost:0},visa:{enabled:true,costPerTraveler:8200},
    transfers:[{id:"TR-101",label:"Airport Transfer",price:4500}],
  },
];

export function cloneBookingData(){
  return {
    customers:structuredClone(mockCustomers),
    bookings:structuredClone(mockBookings),
    packages:structuredClone(mockBookingPackages),
  };
}

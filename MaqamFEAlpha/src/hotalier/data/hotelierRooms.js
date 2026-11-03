// -----------------------------------------------------------------------------
// Mock rooms for the Hotelier Dashboard.
//
// These are the "hard coded" rooms the brief mentions. They act as the initial /
// fallback data: when no backend is configured the dashboard runs entirely on
// this list; when VITE_API_URL is set, GET /hotelier/rooms replaces it.
//
// Image URLs are placeholders today. Once Cloudinary is wired up (see
// src/services/upload.js) newly added rooms will carry real uploaded URLs, and
// the card renders whatever URLs live on the room — no code change needed.
// -----------------------------------------------------------------------------

// The three preset room types the brief calls out, plus an "Others" escape hatch
// that lets the hotelier type a custom type in the form.
export const ROOM_TYPES = [
  "Standard Room",
  "Deluxe Room",
  "Executive Suite",
  "Others",
];

const img = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=60`;

export const hotelierRooms = [
  {
    id: "RM-101",
    type: "Standard Room",
    images: [img("photo-1611892440504-42a792e24d32"), img("photo-1522771739844-6a9f6d5f14af")],
    price: 220,
    currency: "SAR",
    capacity: 2,
    rating: 4,
    meal: { provided: true, plan: "Breakfast included", price: 0 },
    amenities: ["Wi-Fi", "AC", "Haram Shuttle"],
    total: 40,
    available: 26,
  },
  {
    id: "RM-102",
    type: "Deluxe Room",
    images: [img("photo-1582719478250-c89cae4dc85b"), img("photo-1590490360182-c33d57733427")],
    price: 340,
    currency: "SAR",
    capacity: 3,
    rating: 5,
    meal: { provided: true, plan: "Breakfast + Dinner", price: 45 },
    amenities: ["Wi-Fi", "AC", "Kaaba View", "Mini Bar"],
    total: 24,
    available: 5,
  },
  {
    id: "RM-103",
    type: "Executive Suite",
    images: [img("photo-1631049307264-da0ec9d70304"), img("photo-1618773928121-c32242e63f39")],
    price: 720,
    currency: "SAR",
    capacity: 5,
    rating: 5,
    meal: { provided: true, plan: "Full board", price: 90 },
    amenities: ["Wi-Fi", "AC", "Kaaba View", "Living Area", "Prayer Corner"],
    total: 8,
    available: 0,
  },
  {
    id: "RM-104",
    type: "Standard Room",
    images: [img("photo-1560448204-e02f11c3d0e2")],
    price: 260,
    currency: "SAR",
    capacity: 4,
    rating: 4,
    meal: { provided: false, plan: "", price: 0 },
    amenities: ["Wi-Fi", "AC", "Family Room"],
    total: 30,
    available: 18,
  },
];

// Availability status drives the coloured badge on each card.
// Sold Out -> none left, Limited -> under ~20% remaining, else Available.
export function deriveRoomStatus(available, total) {
  const t = Number(total) || 0;
  const a = Number(available) || 0;
  if (a <= 0) return "Sold Out";
  if (t > 0 && a / t <= 0.2) return "Limited";
  return "Available";
}

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Star,
  MapPin,
  Wifi,
  Phone,
  CalendarClock,
  Clock,
  Hotel,
  PhoneCall,
  Sparkles,
  Shield,
  CreditCard,
  CheckCircle,
  Coffee,
  Utensils,
  Dumbbell,
  Car,
  Waves,
  Wind,
  Tv,
  Snowflake,
  Briefcase,
  Users,
  Gift,
  Heart,
  Share2,
  Maximize2,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Crown,
  Ruler,
  Bed,
  Wine,
  WifiIcon,
  Thermometer,
  TvIcon,
  CoffeeIcon,
  Microwave,
  ShowerHead,
  Key,
  Bath,
  UtensilsCrossed,
  DoorOpen,
  Sparkle,
  Calendar,
  Eye,
  CheckCircle2,
  Compass,
  ArrowRight,
  Building2,
} from "lucide-react";
import { MdOutlineMarkEmailRead } from "react-icons/md";
import { WiGaleWarning } from "react-icons/wi";
import { BiFridge } from "react-icons/bi";
import { fetchHotelDetails } from "../components/reducer/HotelSearchSlice";
import axios from "axios";
import { HotelDetailsAPI, OfferAPI, getApiBaseUrl } from "../configs/api";
import HotelFacilities from "../components/HotelFacilities";
import HotelPolicies from "../components/HotelPolicies";
import CommonHeader from "../components/CommonHeader";
import HotelRoomAvailability from "../components/HotelRoomAvailability";
import Room from "../components/Room";
import HotelRoomsListing from "../components/HotelRoomsListing";
import ScrollToTop from "../components/ScrollToTop";
import { toast } from "react-toastify";

// Curated high-definition luxury hotel imagery & details
const curatedLuxuryHotels = [
  {
    id: "m1",
    aliases: ["m1", "fairmont", "makkah-clock-royal-tower", "fairmont-makkah"],
    name: "Fairmont Makkah Clock Royal Tower",
    tagline: "Ultra-luxury stay directly overlooking the Holy Kaaba",
    hotelType: "5-Star Luxury Hotel",
    rating: 9.6,
    reviewCount: 2840,
    price: "₹18,500",
    address: "King Abdul Aziz Endowment, Abraj Al Bait Complex",
    city: "Makkah",
    country: "Saudi Arabia",
    zip: "21955",
    phone: "+966 12 571 7777",
    email: "reservations.makkah@fairmont.com",
    distanceToHaram: "Adjacent to Masjid Al Haram (0 meters)",
    checkinCheckoutTimes: {
      checkin_start: "16:00",
      checkin_end: "00:00",
      checkout: "12:00",
    },
    main_photo:
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=1600",
    hotelImages: [
      {
        url: "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=1600",
        caption: "Fairmont Makkah Clock Royal Tower",
      },
      {
        url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
        caption: "Presidential Kaaba View Suite",
      },
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85",
        caption: "Grand Deluxe King Bedroom",
      },
      {
        url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
        caption: "Grand Lobby & Concierge",
      },
      {
        url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85",
        caption: "Al Dira International Dining",
      },
    ],
    description:
      "Located within the iconic Abraj Al Bait Complex, Fairmont Makkah Clock Royal Tower offers unmatched hospitality for pilgrims. Featuring 76 floors of unparalleled luxury with direct prayer audio broadcast from the Holy Mosque, personalized butler service, and direct elevator access to the Haram piazza.",
    hotelFacilities: [
      "Free High-Speed WiFi",
      "Direct Haram View Rooms",
      "Halal Fine Dining Buffet",
      "24/7 Room Service & Butler",
      "Direct Elevator to Haram",
      "Valet Parking",
      "Fitness Center & Spa",
      "Executive Business Lounge",
      "Concierge & Luggage Assistance",
      "Prayer Hall with Kaaba View",
    ],
    policies: [
      "Check-in from 16:00, Check-out until 12:00",
      "Valid identification required at check-in",
      "Non-smoking throughout all guest rooms",
      "Cancellation is free up to 48 hours prior to arrival",
    ],
    hotelImportantInformation:
      "Live prayer times audio broadcast to all suites. Concierge provides 24/7 luggage transfer to Haram piazza.",
    rooms: [
      {
        id: "rm-1",
        roomName: "Signature Kaaba View King Suite",
        roomSizeSquare: "65",
        roomSizeUnit: "sq m",
        maxOccupancy: 3,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "Direct Kaaba View" }],
        bedRelation: "1 King Bed",
        bedTypes: ["1 Extra-Large Double Bed"],
        price: "₹24,999",
      },
      {
        id: "rm-2",
        roomName: "Deluxe Twin Haram View Room",
        roomSizeSquare: "48",
        roomSizeUnit: "sq m",
        maxOccupancy: 3,
        maxAdults: 2,
        maxChildren: 2,
        photos: [{ url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "Haram Piazza View" }],
        bedRelation: "2 Twin Beds",
        bedTypes: ["2 Single Beds"],
        price: "₹18,500",
      },
    ],
  },
  {
    id: "m2",
    aliases: ["m2", "pullman-zamzam-makkah", "zamzam", "pullman-zamzam"],
    name: "Pullman ZamZam Makkah",
    tagline: "Direct access to Haram complex with panoramic holy city views",
    hotelType: "5-Star Premium Hotel",
    rating: 9.5,
    reviewCount: 2420,
    price: "₹14,200",
    address: "Abraj Al Bait Complex, King Abdul Aziz Endowment",
    city: "Makkah",
    country: "Saudi Arabia",
    zip: "21955",
    phone: "+966 12 571 5555",
    email: "h6329@accor.com",
    distanceToHaram: "50m to King Abdulaziz Gate (Direct Access)",
    checkinCheckoutTimes: {
      checkin_start: "16:00",
      checkin_end: "23:59",
      checkout: "12:00",
    },
    main_photo:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1600",
    hotelImages: [
      {
        url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1600",
        caption: "Pullman ZamZam Makkah Suite",
      },
      {
        url: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85",
        caption: "Deluxe King Haram View",
      },
      {
        url: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=85",
        caption: "Executive 2-Bedroom Suite",
      },
      {
        url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
        caption: "Hotel Grand Lobby",
      },
      {
        url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85",
        caption: "Al Zahra Restaurant Buffet",
      },
    ],
    description:
      "Pullman ZamZam Makkah is a prestigious 5-star destination in Abraj Al Bait. Offering 1,315 suites and rooms with direct audio link to the Holy Mosque, state-of-the-art amenities, high-speed elevators to the prayer courtyard, and gourmet halal dining.",
    hotelFacilities: [
      "Free High-Speed WiFi",
      "Direct Haram Complex Access",
      "Live Haram Audio Broadcast",
      "Halal International Buffet",
      "24/7 Concierge & Porter Service",
      "Valet Parking",
      "On-site ATM & Currency Exchange",
      "Wheelchair Accessible Elevators",
    ],
    policies: [
      "Check-in from 16:00, Check-out until 12:00",
      "Valid photo identification required",
      "Complimentary baby cot available upon request",
      "Free cancellation up to 48 hours before stay",
    ],
    hotelImportantInformation:
      "Direct escalator and elevator connections provide seamless access to the prayer floor and piazza of Masjid Al-Haram.",
    rooms: [
      {
        id: "pzm-1",
        roomName: "Executive Haram View King Suite",
        roomSizeSquare: "52",
        roomSizeUnit: "sq m",
        maxOccupancy: 3,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "Holy Haram View" }],
        bedRelation: "1 King Bed",
        bedTypes: ["1 Large Double Bed"],
        price: "₹17,500",
      },
      {
        id: "pzm-2",
        roomName: "Classic Twin City View",
        roomSizeSquare: "40",
        roomSizeUnit: "sq m",
        maxOccupancy: 2,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "Makkah City View" }],
        bedRelation: "2 Twin Beds",
        bedTypes: ["2 Single Beds"],
        price: "₹14,200",
      },
    ],
  },
  {
    id: "m3",
    aliases: ["m3", "swissotel", "swissotel-makkah", "swissôtel"],
    name: "Swissôtel Makkah",
    tagline: "Spacious luxury family suites with direct Haram piazza access",
    hotelType: "5-Star Luxury Comfort",
    rating: 9.5,
    reviewCount: 2150,
    price: "₹15,800",
    address: "Ajyad Street, Abraj Al Bait, Makkah",
    city: "Makkah",
    country: "Saudi Arabia",
    zip: "21955",
    phone: "+966 12 571 8000",
    email: "makkah@swissotel.com",
    distanceToHaram: "100m to King Abdulaziz Gate",
    checkinCheckoutTimes: {
      checkin_start: "16:00",
      checkin_end: "00:00",
      checkout: "12:00",
    },
    main_photo:
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1600",
    hotelImages: [
      {
        url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1600",
        caption: "Swissôtel Makkah Luxury Suite",
      },
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85",
        caption: "Grand Junior Suite",
      },
      {
        url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
        caption: "Kaaba View Deluxe Room",
      },
      {
        url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85",
        caption: "Al Ruwad Restaurant",
      },
    ],
    description:
      "Swissôtel Makkah is the first Swissôtel in the Middle East. Featuring 1,487 elegant rooms and suites with contemporary warm design, unmatched views of the Kaaba, spacious family accommodations, and personalized pilgrimage assistance.",
    hotelFacilities: [
      "Free High-Speed WiFi",
      "Direct Private Entrance from Ajyad Street",
      "Full Kaaba & Haram View Suites",
      "Al Ruwad Fine Dining Restaurant",
      "24/7 Room Dining",
      "Business Lounge & Meeting Suites",
      "Dedicated Family Suites",
    ],
    policies: [
      "Check-in: 16:00 | Check-out: 12:00",
      "Government issued photo ID required at check-in",
      "Free cancellation up to 48 hours prior to arrival",
    ],
    hotelImportantInformation:
      "Features two private entrances: one facing Ajyad Street and direct internal access to the Abraj Al Bait shopping complex and Haram courtyard.",
    rooms: [
      {
        id: "sw-1",
        roomName: "Junior Kaaba View Suite",
        roomSizeSquare: "55",
        roomSizeUnit: "sq m",
        maxOccupancy: 3,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "Kaaba View" }],
        bedRelation: "1 King Bed",
        bedTypes: ["1 Large Double Bed"],
        price: "₹19,200",
      },
      {
        id: "sw-2",
        roomName: "Classic King City Room",
        roomSizeSquare: "38",
        roomSizeUnit: "sq m",
        maxOccupancy: 2,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "Makkah City View" }],
        bedRelation: "1 King Bed",
        bedTypes: ["1 Large Double Bed"],
        price: "₹15,800",
      },
    ],
  },
  {
    id: "m4",
    aliases: ["m4", "hilton-suites", "hilton-suites-makkah", "hilton"],
    name: "Hilton Suites Makkah",
    tagline: "Overlooking Masjid al-Haram with private prayer halls & luxury amenities",
    hotelType: "5-Star Modern Luxury",
    rating: 9.4,
    reviewCount: 1890,
    price: "₹16,900",
    address: "Ibrahim Al Khalil Road, Jabal Omar, Makkah",
    city: "Makkah",
    country: "Saudi Arabia",
    zip: "21955",
    phone: "+966 12 534 2222",
    email: "makkah.suites@hilton.com",
    distanceToHaram: "100m to King Fahd Gate (Opposite Haram)",
    checkinCheckoutTimes: {
      checkin_start: "16:00",
      checkin_end: "00:00",
      checkout: "12:00",
    },
    main_photo:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1600",
    hotelImages: [
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1600",
        caption: "Hilton Suites Makkah Living Area",
      },
      {
        url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
        caption: "Haram View King Bedroom",
      },
      {
        url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
        caption: "Lobby & Jabal Omar Courtyard",
      },
      {
        url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85",
        caption: "Alqandeel International Restaurant",
      },
    ],
    description:
      "Overlooking the Holy Haram piazza in Jabal Omar, Hilton Suites Makkah provides luxurious all-suite living with separate living rooms, soundproof marble finishes, 2 internal air-conditioned prayer halls overlooking the Haram, and attentive concierge service.",
    hotelFacilities: [
      "Free High-Speed WiFi",
      "2 Air-Conditioned Prayer Halls Overlooking Haram",
      "All-Suite Living Accommodations",
      "24/7 Room Dining & Butler",
      "Jabal Omar Commercial Mall Access",
      "Valet Parking & Airport Limousine",
    ],
    policies: [
      "Check-in: 16:00 | Check-out: 12:00",
      "Valid identification required upon arrival",
      "Cancellation free up to 24 hours prior to check-in",
    ],
    hotelImportantInformation:
      "Equipped with prayer halls for men and women with live audio broadcasting from Masjid Al-Haram.",
    rooms: [
      {
        id: "hs-1",
        roomName: "Haram View 1-Bedroom King Suite",
        roomSizeSquare: "58",
        roomSizeUnit: "sq m",
        maxOccupancy: 3,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "Haram View" }],
        bedRelation: "1 King Bed + Sofa Bed",
        bedTypes: ["1 King Bed"],
        price: "₹21,500",
      },
      {
        id: "hs-2",
        roomName: "Deluxe Twin City Suite",
        roomSizeSquare: "46",
        roomSizeUnit: "sq m",
        maxOccupancy: 3,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "City View" }],
        bedRelation: "2 Twin Beds",
        bedTypes: ["2 Single Beds"],
        price: "₹16,900",
      },
    ],
  },
  {
    id: "med1",
    aliases: ["med1", "movenpick", "anwar-al-madinah", "movenpick-madinah"],
    name: "Anwar Al Madinah Mövenpick",
    tagline: "Directly facing Haram courtyard & Prophet's Mosque",
    hotelType: "5-Star Premium Hotel",
    rating: 9.4,
    reviewCount: 2200,
    price: "₹12,500",
    address: "Central Northern Area, Madinah",
    city: "Madinah",
    country: "Saudi Arabia",
    zip: "41411",
    phone: "+966 14 818 1000",
    email: "hotel.anwar.reservation@movenpick.com",
    distanceToHaram: "Facing Bab Al Salam entrance (0 meters)",
    checkinCheckoutTimes: {
      checkin_start: "16:00",
      checkin_end: "23:00",
      checkout: "12:00",
    },
    main_photo:
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=1600",
    hotelImages: [
      {
        url: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=1600",
        caption: "Anwar Al Madinah Mövenpick Courtyard View",
      },
      {
        url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
        caption: "Executive King Suite",
      },
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85",
        caption: "Deluxe Twin Bedroom",
      },
      {
        url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85",
        caption: "Al Madinah Fine Dining",
      },
    ],
    description:
      "Madinah's largest hotel property, Anwar Al Madinah Mövenpick is located directly on the northern courtyard of Al-Masjid an-Nabawi. Offering unmatched proximity to the Holy Rawdah, shopping arcade, underground parking, and fine halal dining.",
    hotelFacilities: [
      "Free High-Speed WiFi",
      "Direct Step-Out to Prophet's Mosque Courtyard",
      "Executive Business Lounge",
      "4 On-Site Halal Restaurants",
      "Shopping Arcade & Direct Underground Parking",
      "24/7 Room Service",
    ],
    policies: [
      "Check-in: 16:00 | Check-out: 12:00",
      "Valid government photo ID required at check-in",
      "Cancellation free up to 24 hours before stay",
    ],
    hotelImportantInformation:
      "Located closest to the women's prayer entrance at Al-Masjid an-Nabawi.",
    rooms: [
      {
        id: "aam-1",
        roomName: "Haram Courtyard View King",
        roomSizeSquare: "44",
        roomSizeUnit: "sq m",
        maxOccupancy: 3,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "Prophet's Mosque View" }],
        bedRelation: "1 King Bed",
        bedTypes: ["1 Large Double Bed"],
        price: "₹15,000",
      },
      {
        id: "aam-2",
        roomName: "Classic Twin Room",
        roomSizeSquare: "36",
        roomSizeUnit: "sq m",
        maxOccupancy: 2,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "City View" }],
        bedRelation: "2 Twin Beds",
        bedTypes: ["2 Single Beds"],
        price: "₹12,500",
      },
    ],
  },
  {
    id: "med2",
    aliases: ["med2", "pullman-zamzam-madina", "pullman-madina", "zamzam-madinah"],
    name: "Pullman ZamZam Madinah",
    tagline: "Luxury sanctuary located steps from Al-Masjid an-Nabawi",
    hotelType: "5-Star Luxury Hotel",
    rating: 9.5,
    reviewCount: 1980,
    price: "₹11,800",
    address: "Amr Bin Al Ghas Street, Central Northern Area",
    city: "Madinah",
    country: "Saudi Arabia",
    zip: "41411",
    phone: "+966 14 821 0500",
    email: "h7570@accor.com",
    distanceToHaram: "150 meters to Bab Al Salam",
    checkinCheckoutTimes: {
      checkin_start: "16:00",
      checkin_end: "23:00",
      checkout: "12:00",
    },
    main_photo:
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=1600",
    hotelImages: [
      {
        url: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=1600",
        caption: "Pullman ZamZam Madinah",
      },
      {
        url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
        caption: "Hotel Exterior & Courtyard",
      },
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85",
        caption: "Deluxe King Suite",
      },
      {
        url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85",
        caption: "Al Mandara Fine Dining",
      },
    ],
    description:
      "Pullman ZamZam Madinah is an oasis of tranquility just 150 meters from the Holy Prophet's Mosque. Boasting contemporary Islamic architecture, soundproof rooms, Arabic coffee hospitality, and gourmet dining.",
    hotelFacilities: [
      "Free High-Speed WiFi",
      "Walking Distance to Masjid an-Nabawi",
      "Halal Gastronomy & Room Dining",
      "Valet Parking & Luggage Porter",
      "Business Lounge & Fast Check-in",
    ],
    policies: [
      "Check-in: 16:00 - 23:00 | Check-out: 12:00",
      "Photo identification required",
      "Cancellation free up to 24 hours prior",
    ],
    hotelImportantInformation:
      "Wheelchair accessibility available throughout the property.",
    rooms: [
      {
        id: "pz-1",
        roomName: "Classic King Mosque View",
        roomSizeSquare: "42",
        roomSizeUnit: "sq m",
        maxOccupancy: 3,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "Mosque View" }],
        bedRelation: "1 King Bed",
        bedTypes: ["1 Large Double Bed"],
        price: "₹14,500",
      },
      {
        id: "pz-2",
        roomName: "Deluxe Twin Room",
        roomSizeSquare: "38",
        roomSizeUnit: "sq m",
        maxOccupancy: 2,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "City View" }],
        bedRelation: "2 Single Beds",
        bedTypes: ["2 Single Beds"],
        price: "₹11,800",
      },
    ],
  },
  {
    id: "med3",
    aliases: ["med3", "madinah-hilton", "hilton-madinah"],
    name: "Madinah Hilton",
    tagline: "Few minutes walk to Prophet's Mosque with classic five-star service",
    hotelType: "5-Star Classic Hotel",
    rating: 9.3,
    reviewCount: 1760,
    price: "₹13,000",
    address: "King Fahd Street, Central Area, Madinah",
    city: "Madinah",
    country: "Saudi Arabia",
    zip: "41411",
    phone: "+966 14 820 1000",
    email: "madinah.hilton@hilton.com",
    distanceToHaram: "2 minutes walk to Prophet's Mosque",
    checkinCheckoutTimes: {
      checkin_start: "16:00",
      checkin_end: "00:00",
      checkout: "12:00",
    },
    main_photo:
      "https://images.unsplash.com/photo-1611891487122-2075b9624448?q=80&w=1600",
    hotelImages: [
      {
        url: "https://images.unsplash.com/photo-1611891487122-2075b9624448?q=80&w=1600",
        caption: "Madinah Hilton Grand Suite",
      },
      {
        url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
        caption: "Deluxe King Bedroom",
      },
      {
        url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
        caption: "Hotel Lobby",
      },
    ],
    description:
      "Situated in the heart of Madinah's shopping district, Madinah Hilton is only a short 2-minute stroll from the Holy Mosque. Features traditional Islamic artwork, extensive dining options, and dedicated concierge.",
    hotelFacilities: [
      "Free High-Speed WiFi",
      "Short Walk to Prophet's Mosque",
      "Executive Floor Lounge",
      "Madinah Art Restaurant",
      "24/7 Room Service",
      "Valet Parking",
    ],
    policies: [
      "Check-in: 16:00 | Check-out: 12:00",
      "Photo ID required at check-in",
      "Free cancellation before arrival",
    ],
    hotelImportantInformation:
      "Centrally located near the northern entrance of Masjid an-Nabawi.",
    rooms: [
      {
        id: "mh-1",
        roomName: "Deluxe King Mosque View",
        roomSizeSquare: "42",
        roomSizeUnit: "sq m",
        maxOccupancy: 3,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1611891487122-2075b9624448?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "Mosque View" }],
        bedRelation: "1 King Bed",
        bedTypes: ["1 Large Double Bed"],
        price: "₹16,000",
      },
      {
        id: "mh-2",
        roomName: "Standard Twin City Room",
        roomSizeSquare: "36",
        roomSizeUnit: "sq m",
        maxOccupancy: 2,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "City View" }],
        bedRelation: "2 Single Beds",
        bedTypes: ["2 Single Beds"],
        price: "₹13,000",
      },
    ],
  },
  {
    id: "med4",
    aliases: ["med4", "dar-al-taqwa", "taqwa", "dar-al-taqwa-madinah"],
    name: "Dar Al Taqwa Hotel Madinah",
    tagline: "Prime VIP location directly opposite the Prophet's Mosque courtyard",
    hotelType: "5-Star Luxury VIP Hotel",
    rating: 9.7,
    reviewCount: 1650,
    price: "₹17,200",
    address: "Opposite Prophet's Mosque, Off Courtyard, Madinah",
    city: "Madinah",
    country: "Saudi Arabia",
    zip: "41411",
    phone: "+966 14 829 1111",
    email: "info@daraltaqwahotel.com",
    distanceToHaram: "Directly opposite Prophet's Mosque Courtyard (0 meters)",
    checkinCheckoutTimes: {
      checkin_start: "16:00",
      checkin_end: "00:00",
      checkout: "12:00",
    },
    main_photo:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1600",
    hotelImages: [
      {
        url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1600",
        caption: "Dar Al Taqwa Hotel Luxury Suite",
      },
      {
        url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
        caption: "Royal Suite Courtyard View",
      },
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85",
        caption: "Deluxe King Bedroom",
      },
    ],
    description:
      "Dar Al Taqwa Hotel Madinah offers an ultra-exclusive location facing the main entrance of the Holy Prophet's Mosque. Renowned for discreet luxury, personalized butler service, tea garden, and majestic courtyard vistas.",
    hotelFacilities: [
      "Free High-Speed WiFi",
      "Facing Main Courtyard of Prophet's Mosque",
      "Al Marwa Fine Dining Restaurant",
      "24/7 VIP Butler & Concierge",
      "Valet Parking & Executive Airport Transfer",
    ],
    policies: [
      "Check-in: 16:00 | Check-out: 12:00",
      "Valid photo identification required",
      "Cancellation free up to 48 hours before check-in",
    ],
    hotelImportantInformation:
      "Immediate VIP access to the Haram piazza and the ladies' gate.",
    rooms: [
      {
        id: "dat-1",
        roomName: "Royal Courtyard View Suite",
        roomSizeSquare: "60",
        roomSizeUnit: "sq m",
        maxOccupancy: 3,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "Prophet's Mosque View" }],
        bedRelation: "1 King Bed",
        bedTypes: ["1 Extra-Large Double Bed"],
        price: "₹23,000",
      },
      {
        id: "dat-2",
        roomName: "Executive Deluxe Room",
        roomSizeSquare: "42",
        roomSizeUnit: "sq m",
        maxOccupancy: 2,
        maxAdults: 2,
        maxChildren: 1,
        photos: [{ url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80" }],
        views: [{ view: "City View" }],
        bedRelation: "1 King or 2 Single Beds",
        bedTypes: ["1 King Bed"],
        price: "₹17,200",
      },
    ],
  },
];

const HotelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { state } = location;

  const hotelId = id;
  const searchId = state?.searchId || localStorage.getItem("searchId");
  const { hotelDetailsData } = useSelector(
    (state) => state?.hotelSearch || {},
  );
  const hotelListState = useSelector(
    (state) => state?.hotelSearch?.hotelData?.data?.hotels || [],
  );

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openhotelRoomAvailability, setOpenHotelRoomAvailability] =
    useState(false);
  const [rateComponentData, setRateComponentData] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    about: true,
    facilities: true,
    policies: false,
    information: false,
  });

  const [reservationData, setReservationData] = useState({
    hotelIds: [id],
    occupancies: [{ adults: 2 }],
    guestNationality: "IN",
    currency: "INR",
    checkin: "",
    checkout: "",
    roomMapping: true,
    maxRatesPerHotel: 5,
  });

  const thumbnailsRef = useRef(null);

  // Set default dates (today and 3 days later)
  useEffect(() => {
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    setReservationData((prev) => ({
      ...prev,
      hotelIds: [id],
      checkin: today.toISOString().split("T")[0],
      checkout: threeDaysLater.toISOString().split("T")[0],
    }));
  }, [id]);

  // Fetch from API if searchId exists (never call SRDV for retail offers)
  useEffect(() => {
    const isOffer = Boolean(
      state?.isOffer ||
      state?.offerId ||
      state?.offer?._id ||
      (typeof hotelId === "string" &&
        /^[0-9a-fA-F]{24}$/.test(hotelId.trim()) &&
        !hotelId.toLowerCase().startsWith("hsid") &&
        !hotelId.includes("-"))
    );
    if (isOffer) return;
    if (!hotelId || !searchId) return;

    const getHotelDetails = async () => {
      try {
        await dispatch(fetchHotelDetails({ hotelId, searchId })).unwrap();
      } catch (err) {
        console.error("Error fetching hotel details:", err);
      }
    };

    getHotelDetails();
  }, [dispatch, hotelId, searchId, state]);

  // Fetch live offer details from GET /api/v1/offers/{id} if available
  const [liveOfferData, setLiveOfferData] = useState(null);
  useEffect(() => {
    const isMongoId = (val) =>
      typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val.trim());
    const isSrdv =
      typeof hotelId === "string" &&
      (hotelId.toLowerCase().startsWith("hsid") || hotelId.includes("-"));
    if (isSrdv) return;
    const targetId =
      state?.offerId ||
      state?.offer?._id ||
      (isMongoId(hotelId) ? hotelId : null);
    if (!targetId || !isMongoId(targetId)) return;

    let mounted = true;
    const fetchOffer = async () => {
      try {
        const url = OfferAPI?.OfferDetailApi
          ? OfferAPI.OfferDetailApi(targetId)
          : `${getApiBaseUrl()}/api/v1/offers/${targetId}`;
        const res = await axios.get(url, { timeout: 6000 });
        if (!mounted) return;
        const o =
          res?.data?.offer || (res?.data?.success ? res?.data?.data : null);
        if (o) setLiveOfferData(o);
      } catch {
        // Not an offer or network failure
      }
    };
    fetchOffer();
    return () => {
      mounted = false;
    };
  }, [hotelId, state]);

  // Resolve hotel data dynamically from API, state, Redux store, or luxury catalog
  const hotel = useMemo(() => {
    // Helper to find in curated catalog
    const findCurated = (searchKey, nameKey) => {
      if (!searchKey && !nameKey) return null;
      return curatedLuxuryHotels.find((h) => {
        if (searchKey && (h.id === searchKey || h.aliases?.includes(searchKey)))
          return true;
        if (nameKey) {
          const cleanName = nameKey.toLowerCase().replace(/[^a-z0-9]/g, "");
          const cleanHName = h.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (cleanHName.includes(cleanName) || cleanName.includes(cleanHName))
            return true;
          return h.aliases?.some((a) => cleanName.includes(a));
        }
        return false;
      });
    };

    // 1. Check API details response
    const apiData = hotelDetailsData?.data;
    if (apiData && (apiData.name || apiData.hotelName || apiData.id)) {
      const cur = findCurated(apiData.id || id, apiData.name || apiData.hotelName);
      return {
        ...(cur || curatedLuxuryHotels[0]),
        ...apiData,
        name: apiData.name || apiData.hotelName,
        rating: apiData.rating || cur?.rating || 9.2,
        price: apiData.price || cur?.price || "₹12,499",
        main_photo:
          apiData.main_photo ||
          apiData.imageUrls?.[0] ||
          cur?.main_photo ||
          curatedLuxuryHotels[0].main_photo,
        hotelImages:
          apiData.hotelImages ||
          apiData.imageUrls?.map((url) => ({ url })) ||
          cur?.hotelImages ||
          curatedLuxuryHotels[0].hotelImages,
        hotelFacilities:
          apiData.hotelFacilities ||
          apiData.amenities ||
          cur?.hotelFacilities ||
          curatedLuxuryHotels[0].hotelFacilities,
        rooms: apiData.rooms || cur?.rooms || curatedLuxuryHotels[0].rooms,
      };
    }

    // 2. Check location state from card clicks or live offer API
    const stateItem =
      liveOfferData ||
      state?.hotel ||
      state?.item ||
      state?.selectedHotel ||
      state?.offer ||
      state?.selectedOffer;
    if (stateItem) {
      const stateId = stateItem.id || stateItem._id || stateItem.hotelId || id;
      const stateName =
        stateItem.title || stateItem.name || stateItem.hotelName;
      const cur = findCurated(stateId, stateName) || curatedLuxuryHotels[0];
      const hotelImg =
        (Array.isArray(stateItem.images) && stateItem.images[0]) ||
        stateItem.image ||
        stateItem.imageUrl ||
        stateItem.main_photo ||
        stateItem.thumbnail ||
        stateItem.imageUrls?.[0] ||
        cur.main_photo;

      return {
        ...cur,
        ...stateItem,
        id: stateId,
        name: stateName || cur.name,
        tagline: stateItem.subtitle || stateItem.duration || stateItem.stay || cur.tagline,
        address: stateItem.destination || stateItem.location || stateItem.address || cur.address,
        city: stateItem.city || (stateItem.destination ? stateItem.destination.split(" ")[0] : cur.city),
        price:
          stateItem.sellPrice
            ? `₹${Number(stateItem.sellPrice).toLocaleString("en-IN")}`
            : stateItem.price ||
              stateItem.startingPrice ||
              (stateItem.fromPrice?.perNightPrice
                ? `₹${stateItem.fromPrice.perNightPrice.toLocaleString("en-IN")}`
                : cur.price),
        main_photo: hotelImg,
        hotelImages: [
          { url: hotelImg, caption: `${stateName || cur.name} Exterior` },
          ...(cur.hotelImages || []).filter((i) => i.url !== hotelImg),
        ],
        rooms: cur.rooms,
      };
    }

    // 3. Check matching item in Redux hotelData list
    const foundInList = hotelListState.find(
      (h) => h.id === id || h._id === id || String(h.hotelId) === String(id),
    );
    if (foundInList) {
      const cur = findCurated(foundInList.id, foundInList.name) || curatedLuxuryHotels[0];
      const foundImg = foundInList.imageUrls?.[0] || cur.main_photo;
      return {
        ...cur,
        ...foundInList,
        name: foundInList.name || foundInList.hotelName,
        rating: foundInList.rating || cur.rating || 9.3,
        price: foundInList.fromPrice?.perNightPrice
          ? `₹${foundInList.fromPrice.perNightPrice.toLocaleString("en-IN")}`
          : cur.price,
        main_photo: foundImg,
        hotelImages: foundInList.imageUrls?.map((url) => ({ url })) || cur.hotelImages,
      };
    }

    // 4. Fallback to matched curated entry by ID
    const matchedCurated = findCurated(id) || curatedLuxuryHotels[0];
    return matchedCurated;
  }, [hotelDetailsData, state, hotelListState, id, liveOfferData]);

  // Format images list for the gallery Lightbox
  const allImages = useMemo(() => {
    const images = [];
    if (hotel?.main_photo) {
      images.push({ url: hotel.main_photo, isMain: true });
    }
    if (hotel?.hotelImages && Array.isArray(hotel.hotelImages)) {
      hotel.hotelImages.forEach((img) => {
        const url = typeof img === "string" ? img : img?.url || img?.src;
        if (url && !images.some((i) => i.url === url)) {
          images.push({ url, caption: img?.caption || hotel.name });
        }
      });
    }
    if (hotel?.imageUrls && Array.isArray(hotel.imageUrls)) {
      hotel.imageUrls.forEach((url) => {
        if (url && !images.some((i) => i.url === url)) {
          images.push({ url, caption: hotel.name });
        }
      });
    }

    // Guarantee minimum 5 high-res photos
    if (images.length < 5) {
      curatedLuxuryHotels[0].hotelImages.forEach((img) => {
        if (!images.some((i) => i.url === img.url)) {
          images.push(img);
        }
      });
    }

    return images;
  }, [hotel]);

  const openImageModal = (imageUrl, index = 0) => {
    setSelectedImage(imageUrl || allImages[0]?.url);
    setCurrentSlideIndex(index);
    setIsImageModalOpen(true);
  };

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % allImages.length);
    setSelectedImage(allImages[(currentSlideIndex + 1) % allImages.length].url);
  };

  const prevSlide = () => {
    setCurrentSlideIndex(
      (prev) => (prev - 1 + allImages.length) % allImages.length,
    );
    setSelectedImage(
      allImages[(currentSlideIndex - 1 + allImages.length) % allImages.length]
        .url,
    );
  };

  const scrollThumbnails = (direction) => {
    if (thumbnailsRef.current) {
      const scrollAmount = 140;
      thumbnailsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleReservationInputChange = (field, value) => {
    setReservationData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleOccupancyChange = (field, value) => {
    setReservationData((prev) => ({
      ...prev,
      occupancies: [
        {
          ...prev.occupancies[0],
          [field]: Math.max(0, value),
        },
      ],
    }));
  };

  const handleSubmitReservation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(HotelDetailsAPI.HotelRoomAvailabilityApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationData),
      });

      const result = await response.json();
      if (result.success) {
        setIsLoading(false);
        toast.success(result.message || "Reservation availability fetched");
        setIsReservationModalOpen(false);
        setOpenHotelRoomAvailability(true);
        setRateComponentData(result.data?.[0]);
      } else {
        setIsLoading(false);
        toast.error(result.message || "Failed to make reservation");
        setOpenHotelRoomAvailability(false);
      }
    } catch (error) {
      console.error("Reservation Error:", error);
      toast.error("Error checking availability. Please try again.");
      setIsLoading(false);
    }
  };

  const handleSubmitPreorder = async (offerId) => {
    setIsLoading(true);
    try {
      const response = await fetch(HotelDetailsAPI.HotelRoomPreorderApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId }),
      });

      const result = await response.json();
      if (result.success) {
        setIsLoading(false);
        toast.success(result.message || "Room preorder confirmed");
        setIsReservationModalOpen(false);
        setOpenHotelRoomAvailability(false);
        setRateComponentData(result.data?.[0]);
      } else {
        setIsLoading(false);
        toast.error(result.message || "Failed to process preorder");
        setOpenHotelRoomAvailability(true);
      }
    } catch (error) {
      console.error("Preorder Error:", error);
      toast.error("Error processing preorder. Please try again.");
      setIsLoading(false);
    }
  };

  const facilityIcons = {
    WiFi: Wifi,
    "Free High-Speed WiFi": Wifi,
    Parking: Car,
    "Valet Parking": Car,
    Restaurant: Utensils,
    "Halal Fine Dining Buffet": Utensils,
    "24/7 Room Service & Butler": Clock,
    "24/7 In-Room Dining": Clock,
    "Direct Haram View Rooms": Eye,
    "Direct Elevator to Haram": Building2,
    "Fitness Center & Spa": Dumbbell,
    "Executive Business Lounge": Briefcase,
    "Executive Business Center": Briefcase,
    "Prayer Hall with Kaaba View": Compass,
    "Walking Distance to Masjid an-Nabawi": MapPin,
    "Concierge & Luggage Assistance": Shield,
    "Air Conditioning": Wind,
    Breakfast: Coffee,
  };

  const getFacilityIcon = (facilityName) => {
    return facilityIcons[facilityName] || CheckCircle2;
  };

  const getBedIcon = (bedType) => {
    if (bedType?.toLowerCase().includes("king"))
      return <Crown size={14} className="text-amber-500" />;
    if (bedType?.toLowerCase().includes("queen"))
      return <Crown size={14} className="text-amber-500" />;
    return <Bed size={14} className="text-teal-600" />;
  };

  const getAmenityIcon = (amenityName) => {
    const iconMap = {
      Minibar: Wine,
      WiFi: WifiIcon,
      "Air Conditioning": Thermometer,
      TV: TvIcon,
      "Coffee machine": CoffeeIcon,
      Microwave: Microwave,
      Refrigerator: BiFridge,
      Hairdryer: ShowerHead,
      Slippers: Key,
      "Private bathroom": Bath,
      Shower: ShowerHead,
      "Satellite channels": TvIcon,
      Kitchenette: UtensilsCrossed,
      "Private entrance": DoorOpen,
    };
    return iconMap[amenityName] || Sparkle;
  };

  const [mobilePhotoIndex, setMobilePhotoIndex] = useState(0);

  const ratingValue = Number(hotel?.rating || 9.4);
  const ratingLabel =
    ratingValue >= 9.5
      ? "Exceptional"
      : ratingValue >= 9.0
        ? "Superb"
        : ratingValue >= 8.0
          ? "Excellent"
          : "Very Good";

  const displayPrice = useMemo(() => {
    if (hotel?.sellPrice) {
      return `₹${Number(hotel.sellPrice).toLocaleString("en-IN")}`;
    }
    const raw = String(hotel?.price || "₹14,500").replace(/\/night/i, "").trim();
    return raw.startsWith("₹") ? raw : `₹${raw}`;
  }, [hotel?.price, hotel?.sellPrice]);

  const nextMobilePhoto = () => {
    setMobilePhotoIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevMobilePhoto = () => {
    setMobilePhotoIndex(
      (prev) => (prev - 1 + allImages.length) % allImages.length,
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-poppins text-slate-900 selection:bg-teal-500 selection:text-white pb-20 lg:pb-0">
      <CommonHeader />

      {/* ── LUXURY LIGHTBOX MODAL ── */}
      {isImageModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-6">
            {/* Top Bar: Title & Close */}
            <div className="w-full max-w-7xl flex items-center justify-between z-20 pt-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  {currentSlideIndex + 1} / {allImages.length} Photos
                </span>
                <span className="text-white text-sm font-semibold truncate hidden sm:inline">
                  {hotel.name}
                </span>
              </div>

              <button
                type="button"
                className="cursor-pointer text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition backdrop-blur-sm"
                onClick={() => setIsImageModalOpen(false)}
                aria-label="Close photo viewer"
              >
                <X size={22} />
              </button>
            </div>

            {/* Navigation Buttons & Main Image */}
            <div className="relative w-full max-w-6xl flex-1 flex items-center justify-center my-auto px-4 sm:px-12">
              <button
                type="button"
                className="cursor-pointer absolute left-2 sm:left-4 text-white/90 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-3 transition backdrop-blur-md z-20 shadow-lg"
                onClick={prevSlide}
                aria-label="Previous photo"
              >
                <ChevronLeft size={28} />
              </button>

              <div className="relative max-w-5xl max-h-[75vh] w-full flex flex-col items-center justify-center">
                <img
                  src={selectedImage}
                  alt={`Slide ${currentSlideIndex + 1}`}
                  className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl transition-all duration-300"
                />
                {allImages[currentSlideIndex]?.caption && (
                  <p className="text-white/80 text-xs sm:text-sm mt-3 bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-sm">
                    {allImages[currentSlideIndex].caption}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="cursor-pointer absolute right-2 sm:right-4 text-white/90 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-3 transition backdrop-blur-md z-20 shadow-lg"
                onClick={nextSlide}
                aria-label="Next photo"
              >
                <ChevronRight size={28} />
              </button>
            </div>

            {/* Bottom Thumbnails Strip */}
            <div className="w-full max-w-4xl px-4 pb-2">
              <div className="relative flex items-center">
                <button
                  type="button"
                  className="cursor-pointer absolute -left-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black text-white rounded-full p-2 backdrop-blur-sm shadow-md transition"
                  onClick={() => scrollThumbnails("left")}
                  aria-label="Scroll thumbnails left"
                >
                  <ChevronLeft size={16} />
                </button>

                <div
                  ref={thumbnailsRef}
                  className="overflow-x-auto scrollbar-hide py-2 px-6 w-full"
                >
                  <div className="flex justify-center gap-2.5">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentSlideIndex(idx);
                          setSelectedImage(img.url);
                        }}
                        className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                          currentSlideIndex === idx
                            ? "border-teal-400 scale-105 shadow-md"
                            : "border-white/30 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="cursor-pointer absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black text-white rounded-full p-2 backdrop-blur-sm shadow-md transition"
                  onClick={() => scrollThumbnails("right")}
                  aria-label="Scroll thumbnails right"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BREADCRUMB NAVIGATION & ACTIONS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-slate-500 flex-wrap min-w-0">
            <span
              onClick={() => navigate("/")}
              className="hover:text-teal-700 font-semibold cursor-pointer transition shrink-0"
            >
              Home
            </span>
            <span className="text-slate-300">/</span>
            <span
              onClick={() => navigate("/hotel-page")}
              className="hover:text-teal-700 font-semibold cursor-pointer transition shrink-0"
            >
              Hotels
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-medium truncate">
              {hotel.name}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast.success("Hotel link copied to clipboard!");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Share2 size={13} className="text-teal-600" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSaved(!isSaved);
                toast.success(
                  isSaved
                    ? "Removed from saved properties"
                    : "Saved to your pilgrimage wishlist!",
                );
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-2xs transition cursor-pointer ${
                isSaved
                  ? "border-rose-300 bg-rose-50 text-rose-600"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Heart
                size={13}
                fill={isSaved ? "currentColor" : "none"}
                className={isSaved ? "text-rose-500" : "text-slate-400"}
              />
              <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── RESPONSIVE HERO GALLERY ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
        {/* MOBILE CAROUSEL (< md) */}
        <div className="md:hidden relative rounded-2xl overflow-hidden shadow-md aspect-[4/3] bg-slate-900 group">
          <img
            src={allImages[mobilePhotoIndex]?.url || hotel.main_photo}
            alt={hotel.name}
            className="w-full h-full object-cover transition-all duration-300"
            onClick={() => openImageModal(allImages[mobilePhotoIndex]?.url, mobilePhotoIndex)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

          {/* Top Left Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-white font-bold text-[10px] uppercase tracking-wider backdrop-blur-md">
              <Sparkles size={11} className="text-teal-300" />
              {hotel.hotelType || "5-Star Luxury"}
            </span>
          </div>

          {/* Navigation Arrows */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevMobilePhoto();
            }}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md active:scale-95 transition"
            aria-label="Previous photo"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextMobilePhoto();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md active:scale-95 transition"
            aria-label="Next photo"
          >
            <ChevronRight size={18} />
          </button>

          {/* Bottom Indicators & Full Gallery Button */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {allImages.slice(0, 5).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    mobilePhotoIndex === i ? "w-5 bg-teal-400" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => openImageModal(allImages[mobilePhotoIndex]?.url, mobilePhotoIndex)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 text-white text-[11px] font-bold backdrop-blur-md hover:bg-black transition cursor-pointer"
            >
              <ImageIcon size={13} className="text-teal-300" />
              {mobilePhotoIndex + 1}/{allImages.length} Photos
            </button>
          </div>
        </div>

        {/* DESKTOP 5-IMAGE BENTO GRID (>= md) */}
        <div className="hidden md:grid grid-cols-12 gap-3 sm:gap-4 h-[440px] lg:h-[480px]">
          {/* Main Large Hero Image (Left 7 Cols) */}
          <div
            className="col-span-7 relative h-full rounded-3xl overflow-hidden shadow-md group cursor-pointer"
            onClick={() => openImageModal(allImages[0]?.url, 0)}
          >
            <img
              src={allImages[0]?.url}
              alt={hotel.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-md backdrop-blur-xs">
                <Sparkles size={12} />
                {hotel.hotelType || "5-Star Luxury Stay"}
              </span>
            </div>

            <button
              type="button"
              className="absolute bottom-4 right-4 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md transition cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                openImageModal(allImages[0]?.url, 0);
              }}
            >
              <Maximize2 size={13} />
              View Full Size
            </button>
          </div>

          {/* Secondary 4-Image Grid (Right 5 Cols) */}
          <div className="col-span-5 grid grid-cols-2 gap-3 sm:gap-4 h-full">
            {allImages.slice(1, 5).map((img, idx) => {
              const isLast = idx === 3 && allImages.length > 5;
              return (
                <div
                  key={idx}
                  className="relative rounded-2xl overflow-hidden shadow-xs group cursor-pointer h-full"
                  onClick={() => openImageModal(img.url, idx + 1)}
                >
                  <img
                    src={img.url}
                    alt={`${hotel.name} view ${idx + 2}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors" />

                  {isLast && (
                    <div
                      className="absolute inset-0 bg-black/65 hover:bg-black/75 transition backdrop-blur-xs flex flex-col items-center justify-center text-white cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageModal(img.url, idx + 1);
                      }}
                    >
                      <ImageIcon size={22} className="mb-1 text-teal-300" />
                      <span className="text-base font-black leading-tight">
                        +{allImages.length - 4} Photos
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-teal-200 mt-0.5">
                        Explore Gallery
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT & PRICE SIDEBAR ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT 8 COLUMNS: Overview, Highlights, Details, Accordions, Rooms */}
          <div className="lg:col-span-8 space-y-5 sm:space-y-6">
            {/* Header / Title Box */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-extrabold text-[11px] uppercase tracking-wider">
                  {hotel.city || "Makkah"}, {hotel.country || "Saudi Arabia"}
                </span>

                {/* Star rating display */}
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill="currentColor"
                      strokeWidth={0}
                    />
                  ))}
                  <span className="text-xs font-bold text-slate-500 ml-1">
                    5-Star Certified
                  </span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-snug mb-1.5">
                {hotel.name}
              </h1>

              {hotel.tagline && (
                <p className="text-xs sm:text-sm text-teal-800 font-semibold mb-3">
                  {hotel.tagline}
                </p>
              )}

              {/* Location & Contact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3.5 border-t border-slate-100 text-xs sm:text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin className="text-teal-600 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Property Address
                    </span>
                    <span className="text-slate-600 leading-snug">
                      {hotel.address || "Abraj Al Bait Complex"}, {hotel.city || "Makkah"}, {hotel.country || "Saudi Arabia"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Compass className="text-amber-600 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Distance to Sanctuary
                    </span>
                    <span className="text-emerald-700 font-bold">
                      {hotel.distanceToHaram || "Adjacent to Masjid Al Haram (0 meters)"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CalendarClock className="text-teal-600 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Check-in & Check-out
                    </span>
                    <span>
                      In: {hotel?.checkinCheckoutTimes?.checkin_start || "16:00"} | Out: {hotel?.checkinCheckoutTimes?.checkout || "12:00"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <PhoneCall className="text-teal-600 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Concierge Support
                    </span>
                    <span>{hotel.phone || "+966 12 571 7777"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Highlights Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs text-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-1.5">
                  <Eye size={15} />
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  View
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5">
                  Haram & Kaaba
                </p>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs text-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-1.5">
                  <Utensils size={15} />
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Dining
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5">
                  100% Halal Buffet
                </p>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs text-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-1.5">
                  <Wifi size={15} />
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Internet
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5">
                  Free High-Speed
                </p>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs text-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-1.5">
                  <Shield size={15} />
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Cancellation
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-emerald-600 mt-0.5">
                  Free before stay
                </p>
              </div>
            </div>

            {/* About Section Accordion */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-7">
              <button
                type="button"
                onClick={() => toggleSection("about")}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="text-teal-600" size={19} />
                  About this property
                </h2>
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-base">
                  {expandedSections.about ? "−" : "+"}
                </span>
              </button>

              {expandedSections.about && (
                <div className="mt-3.5 pt-3.5 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2.5">
                  <p>
                    {hotel.description ||
                      "Experience exceptional Islamic hospitality in the heart of the holy city. Designed for spiritual reflection and sublime comfort, our property offers spacious soundproof suites, direct audio connection to the Holy Mosque, and dedicated concierge for Umrah & Hajj pilgrims."}
                  </p>
                  <p>
                    Guest rooms are equipped with prayer mats, digital Qibla direction indicators, marble bathrooms with premium toiletries, high-definition satellite channels, and complimentary 24/7 tea and Arabic coffee stations.
                  </p>
                </div>
              )}
            </div>

            {/* Facilities & Amenities Accordion */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-7">
              <button
                type="button"
                onClick={() => toggleSection("facilities")}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Gift className="text-teal-600" size={19} />
                  Facilities & Amenities
                </h2>
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-base">
                  {expandedSections.facilities ? "−" : "+"}
                </span>
              </button>

              {expandedSections.facilities && (
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {hotel.hotelFacilities?.map((fac, index) => {
                    const IconComponent = getFacilityIcon(fac);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-teal-50/50 hover:border-teal-200 transition"
                      >
                        <div className="w-7 h-7 rounded-lg bg-teal-100/80 text-teal-700 flex items-center justify-center shrink-0">
                          <IconComponent size={15} />
                        </div>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {fac}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Policies Section Accordion */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-7">
              <button
                type="button"
                onClick={() => toggleSection("policies")}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Shield className="text-teal-600" size={19} />
                  House Policies
                </h2>
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-base">
                  {expandedSections.policies ? "−" : "+"}
                </span>
              </button>

              {expandedSections.policies && (
                <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-2">
                  {hotel.policies?.map((policy, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-xs sm:text-sm text-slate-600"
                    >
                      <CheckCircle2
                        size={14}
                        className="text-teal-600 shrink-0 mt-0.5"
                      />
                      <span>{policy}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Important Info Section Accordion */}
            <div className="bg-gradient-to-br from-teal-50/70 to-emerald-50/50 rounded-2xl sm:rounded-3xl border border-teal-200/80 p-5 sm:p-7 shadow-xs">
              <button
                type="button"
                onClick={() => toggleSection("information")}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <h2 className="text-lg sm:text-xl font-extrabold text-teal-950 flex items-center gap-2">
                  <CreditCard className="text-teal-700" size={19} />
                  Important Information
                </h2>
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 flex items-center justify-center text-teal-800 font-bold text-base shadow-2xs">
                  {expandedSections.information ? "−" : "+"}
                </span>
              </button>

              {expandedSections.information && (
                <div className="mt-3.5 pt-3.5 border-t border-teal-200/60 text-xs sm:text-sm text-teal-900/90 leading-relaxed">
                  <p>
                    {hotel.hotelImportantInformation ||
                      "Direct elevator transfer to the Haram piazza is available 24 hours. The property is strictly non-smoking. Wheelchair accessibility and assistance for elderly pilgrims can be arranged via the 24/7 concierge."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: Sticky Price & Booking Card (Desktop) */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-lg shadow-slate-200/50 relative overflow-hidden">
                {/* Top Accent Strip */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600" />

                {/* Rating Card */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                      {ratingValue.toFixed(1)}
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">
                        {ratingLabel}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {hotel.reviewCount || 1840}+ reviews
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider">
                    Best Rate
                  </span>
                </div>

                {/* Price Display */}
                <div className="mb-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Starting From
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                      {displayPrice}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      / night
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Includes all taxes, VAT & fees
                  </p>
                </div>

                {/* Feature Bullet Points */}
                <div className="space-y-2 py-3.5 border-t border-b border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Free cancellation before check-in</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Instant confirmation & e-voucher</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>No booking fees or hidden charges</span>
                  </div>
                </div>

                {/* Primary CTA */}
                <button
                  type="button"
                  onClick={() => setIsReservationModalOpen(true)}
                  className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-teal-600/30 hover:shadow-xl transition-all duration-300 transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CreditCard size={17} />
                  Reserve Room
                </button>

                <p className="text-center text-[10px] text-slate-400 font-medium mt-3">
                  🔒 Secure 256-bit SSL encrypted booking
                </p>
              </div>

              {/* Need Help Box */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-white/10 text-teal-400 flex items-center justify-center">
                    <Phone size={16} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">
                      Need Pilgrimage Assistance?
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Our travel experts are available 24/7
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  Call our multilingual helpline for custom room views, Haram transfers, or group bookings.
                </p>
                <a
                  href="tel:+966125717777"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-300 hover:text-teal-200"
                >
                  Call +966 12 571 7777 <ArrowRight size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── ROOMS SELECTION SECTION ── */}
      <section className="bg-white border-t border-slate-200/80 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-8">
            <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
              Available Options
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 mt-2">
              Select Your Room & Suite
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              All rooms include complimentary high-speed Wi-Fi, air conditioning, and luxury bathroom amenities.
            </p>
          </div>

          <Room
            hotel={hotel}
            getBedIcon={getBedIcon}
            getAmenityIcon={getAmenityIcon}
            openImageModal={openImageModal}
          />
        </div>
      </section>

      {/* ── RESERVATION MODAL ── */}
      <HotelRoomAvailability
        isReservationModalOpen={isReservationModalOpen}
        setIsReservationModalOpen={setIsReservationModalOpen}
        hotelId={id}
        hotelName={hotel.name}
        reservationData={reservationData}
        setReservationData={setReservationData}
        handleSubmitReservation={handleSubmitReservation}
        handleReservationInputChange={handleReservationInputChange}
        handleOccupancyChange={handleOccupancyChange}
        isLoading={isLoading}
      />

      {openhotelRoomAvailability && (
        <HotelRoomsListing
          rateComponentData={rateComponentData}
          reservationData={reservationData}
          onClose={() => setOpenHotelRoomAvailability(false)}
          handleSubmitPreorder={handleSubmitPreorder}
          isLoading={isLoading}
        />
      )}

      {/* ── MOBILE STICKY BOTTOM RESERVATION BAR ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-2.5 px-4 shadow-[0_-4px_25px_rgba(0,0,0,0.1)] flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Starting rate
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 leading-none">
              {displayPrice}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">/ night</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsReservationModalOpen(true)}
          className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-teal-600/30 transition cursor-pointer"
        >
          Reserve Room
        </button>
      </div>

      <ScrollToTop />
    </div>
  );
};

export default HotelDetails;

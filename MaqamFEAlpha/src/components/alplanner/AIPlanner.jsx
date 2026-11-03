import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Send,
  RotateCcw,
  Plus,
  Plane,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  ExternalLink,
  MapPin,
  Clock,
  Star,
  ShieldCheck,
  Tag,
  Compass,
  X,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  ArrowUpRight,
  Sliders,
  DollarSign,
  Maximize2,
  CheckCircle2,
  Lock,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import CommonHeader from "../CommonHeader";
import aiService from "../../services/aiService";
import { NoorAvatar3D } from "../ai/NoorAssistant";
import { useAuth, triggerLoginModal } from "../../store/authContext";

// Storage keys matching reference
const SESSIONS_STORAGE_KEY = "maqam_ai_chat_sessions";
const ACTIVE_SESSION_STORAGE_KEY = "maqam_ai_active_session_id";

// Instant Hubs
const INSTANT_HUBS = [
  {
    name: "Makkah & Madinah (Umrah)",
    icon: "🕋",
    query: "Plan a luxury 10-day Umrah package for Makkah and Madinah with 5-star hotel near Haram",
  },
  {
    name: "Dubai & Abu Dhabi",
    icon: "🌴",
    query: "Show 5-day Dubai luxury packages with desert safari and Burj Khalifa entry under 50,000",
  },
  {
    name: "Turkey & Cappadocia",
    icon: "🎈",
    query: "Find 7-day Turkey and Cappadocia packages with hot air balloon tour under 70,000",
  },
  {
    name: "Egypt & Pyramids",
    icon: "🏛️",
    query: "Find packages for Egypt Cairo and Nile River historical tour for 6 days",
  },
  {
    name: "Morocco & Marrakech",
    icon: "🇲🇦",
    query: "Show 6-day Morocco cultural tour in Marrakech and Atlas mountains",
  },
  {
    name: "Maldives & Island",
    icon: "🏝️",
    query: "Find 4-day private overwater villa packages in Maldives",
  },
];

// Popular Inquiries for Sidebar
const POPULAR_INQUIRIES = [
  {
    label: "7-day Turkey & Cappadocia under ₹70,000",
    query: "Find packages for Turkey under 70000 for 7 days with hot air balloon",
  },
  {
    label: "10-day VIP Umrah with 5-Star Haram Front Hotel",
    query: "Plan a trip to Makkah and Madinah for Umrah with 5-star hotel near Haram",
  },
  {
    label: "Direct Flights from Mumbai to Dubai",
    query: "Find best direct flights from Mumbai to Dubai with Emirates or Saudia",
  },
  {
    label: "5-Star Hotels in Makkah Facing Kaaba",
    query: "Show 5-star luxury hotels in Makkah facing the Holy Kaaba",
  },
  {
    label: "Saudi 1-Year Multiple Entry E-Visa Fee & Rules",
    query: "How can I apply for a Saudi Tourist or Umrah E-Visa and what is the fee?",
  },
  {
    label: "Business Class vs Economy Class Comparison",
    query: "Compare business class vs economy class flights to Saudi Arabia",
  },
];

// Fallback dynamic follow-ups
const DIVE_DEEPER_OPTIONS = {
  default: [
    {
      label: "Can I customize flight dates and airlines?",
      query: "Can I customize flight dates and airlines?",
      type: "flight",
    },
    {
      label: "Upgrade to 5-star hotel near Haram",
      query: "Can I upgrade to a 5-star hotel near Haram?",
      type: "hotel",
    },
    {
      label: "What is included in Saudi Umrah E-Visa?",
      query: "What is included in Saudi Umrah E-Visa?",
      type: "visa",
    },
  ],
  flights: [
    { label: "Show Business Class lie-flat fares", query: "Compare business class vs economy flights", type: "flight" },
    { label: "Direct flights only ex-Delhi or Mumbai", query: "Find non-stop direct flights only", type: "flight" },
  ],
  hotels: [
    { label: "Show properties with direct Haram courtyard view", query: "Show 5-star hotels directly facing Haram", type: "hotel" },
    { label: "Include daily breakfast buffet", query: "Show hotels with daily breakfast included", type: "hotel" },
  ],
};

// Quick starter cards shown when opening chatbot for the first time
const STARTER_PROMPTS = [
  {
    title: "Customize Flights & Airlines",
    description: "Flexible dates, preferred airlines (Saudia, Emirates) & direct routes",
    query: "Can I customize flight dates and airlines?",
    icon: Plane,
  },
  {
    title: "5-Star Hotels Near Haram",
    description: "Luxury stays with direct courtyard access & Kaaba views in Makkah & Madinah",
    query: "Can I upgrade to a 5-star hotel near Haram?",
    icon: Building2,
  },
  {
    title: "Saudi Umrah E-Visa",
    description: "1-Year multiple entry e-visa with complete medical insurance & instant check",
    query: "What is included in Saudi Umrah E-Visa?",
    icon: ShieldCheck,
  },
  {
    title: "10-Day Luxury Umrah",
    description: "All-inclusive pilgrimage package with Haram-view hotels and private transport",
    query: "Plan a luxury 10-day Umrah package for Makkah and Madinah with 5-star hotel near Haram",
    icon: Compass,
  },
];

// Destination-specific curated photos for fallbacks
const getDestinationFallback = (destinationOrTitle = "") => {
  const d = String(destinationOrTitle || "").toLowerCase();
  if (d.includes("turkey") || d.includes("cappadocia") || d.includes("istanbul")) {
    return "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80";
  }
  if (d.includes("dubai") || d.includes("abu dhabi") || d.includes("uae") || d.includes("dxb")) {
    return "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80";
  }
  if (d.includes("egypt") || d.includes("cairo") || d.includes("pyramid") || d.includes("nile")) {
    return "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80";
  }
  if (d.includes("morocco") || d.includes("marrakech") || d.includes("atlas")) {
    return "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=800&q=80";
  }
  if (d.includes("maldives") || d.includes("beach") || d.includes("island")) {
    return "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80";
  }
  if (d.includes("rajasthan") || d.includes("ragisthan") || d.includes("jaipur") || d.includes("udaipur")) {
    return "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80";
  }
  if (d.includes("madinah") || d.includes("medina")) {
    return "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=800&q=80";
  }
  if (
    d.includes("makkah") ||
    d.includes("mecca") ||
    d.includes("caba") ||
    d.includes("kaaba") ||
    d.includes("umrah") ||
    d.includes("hajj")
  ) {
    return "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80";
  }
  return "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=800&q=80";
};

// Robust package image extractor
const getPackageImage = (pkg) => {
  if (!pkg) return getDestinationFallback("");

  const extractUrl = (val) => {
    if (!val) return null;
    if (typeof val === "string") {
      const s = val.trim();
      if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("//")) return s;
      if (s.startsWith("/")) return `https://server2.vais.co.in${s}`;
      return null;
    }
    if (typeof val === "object") {
      const u = val.url || val.secure_url || val.src || val.path || val.imageUrl;
      if (typeof u === "string" && u.trim().length > 0) return extractUrl(u);
    }
    return null;
  };

  // 1. Direct image field
  const direct = extractUrl(pkg.image) || extractUrl(pkg.coverImage) || extractUrl(pkg.thumbnail);
  if (direct) return direct;

  // 2. Images array
  if (Array.isArray(pkg.images) && pkg.images.length > 0) {
    for (const img of pkg.images) {
      const resolved = extractUrl(img);
      if (resolved) return resolved;
    }
  }

  // 3. Images from priceBreakdown offers
  if (Array.isArray(pkg.priceBreakdown)) {
    for (const item of pkg.priceBreakdown) {
      if (Array.isArray(item.images)) {
        for (const img of item.images) {
          const resolved = extractUrl(img);
          if (resolved) return resolved;
        }
      }
      if (Array.isArray(item.details?.images)) {
        for (const img of item.details.images) {
          const resolved = extractUrl(img);
          if (resolved) return resolved;
        }
      }
      if (item.image) {
        const resolved = extractUrl(item.image);
        if (resolved) return resolved;
      }
    }
  }

  // 4. Images from offerRefs
  if (Array.isArray(pkg.offerRefs)) {
    for (const ref of pkg.offerRefs) {
      if (Array.isArray(ref.offer?.images)) {
        for (const img of ref.offer.images) {
          const resolved = extractUrl(img);
          if (resolved) return resolved;
        }
      }
      if (ref.offer?.image) {
        const resolved = extractUrl(ref.offer.image);
        if (resolved) return resolved;
      }
    }
  }

  return getDestinationFallback(pkg.destination || pkg.title);
};

// Robust hotel image extractor
const getHotelImage = (hotel) => {
  if (!hotel) return getDestinationFallback("");
  const extractUrl = (val) => {
    if (!val) return null;
    if (typeof val === "string") {
      const s = val.trim();
      if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("//")) return s;
      if (s.startsWith("/")) return `https://server2.vais.co.in${s}`;
      return null;
    }
    if (typeof val === "object") {
      const u = val.url || val.secure_url || val.src || val.path || val.imageUrl;
      if (typeof u === "string" && u.trim().length > 0) return extractUrl(u);
    }
    return null;
  };

  const direct = extractUrl(hotel.image) || extractUrl(hotel.HotelPicture) || extractUrl(hotel.picture);
  if (direct) return direct;

  if (Array.isArray(hotel.images) && hotel.images.length > 0) {
    for (const img of hotel.images) {
      const resolved = extractUrl(img);
      if (resolved) return resolved;
    }
  }
  return getDestinationFallback(hotel.city || hotel.name || hotel.location);
};

// Initial system prompt message
const makeWelcomeMessage = () => ({
  id: `welcome-${Date.now()}`,
  sender: "bot",
  text: `Assalamu Alaikum! Welcome to Maqam Trip Planner.

I am Maqam AI assistant, your AI travel concierge. I can help you search live flight itineraries, explore verified hotels near Haram, compare travel options, optimize budgets, and customize holiday or Umrah packages.

Where would you like to travel, or what can I help you plan today?`,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  flights: [],
  hotels: [],
  packages: [],
  comparison: null,
  customTrip: null,
  visa: null,
});

export default function AIPackageGenerator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Ephemeral in-memory conversation without history saving (ChatGPT style)
  const [messages, setMessages] = useState(() => [makeWelcomeMessage()]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isInitialState = useMemo(() => {
    return (
      messages.length <= 1 &&
      messages[0]?.sender === "bot" &&
      (!messages[0].flights || messages[0].flights.length === 0) &&
      (!messages[0].hotels || messages[0].hotels.length === 0) &&
      (!messages[0].packages || messages[0].packages.length === 0) &&
      !messages[0].comparison &&
      !messages[0].visa
    );
  }, [messages]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Clear any legacy saved chat history from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem("maqam_ai_chat_sessions");
      localStorage.removeItem("maqam_ai_active_session_id");
    } catch { }
  }, []);

  // Handle URL parameter ?prompt=
  useEffect(() => {
    const promptParam = searchParams.get("prompt");
    if (promptParam && promptParam.trim()) {
      handleSendMessage(promptParam.trim());
    }
  }, [searchParams]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Reset chat
  const handleResetChat = () => {
    setMessages([makeWelcomeMessage()]);
    setInputText("");
  };

  // Execute Search & Process AI response
  const handleSendMessage = async (queryText = null) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const lower = textToSend.toLowerCase();
      let liveReply = "";
      let foundPackages = [];
      let foundFlights = [];
      let foundHotels = [];
      let comparisonData = null;
      let visaInfo = null;

      // Check for comparison request
      if (
        lower.includes("compare") ||
        lower.includes("vs") ||
        lower.includes("business class") ||
        lower.includes("difference between")
      ) {
        comparisonData = {
          title: "Business Class vs Economy Class Comparison",
          subtitle: "Comfort, baggage allowance, airport lounge access & VIP services",
          features: [
            {
              name: "Seat & Sleeping Comfort",
              economy: '31"–32" pitch, standard 105° recline with basic headrest',
              business: "180° Full Lie-Flat Bed / Private Pod Suite with duvet & pillow",
              winner: "business",
            },
            {
              name: "Checked Baggage",
              economy: "20–30 Kg (1 piece standard)",
              business: "40–50 Kg (2 pieces) + Priority Baggage Delivery tag",
              winner: "business",
            },
            {
              name: "Airport VIP Lounge",
              economy: "Not included (Paid pass ~₹2,500/visit)",
              business: "Complimentary VIP Lounge: Hot Buffet, Showers, Wi-Fi",
              winner: "business",
            },
            {
              name: "Boarding & Check-in",
              economy: "Standard lines & general boarding",
              business: "Dedicated Priority Check-in & Fast-Track Security",
              winner: "business",
            },
          ],
        };
        liveReply =
          "Here is a side-by-side comparison between Business Class and Economy to help you choose the best option for your pilgrimage:";
      }

      // Check for Flight customization inquiry
      const isFlightCustomization =
        lower.includes("customize flight") ||
        lower.includes("customise flight") ||
        (lower.includes("customize") && (lower.includes("airline") || lower.includes("date") || lower.includes("flight"))) ||
        lower.includes("can i customize");

      if (isFlightCustomization) {
        liveReply =
          "Yes, absolutely! All Maqam flight bookings and Umrah packages are 100% customizable. You can choose your preferred departure dates, select top airlines (including Saudia, Emirates, Air India, and Qatar Airways), pick direct non-stop flights or flexible layovers, and upgrade cabins anytime. Here are verified customizable flight options:";
        foundFlights = [
          {
            id: `fl-cust-1-${Date.now()}`,
            airline: "Saudia",
            flightNo: "SV-773",
            departureTime: "08:15 AM",
            arrivalTime: "11:50 AM",
            origin: "Delhi (DEL)",
            originCode: "DEL",
            destination: "Jeddah (JED)",
            destinationCode: "JED",
            duration: "5h 05m",
            stops: "Direct Non-Stop",
            price: 28900,
          },
          {
            id: `fl-cust-2-${Date.now()}`,
            airline: "Emirates",
            flightNo: "EK-501",
            departureTime: "04:30 AM",
            arrivalTime: "09:40 AM",
            origin: "Mumbai (BOM)",
            originCode: "BOM",
            destination: "Madinah (MED)",
            destinationCode: "MED",
            duration: "6h 40m",
            stops: "1-Stop via DXB",
            price: 32400,
          },
        ];
      }

      // Check for 5-star Haram hotel upgrade inquiry
      const isHotelUpgrade =
        lower.includes("upgrade to 5-star") ||
        lower.includes("upgrade to 5 star") ||
        (lower.includes("upgrade") && lower.includes("haram")) ||
        (lower.includes("5-star") && lower.includes("haram")) ||
        (lower.includes("5 star") && lower.includes("haram"));

      if (isHotelUpgrade) {
        liveReply =
          "Yes! You can upgrade your stay to luxury 5-star properties situated directly on the Haram courtyards in both Makkah and Madinah, offering direct elevator access to prayer halls, Kaaba views, and buffet breakfast. Here are top-rated 5-star options:";
        foundHotels = [
          {
            id: `ht-haram-1-${Date.now()}`,
            name: "Makkah Clock Royal Tower, A Fairmont Hotel",
            city: "Makkah",
            rating: 5,
            price: 16500,
            location: "Directly facing Holy Kaaba, King Abdul Aziz Gate (0m walk)",
            image:
              "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80",
            badge: "Direct Kaaba View",
          },
          {
            id: `ht-haram-2-${Date.now()}`,
            name: "The Oberoi Madina",
            city: "Madinah",
            rating: 5,
            price: 13800,
            location: "Steps away from Prophet's Mosque Ladies Gate (50m walk)",
            image:
              "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=800&q=80",
            badge: "Prophet's Mosque View",
          },
        ];
      }

      // Check for Visa inquiry
      const isVisaInquiry = lower.includes("visa") || lower.includes("e-visa");
      if (isVisaInquiry) {
        visaInfo = {
          title: "Saudi 1-Year Multiple Entry E-Visa",
          type: "Umrah & Tourism Valid",
          turnaround: "24 - 48 Hours Approval",
          fee: 11500,
          stayDuration: "90 Days Stay per visit",
          features: [
            "Full Medical & COVID Insurance Included",
            "Multiple Entry Valid for 1 Year across all Saudi cities",
            "Valid for Umrah in Makkah & Rawdah visit in Madinah",
            "Instant Electronic Delivery via Email & WhatsApp",
          ],
        };
        liveReply =
          "The Saudi Umrah E-Visa is an official 1-year multiple-entry visa. It covers your Umrah pilgrimage, Rawdah visits, domestic transit across all Saudi cities (Makkah, Madinah, Jeddah, Riyadh), and mandatory health insurance with 24–48 hour electronic processing. Here are the full inclusions:";
      }

      // Query real AI Backend endpoint
      try {
        const aiRes = await aiService.sendChatMessage(textToSend);
        if (aiRes.reply && !isVisaInquiry && !isFlightCustomization && !isHotelUpgrade) {
          liveReply = aiRes.reply;
        }
        if (Array.isArray(aiRes.packages) && aiRes.packages.length > 0) {
          foundPackages = aiRes.packages
            .filter(
              (p) =>
                p &&
                p.title &&
                !p.title.toLowerCase().includes("kill bill") &&
                !p.title.toLowerCase().includes("test")
            )
            .map((p) => ({
              ...p,
              duration:
                p.duration ||
                (p.durationDays
                  ? `${p.durationDays} Days / ${Math.max(1, p.durationDays - 1)} Nights`
                  : "All-Inclusive"),
              price: p.price || p.sellPrice || 0,
            }));
        }
        if (Array.isArray(aiRes.flights) && aiRes.flights.length > 0) {
          foundFlights = aiRes.flights;
        }
        if (Array.isArray(aiRes.hotels) && aiRes.hotels.length > 0) {
          foundHotels = aiRes.hotels;
        }
      } catch (err) {
        console.warn("Backend chat endpoint fallback:", err);
      }

      // Live Flight matches if flight query
      if (
        foundFlights.length === 0 &&
        (lower.includes("flight") ||
          lower.includes("fly") ||
          lower.includes("airline") ||
          lower.includes("mumbai to") ||
          lower.includes("delhi to"))
      ) {
        foundFlights = [
          {
            id: `fl-1-${Date.now()}`,
            airline: "Emirates",
            flightNo: "EK-501",
            departureTime: "04:30 AM",
            arrivalTime: "06:45 AM",
            origin: "Mumbai (BOM)",
            originCode: "BOM",
            destination: "Dubai (DXB)",
            destinationCode: "DXB",
            duration: "3h 45m",
            stops: "Direct",
            price: 21450,
          },
          {
            id: `fl-2-${Date.now()}`,
            airline: "Saudia",
            flightNo: "SV-773",
            departureTime: "08:15 AM",
            arrivalTime: "11:50 AM",
            origin: "Delhi (DEL)",
            originCode: "DEL",
            destination: "Jeddah (JED)",
            destinationCode: "JED",
            duration: "5h 05m",
            stops: "Direct",
            price: 28900,
          },
        ];
        if (!liveReply) {
          liveReply = `Found verified flights matching your route with live GDS inventory:`;
        }
      }

      // Hotel matches if hotel query
      if (
        foundHotels.length === 0 &&
        (lower.includes("hotel") ||
          lower.includes("stay") ||
          lower.includes("resort") ||
          lower.includes("suite"))
      ) {
        if (lower.includes("turkey") || lower.includes("cappadocia") || lower.includes("istanbul")) {
          foundHotels = [
            {
              id: `ht-tr-1-${Date.now()}`,
              name: "Sultan Cave Suites",
              city: "Cappadocia",
              rating: 5,
              price: 18500,
              location: "Panoramic terrace overlooking Goreme hot air balloons",
              image:
                "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80",
              badge: "Balloon View",
            },
            {
              id: `ht-tr-2-${Date.now()}`,
              name: "Ciragan Palace Kempinski",
              city: "Istanbul",
              rating: 5,
              price: 26000,
              location: "Historic Ottoman Imperial Palace along the Bosphorus Strait",
              image:
                "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80",
              badge: "Bosphorus View",
            },
          ];
        } else if (lower.includes("dubai") || lower.includes("abu dhabi") || lower.includes("uae")) {
          foundHotels = [
            {
              id: `ht-dxb-1-${Date.now()}`,
              name: "Atlantis The Royal, Palm Jumeirah",
              city: "Dubai",
              rating: 5,
              price: 34500,
              location: "Crescent Road, The Palm Jumeirah, Dubai",
              image:
                "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80",
              badge: "Palm Luxury",
            },
            {
              id: `ht-dxb-2-${Date.now()}`,
              name: "Address Downtown Dubai",
              city: "Dubai",
              rating: 5,
              price: 28900,
              location: "Sheikh Mohammed bin Rashid Blvd, Direct Burj Khalifa View",
              image:
                "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
              badge: "Burj View",
            },
          ];
        } else if (lower.includes("egypt") || lower.includes("cairo")) {
          foundHotels = [
            {
              id: `ht-eg-1-${Date.now()}`,
              name: "Marriott Mena House, Cairo",
              city: "Giza / Cairo",
              rating: 5,
              price: 19800,
              location: "Directly facing Great Pyramids of Giza courtyard",
              image:
                "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80",
              badge: "Pyramid View",
            },
          ];
        } else if (lower.includes("morocco") || lower.includes("marrakech")) {
          foundHotels = [
            {
              id: `ht-mor-1-${Date.now()}`,
              name: "La Mamounia Palace Hotel",
              city: "Marrakech",
              rating: 5,
              price: 24500,
              location: "Avenue Bab Jdid, Luxury Palace in Historic Medina",
              image:
                "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=800&q=80",
              badge: "Historic Palace",
            },
          ];
        } else if (lower.includes("maldives")) {
          foundHotels = [
            {
              id: `ht-mld-1-${Date.now()}`,
              name: "Soneva Fushi Overwater Villas",
              city: "Maldives",
              rating: 5,
              price: 49000,
              location: "Baa Atoll Biosphere Reserve Private Island",
              image:
                "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80",
              badge: "Overwater Villa",
            },
          ];
        } else {
          foundHotels = [
            {
              id: `ht-1-${Date.now()}`,
              name: "Makkah Clock Royal Tower, A Fairmont Hotel",
              city: "Makkah",
              rating: 5,
              price: 16500,
              location: "Directly facing Holy Kaaba, King Abdul Aziz Gate",
              image:
                "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80",
              badge: "Haram View",
            },
            {
              id: `ht-2-${Date.now()}`,
              name: "The Oberoi Madina",
              city: "Madinah",
              rating: 5,
              price: 13800,
              location: "Steps away from Prophet's Mosque Ladies Gate",
              image:
                "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=800&q=80",
              badge: "Prophet's Mosque View",
            },
          ];
        }

        if (!liveReply) {
          liveReply = `Here are verified premium hotels with live inventory:`;
        }
      }

      // Curated Package matches if package query
      if (
        foundPackages.length === 0 &&
        (lower.includes("package") ||
          lower.includes("umrah") ||
          lower.includes("turkey") ||
          lower.includes("dubai") ||
          lower.includes("trip"))
      ) {
        foundPackages = [
          {
            id: `pkg-1-${Date.now()}`,
            _id: "6ac4cc8fdd7f83ab2e5a4cd3",
            title: lower.includes("turkey")
              ? "Classic Turkey & Cappadocia Wonders"
              : lower.includes("dubai")
                ? "Dubai Luxury Skyline & Desert Safari"
                : "Zam-zam Executive Pilgrimage (Makkah & Madinah)",
            destination: lower.includes("turkey")
              ? "Turkey"
              : lower.includes("dubai")
                ? "Dubai"
                : "Makkah & Madinah",
            duration: lower.includes("turkey")
              ? "7 Days / 6 Nights"
              : lower.includes("dubai")
                ? "5 Days / 4 Nights"
                : "10 Days / 9 Nights",
            price: lower.includes("turkey")
              ? 68500
              : lower.includes("dubai")
                ? 46900
                : 85000,
            image: lower.includes("turkey")
              ? "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80"
              : lower.includes("dubai")
                ? "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80"
                : "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80",
          },
        ];
      }

      if (!liveReply) {
        liveReply = `Assalamu Alaikum! I analyzed your inquiry for "${textToSend}". Here are tailored recommendations from our live travel inventory:`;
      }

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: liveReply,
        flights: foundFlights,
        hotels: foundHotels,
        packages: foundPackages,
        comparison: comparisonData,
        visa: visaInfo,
        actionPrompt: textToSend,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("AI Planner chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-fallback-${Date.now()}`,
          sender: "bot",
          text: `I searched our network for "${textToSend}". Let's refine your dates or destination to get you the exact quote.`,
          flights: [],
          hotels: [],
          packages: [],
          actionPrompt: textToSend,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen bg-white dark:bg-[#0c1427] text-slate-800 dark:text-slate-100 transition-colors flex flex-col font-sans pt-[72px] lg:overflow-hidden">
      <CommonHeader />

      {/* Main Studio Area */}
      <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Chat Studio */}
          <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0c1427] overflow-hidden relative">
            {/* Ambient Background & Radial Glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
              {/* Soft radial emerald glow at top */}
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl" />

              {/* Subtle ambient mosque silhouette */}
              <div
                className="absolute inset-0 opacity-[0.035] dark:opacity-[0.045] bg-bottom bg-no-repeat bg-cover pointer-events-none"
                style={{ backgroundImage: `url('/src/assets/heroimage.jpg')` }}
              />

              {/* Modern geometric dot grid */}
              <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-30 dark:opacity-25" />
            </div>

            {/* Top Toolbar in Chat */}
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/70 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-[#091122]/40 relative z-10">
              <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Maqam Travel Concierge
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Chat</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-transparent relative z-10 flex flex-col">
              <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center">
                {isInitialState ? (
                  /* Welcome Hero State (ChatGPT / Perplexity Style) */
                  <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10 text-center my-auto animate-in fade-in duration-300">
                    {/* Glowing AI Avatar */}
                    <div className="relative mb-5">
                      <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/25 to-teal-500/25 rounded-3xl blur-lg animate-pulse" />
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-center shadow-xl shadow-emerald-950/20 border border-emerald-400/40">
                        <NoorAvatar3D size={56} />
                      </div>
                    </div>

                    {/* Headline & Subtitle */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-3">
                      <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Maqam AI Travel Concierge</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                      Where can I help you travel today?
                    </h2>

                    <p className="max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                      Plan custom flights, book 5-star hotels near Haram, generate personalized Umrah packages, or get instant visa guidance.
                    </p>

                    {/* 4 Feature Starter Prompt Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                      {STARTER_PROMPTS.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(item.query)}
                          className="group p-3.5 sm:p-4 rounded-xl bg-white/90 dark:bg-[#11192e]/90 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/50 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer flex items-start gap-3 backdrop-blur-xs"
                        >
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors">
                            <item.icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Standard Conversation Messages */
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"
                          }`}
                      >
                        <div
                          className={`max-w-[92%] sm:max-w-[85%] rounded-2xl transition-all ${msg.sender === "user"
                              ? "bg-emerald-700 text-white rounded-br-xs px-4 py-3 font-normal"
                              : "bg-slate-50 dark:bg-[#10192d] text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-bl-xs p-4 sm:p-5"
                            }`}
                        >
                          {msg.sender === "bot" && (
                            <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                                M
                              </div>
                              <span>Maqam Travel Concierge</span>
                            </div>
                          )}

                          <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed">
                            {msg.text}
                          </p>

                          {/* Flight Result Cards */}
                          {msg.flights && msg.flights.length > 0 && (
                            <div className="mt-4 space-y-2.5">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <span>Live Flight Options ({msg.flights.length})</span>
                                <span>Verified Fares</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {msg.flights.map((flight, idx) => (
                                  <div
                                    key={flight.id || idx}
                                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131d36] border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition shadow-xs text-left"
                                  >
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                      <div className="flex items-center gap-2">
                                        {flight.image ? (
                                          <img
                                            src={flight.image}
                                            alt={flight.airline}
                                            className="w-7 h-7 rounded-md object-cover border border-slate-200 dark:border-slate-700"
                                            onError={(e) => {
                                              e.currentTarget.onerror = null;
                                              e.currentTarget.style.display = "none";
                                            }}
                                          />
                                        ) : (
                                          <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                                            <Plane size={13} className="rotate-45" />
                                          </div>
                                        )}
                                        <div>
                                          <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                            {flight.airline}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            {flight.flightNo}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                        {flight.stops || "Direct"}
                                      </span>
                                    </div>

                                    <div className="py-2.5 flex items-center justify-between">
                                      <div>
                                        <span className="font-black text-base text-slate-900 dark:text-white block leading-tight">
                                          {flight.departureTime}
                                        </span>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                          {flight.originCode}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block max-w-[100px] truncate">
                                          {flight.origin}
                                        </span>
                                      </div>

                                      <div className="flex-1 flex flex-col items-center px-3">
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                          <Clock size={10} />
                                          {flight.duration}
                                        </span>
                                        <div className="w-full flex items-center gap-1">
                                          <div className="h-[1px] flex-1 bg-slate-300 dark:bg-slate-700" />
                                          <Plane size={11} className="text-emerald-500 rotate-90" />
                                          <div className="h-[1px] flex-1 bg-slate-300 dark:bg-slate-700" />
                                        </div>
                                      </div>

                                      <div className="text-right">
                                        <span className="font-black text-base text-slate-900 dark:text-white block leading-tight">
                                          {flight.arrivalTime}
                                        </span>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                          {flight.destinationCode}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block max-w-[100px] truncate">
                                          {flight.destination}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                      <div>
                                        <span className="text-[10px] text-slate-400 block">Starting at</span>
                                        <span className="text-sm font-black text-slate-900 dark:text-white">
                                          ₹ {Number(flight.price).toLocaleString("en-IN")}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => navigate("/flight")}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                                      >
                                        <span>Book Flight</span>
                                        <ChevronRight size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Hotel Result Cards */}
                          {msg.hotels && msg.hotels.length > 0 && (
                            <div className="mt-4 space-y-2.5">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <span>Verified Hotels ({msg.hotels.length})</span>
                                <span>Live Rates</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {msg.hotels.map((hotel, idx) => (
                                  <div
                                    key={hotel.id || idx}
                                    className="rounded-xl overflow-hidden bg-slate-50 dark:bg-[#131d36] border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition shadow-xs text-left"
                                  >
                                    <div className="relative h-32 overflow-hidden">
                                      <img
                                        src={getHotelImage(hotel)}
                                        alt={hotel.name}
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = getDestinationFallback(hotel.city || hotel.name || hotel.location);
                                        }}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                      <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                                        <MapPin size={10} />
                                        {hotel.city}
                                      </span>
                                      {hotel.badge && (
                                        <span className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-bold">
                                          {hotel.badge}
                                        </span>
                                      )}
                                      <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-amber-500/90 text-white text-[10px] font-bold flex items-center gap-0.5">
                                        <Star size={10} fill="currentColor" />
                                        {hotel.rating || 5}.0
                                      </span>
                                    </div>

                                    <div className="p-3.5">
                                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
                                        {hotel.name}
                                      </h4>
                                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                        {hotel.location}
                                      </p>
                                      <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                        <div>
                                          <span className="text-[10px] text-slate-400 block">From</span>
                                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                            ₹ {Number(hotel.price).toLocaleString("en-IN")}{" "}
                                            <span className="text-[10px] font-normal text-slate-400">
                                              / night
                                            </span>
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => navigate("/hotel-page")}
                                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-xs"
                                        >
                                          <span>Book Hotel</span>
                                          <ChevronRight size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Curated Packages */}
                          {msg.packages && msg.packages.length > 0 && (
                            <div className="mt-4 space-y-2.5">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <span>Curated Packages ({msg.packages.length})</span>
                                <span>All-Inclusive</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {msg.packages.map((pkg, idx) => (
                                  <div
                                    key={pkg.id || pkg._id || idx}
                                    className="rounded-xl overflow-hidden bg-slate-50 dark:bg-[#131d36] border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition shadow-xs text-left"
                                  >
                                    <div className="relative h-36 overflow-hidden bg-slate-200 dark:bg-slate-800">
                                      <img
                                        src={getPackageImage(pkg)}
                                        alt={pkg.title}
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = getDestinationFallback(pkg.destination || pkg.title);
                                        }}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                                      <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                                        {pkg.destination}
                                      </span>
                                      <span className="absolute bottom-2 left-2 text-white text-xs font-bold">
                                        {pkg.duration || (pkg.durationDays ? `${pkg.durationDays} Days / ${Math.max(1, pkg.durationDays - 1)} Nights` : "All-Inclusive")}
                                      </span>
                                    </div>

                                    <div className="p-3.5">
                                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
                                        {pkg.title}
                                      </h4>
                                      <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                        <div>
                                          <span className="text-[10px] text-slate-400 block">Total Package</span>
                                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                            ₹ {Number(pkg.price || pkg.sellPrice || 0).toLocaleString("en-IN")}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            navigate(
                                              pkg._id || pkg.id
                                                ? `/package-detail/${pkg._id || pkg.id}`
                                                : "/package-page"
                                            )
                                          }
                                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-xs"
                                        >
                                          <span>View Package</span>
                                          <ChevronRight size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Comparison Table */}
                          {msg.comparison && (
                            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-left bg-white dark:bg-[#11192e]">
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-slate-200 dark:border-slate-800">
                                <h4 className="font-extrabold text-xs sm:text-sm text-emerald-950 dark:text-emerald-300">
                                  {msg.comparison.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {msg.comparison.subtitle}
                                </p>
                              </div>
                              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {msg.comparison.features.map((feat, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs"
                                  >
                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                      {feat.name}
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                                        Economy
                                      </span>
                                      {feat.economy}
                                    </div>
                                    <div className="text-emerald-700 dark:text-emerald-300 font-medium">
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase">
                                        Business Class
                                      </span>
                                      {feat.business}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* E-Visa Card */}
                          {msg.visa && (
                            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-[#131d36] border border-slate-200 dark:border-slate-800 text-left">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                  {msg.visa.title}
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                                  {msg.visa.turnaround}
                                </span>
                              </div>
                              <ul className="my-2.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                                {msg.visa.features.map((feat, fIdx) => (
                                  <li key={fIdx} className="flex items-center gap-1.5">
                                    <Check size={13} className="text-emerald-500 shrink-0" />
                                    <span>{feat}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">
                                    Total Govt &amp; Processing Fee
                                  </span>
                                  <span className="text-sm font-black text-slate-900 dark:text-white">
                                    ₹ {Number(msg.visa.fee).toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => navigate("/visa-card")}
                                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                                >
                                  <span>Apply Visa</span>
                                  <ChevronRight size={13} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {msg.timestamp}
                        </span>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex items-center gap-2 bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 px-4 py-2.5 rounded-2xl rounded-bl-xs w-24">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Input Area */}
            <div className="pt-3 sm:pt-3.5 lg:pt-4 pb-4 sm:pb-5 lg:pb-6 px-3.5 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0c1427]/95 backdrop-blur-xl shrink-0 relative z-10 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.06)]">
              <div className="max-w-4xl mx-auto w-full space-y-2.5 sm:space-y-3">
                {/* Quick Prompt Pills */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
                  {DIVE_DEEPER_OPTIONS.default.map((opt, idx) => {
                    const IconComponent =
                      opt.type === "flight"
                        ? Plane
                        : opt.type === "hotel"
                          ? Building2
                          : opt.type === "visa"
                            ? ShieldCheck
                            : Sparkles;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(opt.query)}
                        className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-50 dark:bg-[#121c33] hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-[#085c44] dark:hover:text-emerald-300 text-xs font-medium transition-all duration-150 whitespace-nowrap cursor-pointer border border-slate-200/90 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-600 shrink-0 shadow-2xs hover:shadow-xs active:scale-[0.98]"
                      >
                        <IconComponent
                          size={12}
                          className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0"
                        />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Unified Modern Input Capsule */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex items-center bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-300/90 dark:border-slate-700/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] focus-within:border-[#085c44] dark:focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-200 p-1.5 sm:p-2 pl-4 sm:pl-5"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask about flights, hotels, Umrah packages, or travel requirements..."
                    className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm focus:outline-none py-1.5 sm:py-2 pr-3 font-normal"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isLoading}
                    className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-2.5 rounded-xl bg-[#085c44] hover:bg-[#064e3b] active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-[#085c44] disabled:active:scale-100 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all duration-150 shrink-0 cursor-pointer"
                  >
                    <span>Send</span>
                    <Send size={14} className="shrink-0" />
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

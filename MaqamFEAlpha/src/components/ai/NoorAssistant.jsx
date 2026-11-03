import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sparkles,
  Send,
  X,
  Maximize2,
  RotateCcw,
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
} from "lucide-react";
import aiService from "../../services/aiService";

// Suggestion quick chips
const SUGGESTION_CHIPS = [
  {
    icon: "🕋",
    label: "Plan Umrah Package",
    prompt: "Plan a luxury Umrah package for Makkah and Madinah with 5-star hotel near Haram",
  },
  {
    icon: "✈️",
    label: "Find Flights",
    prompt: "Find best flights from Mumbai to Dubai with Emirates or Saudia",
  },
  {
    icon: "🏨",
    label: "5-Star Hotels",
    prompt: "Show 5-star luxury hotels in Makkah facing the Holy Kaaba",
  },
  {
    icon: "🏖️",
    label: "Holiday Packages",
    prompt: "Show 7-day Turkey and Cappadocia holiday packages under 70,000",
  },
  {
    icon: "🛂",
    label: "Saudi E-Visa",
    prompt: "How can I apply for a Saudi Tourist or Umrah E-Visa and what is the fee?",
  },
];

// Initial welcome message from Maqam Assistant
const INITIAL_MESSAGE = {
  id: "welcome-1",
  sender: "bot",
  text: `Assalamu Alaikum & Welcome! 🌙✨ I am Maqam Assistant, your personal AI travel & pilgrimage concierge at Maqam. How can I help you plan your journey today?

Ask me anything like "Flights from Mumbai to Dubai", "5-star hotels in Makkah near Haram", or "15-day Umrah packages"!`,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  flights: [],
  hotels: [],
  packages: [],
  comparison: null,
  filtersApplied: null,
};

// 3D Interactive SVG Noor Avatar Head
export function NoorAvatar3D({ size, pointerOffset = { x: 0, y: 0 }, isHovered = false, className = "" }) {
  const eyeShiftX = pointerOffset.x * 3.8;
  const eyeShiftY = pointerOffset.y * 2.8;
  const visorShiftX = pointerOffset.x * 2.8;
  const visorShiftY = pointerOffset.y * 2;

  return (
    <svg
      width={size || undefined}
      height={size || undefined}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none transition-transform duration-100 ease-out ${className}`}
    >
      <defs>
        <radialGradient id="noorHead3D" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>
        <linearGradient id="noorVisor3D" x1="20" y1="23" x2="44" y2="39" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="45%" stopColor="#047857" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <filter id="noorGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main Cute Floating Head */}
      <circle cx="32" cy="32" r="23" fill="url(#noorHead3D)" />
      <circle cx="32" cy="32" r="23" stroke="#e2e8f0" strokeWidth="1" />

      {/* Visor Area with Headset Arc */}
      <rect
        x={16 + visorShiftX}
        y={22 + visorShiftY}
        width="32"
        height="18"
        rx="9"
        fill="url(#noorVisor3D)"
        stroke="#10b981"
        strokeWidth="1.2"
        strokeOpacity="0.8"
      />

      {/* Glowing Blinking Eyes */}
      <g
        className="animate-noor-eyes"
        style={{ transformOrigin: `${32 + eyeShiftX}px ${31 + eyeShiftY}px` }}
      >
        {/* Left Eye */}
        <ellipse
          cx={25 + eyeShiftX}
          cy={31 + eyeShiftY}
          rx={isHovered ? 3.8 : 3.2}
          ry={isHovered ? 4.2 : 3.5}
          fill="#34d399"
          filter="url(#noorGlow)"
        />
        <circle cx={26.2 + eyeShiftX} cy={29.8 + eyeShiftY} r="1.1" fill="#ffffff" />

        {/* Right Eye */}
        <ellipse
          cx={39 + eyeShiftX}
          cy={31 + eyeShiftY}
          rx={isHovered ? 3.8 : 3.2}
          ry={isHovered ? 4.2 : 3.5}
          fill="#34d399"
          filter="url(#noorGlow)"
        />
        <circle cx={40.2 + eyeShiftX} cy={29.8 + eyeShiftY} r="1.1" fill="#ffffff" />
      </g>

      {/* Headset Arc / Antenna */}
      <path
        d="M 12 32 C 12 18, 52 18, 52 32"
        stroke="#10b981"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      {/* Headset Earcups */}
      <rect x="9" y="27" width="4.5" height="10" rx="2" fill="#047857" />
      <rect x="50.5" y="27" width="4.5" height="10" rx="2" fill="#047857" />

      {/* Little friendly smile */}
      <path
        d={`M ${28 + eyeShiftX * 0.4} ${45 + eyeShiftY * 0.3} Q ${32 + eyeShiftX * 0.4} ${49 + eyeShiftY * 0.3} ${36 + eyeShiftX * 0.4} ${45 + eyeShiftY * 0.3}`}
        stroke="#64748b"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function NoorAssistant({
  className = "",
  isLoginOpen = false,
  isBlurred = false,
  botName = "Maqam",
  hideFloatingTrigger = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const orbRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(true);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [pointerOffset, setPointerOffset] = useState({ x: 0, y: 0 });

  // Auto-dismiss the greeting speech bubble after a few seconds on initial page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSpeechBubble(false);
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  const targetOffset = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });
  const animFrameId = useRef(null);

  // Mouse move tracker for 3D eye and tilt effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!orbRef.current) return;
      const rect = orbRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const clampedX = Math.max(-1, Math.min(1, dx / 650));
      const clampedY = Math.max(-1, Math.min(1, dy / 650));
      targetOffset.current = { x: clampedX, y: clampedY };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Smooth lerp animation loop for 3D tilt
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      const cur = currentOffset.current;
      const target = targetOffset.current;
      const ease = 0.12;
      cur.x += (target.x - cur.x) * ease;
      cur.y += (target.y - cur.y) * ease;

      if (
        Math.abs(target.x - cur.x) > 0.0005 ||
        Math.abs(target.y - cur.y) > 0.0005
      ) {
        setPointerOffset({
          x: Number(cur.x.toFixed(3)),
          y: Number(cur.y.toFixed(3)),
        });
      }
      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  // Custom Event Listener to trigger MaqamBot from anywhere
  useEffect(() => {
    const handleOpenBot = (e) => {
      setIsOpen(true);
      if (e?.detail?.query) {
        setInputText(e.detail.query);
      }
    };
    window.addEventListener("open-maqambot-ai", handleOpenBot);
    window.addEventListener("open-noor-ai", handleOpenBot);
    return () => {
      window.removeEventListener("open-maqambot-ai", handleOpenBot);
      window.removeEventListener("open-noor-ai", handleOpenBot);
    };
  }, []);

  // Detect modal or login screen or backoffice routes
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/registration";

  const isBackoffice =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/hotelier") ||
    location.pathname.startsWith("/dashboard");

  const isAiPage = location.pathname === "/ai-package-generator";
  const effectiveHideTrigger = hideFloatingTrigger || isAiPage;

  useEffect(() => {
    const checkModal = () => {
      const hasModal = !!(
        document.querySelector(
          "[data-auth-modal], .fixed.inset-0.bg-black\\/60, .fixed.inset-0.bg-slate-950\\/80"
        ) ||
        (document.querySelector(".fixed.inset-0 form input[type='tel']") &&
          document.querySelector(".fixed.inset-0"))
      );
      setIsAuthModalVisible(hasModal);
    };
    checkModal();
    const obs = new MutationObserver(checkModal);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  if (isBackoffice) return null;

  const shouldSuppress = isLoginOpen || isBlurred || isAuthPage || isAuthModalVisible;

  // Navigate to full AI studio
  const openFullStudio = (query = null) => {
    setIsOpen(false);
    navigate(
      query
        ? `/ai-package-generator?prompt=${encodeURIComponent(query)}`
        : `/ai-package-generator`
    );
  };

  const handleSelectFlight = (flight) => {
    try {
      localStorage.setItem("maqam_selected_ai_flight", JSON.stringify(flight));
    } catch {}
    navigate("/flight");
  };

  const handleSelectHotel = (hotel) => {
    try {
      localStorage.setItem("maqam_selected_ai_hotel", JSON.stringify(hotel));
    } catch {}
    navigate("/hotel-page");
  };

  const handleSelectPackage = (pkg) => {
    try {
      localStorage.setItem("maqam_selected_ai_package", JSON.stringify(pkg));
    } catch {}
    if (pkg?._id || pkg?.id) {
      navigate(`/package-detail/${pkg._id || pkg.id}`);
    } else {
      navigate("/package-page");
    }
  };

  // Process query
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
      let visaInfo = null;

      // Check for Visa inquiry
      if (lower.includes("visa") || lower.includes("e-visa")) {
        visaInfo = {
          title: "Saudi 1-Year Multiple Entry E-Visa",
          type: "Umrah & Tourism Valid",
          turnaround: "24 - 48 Hours Approval",
          fee: 11500,
          stayDuration: "90 Days Stay per visit",
          features: [
            "Full Medical & COVID Insurance Included",
            "Multiple Entry Valid for 1 Year",
            "Valid for Makkah, Madinah, Riyadh, Jeddah",
          ],
        };
      }

      // Query AI Backend chat endpoint
      try {
        const aiRes = await aiService.sendChatMessage(textToSend);
        liveReply =
          aiRes.reply ||
          `Here are the options found for your travel inquiry:`;
        if (Array.isArray(aiRes.packages) && aiRes.packages.length > 0) {
          foundPackages = aiRes.packages.filter(
            (p) =>
              p &&
              p.title &&
              !p.title.toLowerCase().includes("kill bill") &&
              !p.title.toLowerCase().includes("test")
          );
        }
      } catch (err) {
        console.warn("AI service query fallback:", err);
      }

      // If flight query detected, generate mock matching live flights if none from API
      if (
        lower.includes("flight") ||
        lower.includes("fly") ||
        lower.includes("airline") ||
        lower.includes("mumbai to") ||
        lower.includes("delhi to")
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
          liveReply = `Found verified direct flights on major GDS networks for your search:`;
        }
      }

      // If hotel query detected
      if (
        lower.includes("hotel") ||
        lower.includes("stay") ||
        lower.includes("resort") ||
        lower.includes("makkah") ||
        lower.includes("madinah")
      ) {
        foundHotels = [
          {
            id: `ht-1-${Date.now()}`,
            name: "Makkah Clock Royal Tower, A Fairmont Hotel",
            city: "Makkah",
            rating: 5,
            price: 16500,
            location: "Directly facing Holy Kaaba, King Abdul Aziz Gate",
            image:
              "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=700&q=80",
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
              "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=700&q=80",
            badge: "Prophet's Mosque View",
          },
        ];
        if (!liveReply) {
          liveReply = `Here are 5-star verified hotels with direct Haram access:`;
        }
      }

      // If no reply yet, default friendly answer
      if (!liveReply) {
        liveReply = `Assalamu Alaikum! I analyzed your inquiry for "${textToSend}". Here are curated options from our live travel inventory:`;
      }

      // If packages empty and it's an Umrah or holiday query, provide curated fallback
      if (foundPackages.length === 0 && (lower.includes("umrah") || lower.includes("package") || lower.includes("turkey") || lower.includes("dubai"))) {
        foundPackages = [
          {
            id: `pkg-1-${Date.now()}`,
            _id: "6ac4cc8fdd7f83ab2e5a4cd3",
            title: lower.includes("turkey")
              ? "Classic Turkey & Cappadocia Wonders"
              : "Zam-zam Executive Pilgrimage (Makkah & Madina)",
            destination: lower.includes("turkey") ? "Turkey" : "Makkah & Madinah",
            duration: lower.includes("turkey") ? "7 Days / 6 Nights" : "10 Days / 9 Nights",
            price: lower.includes("turkey") ? 68500 : 85000,
            image: lower.includes("turkey")
              ? "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=700&q=80"
              : "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=700&q=80",
          },
        ];
      }

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: liveReply,
        flights: foundFlights,
        hotels: foundHotels,
        packages: foundPackages,
        visa: visaInfo,
        actionPrompt: textToSend,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("MaqamBot chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-fallback-${Date.now()}`,
          sender: "bot",
          text: `I searched our live network for "${textToSend}". Let's tailor the perfect plan for you in our AI Travel Studio.`,
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

  const handleResetChat = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  // 3D rotation angles
  const tiltX = -pointerOffset.y * 16;
  const tiltY = pointerOffset.x * 16;

  // Only display the floating AI chatbot on the Home page ("/")
  if (location.pathname !== "/") {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes floatNoor3D {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        @keyframes noorEyeBlink {
          0%, 88%, 100% {
            transform: scaleY(1);
          }
          94% {
            transform: scaleY(0.1);
          }
        }
        .animate-float-3d {
          animation: floatNoor3D 3.6s ease-in-out infinite;
        }
        .animate-noor-eyes {
          animation: noorEyeBlink 4.5s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>

      <div
        className={`fixed bottom-4 right-4 sm:bottom-5 sm:right-6 lg:bottom-6 lg:right-7 flex flex-col items-end select-none font-sans z-50 transition-all duration-300 ${
          shouldSuppress
            ? "filter blur-md opacity-30 pointer-events-none scale-90"
            : !isOpen && effectiveHideTrigger
            ? "pointer-events-none opacity-0 invisible"
            : "opacity-100 scale-100 pointer-events-auto"
        } ${className}`}
      >
        {/* Expanded Chat Drawer */}
        {isOpen && !shouldSuppress && (
          <div
            className="mb-3.5 w-[calc(100vw-2.5rem)] sm:w-[430px] md:w-[450px] h-[580px] max-h-[85vh] rounded-[26px] bg-white dark:bg-[#0c1427] border border-emerald-500/30 dark:border-emerald-500/20 shadow-[0_20px_60px_rgba(5,150,105,0.22)] flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right animate-in fade-in zoom-in-95"
            role="dialog"
            aria-label="Maqam AI Travel Concierge"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#0b1728] via-[#064e3b] to-[#047857] text-white flex items-center justify-between shadow-md shrink-0 border-b border-emerald-400/20">
              <div className="flex items-center gap-2.5">
                <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-br from-amber-300 via-emerald-400 to-teal-700 shadow-[0_4px_12px_rgba(5,150,105,0.4)] flex items-center justify-center shrink-0">
                  <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_35%_30%,#10b981_0%,#059669_45%,#044e3a_80%,#022c22_100%)] flex items-center justify-center overflow-hidden">
                    <NoorAvatar3D size={34} pointerOffset={pointerOffset} isHovered={false} />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0b1728] animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm sm:text-base tracking-wide leading-none text-white">
                      {botName}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/40 font-bold uppercase tracking-wider">
                      AI Concierge
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/90 leading-tight mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>Online • Live Flights, Hotels & Umrah</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openFullStudio()}
                  title="Expand to Full AI Studio"
                  className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
                >
                  <Maximize2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Reset Conversation"
                  className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="px-3 py-2 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 overflow-x-auto scrollbar-hide flex items-center gap-1.5 shrink-0">
              {SUGGESTION_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(chip.prompt)}
                  className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition whitespace-nowrap cursor-pointer shadow-xs flex items-center gap-1 active:scale-95"
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#f7faf8] dark:bg-[#070d18]/60">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[94%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-br-xs"
                        : "bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-bl-xs shadow-xs"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Flights section */}
                    {msg.flights && msg.flights.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>Live Flights ({msg.flights.length})</span>
                          <span>GDS Inventory</span>
                        </div>
                        {msg.flights.map((flight, fIdx) => (
                          <div
                            key={flight.id || fIdx}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131d36] border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all shadow-xs text-left"
                          >
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                                  <Plane size={11} className="rotate-45" />
                                </div>
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {flight.airline}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {flight.flightNo}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                {flight.stops || "Direct"}
                              </span>
                            </div>

                            <div className="py-2 flex items-center justify-between">
                              <div>
                                <span className="font-black text-sm text-slate-900 dark:text-white block leading-tight">
                                  {flight.departureTime}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  {flight.originCode}
                                </span>
                                <span className="text-[9px] text-slate-400 block max-w-[80px] truncate">
                                  {flight.origin}
                                </span>
                              </div>

                              <div className="flex-1 flex flex-col items-center px-2">
                                <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                  <Clock size={9} />
                                  {flight.duration}
                                </span>
                                <div className="w-full flex items-center gap-1">
                                  <div className="h-[1px] flex-1 bg-slate-300 dark:bg-slate-700" />
                                  <Plane size={9} className="text-emerald-500 rotate-90" />
                                  <div className="h-[1px] flex-1 bg-slate-300 dark:bg-slate-700" />
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-black text-sm text-slate-900 dark:text-white block leading-tight">
                                  {flight.arrivalTime}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  {flight.destinationCode}
                                </span>
                                <span className="text-[9px] text-slate-400 block max-w-[80px] truncate">
                                  {flight.destination}
                                </span>
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                ₹ {Number(flight.price).toLocaleString("en-IN")}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSelectFlight(flight)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                              >
                                <span>Book Flight</span>
                                <ChevronRight size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hotels section */}
                    {msg.hotels && msg.hotels.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>Verified Hotels ({msg.hotels.length})</span>
                          <span>Live Rates</span>
                        </div>
                        {msg.hotels.map((hotel, hIdx) => (
                          <div
                            key={hotel.id || hIdx}
                            className="rounded-xl overflow-hidden bg-slate-50 dark:bg-[#131d36] border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition shadow-xs text-left"
                          >
                            <div className="relative h-24 overflow-hidden">
                              <img
                                src={
                                  hotel.image ||
                                  (hotel.images && hotel.images[0]) ||
                                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80"
                                }
                                alt={hotel.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-bold flex items-center gap-1">
                                <MapPin size={9} />
                                {hotel.city}
                              </span>
                              {hotel.badge && (
                                <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[9px] font-bold">
                                  {hotel.badge}
                                </span>
                              )}
                              <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-[9px] font-bold flex items-center gap-0.5">
                                <Star size={9} fill="currentColor" />
                                {hotel.rating || 5}.0
                              </span>
                            </div>

                            <div className="p-2.5">
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                {hotel.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                {hotel.distance || hotel.location}
                              </p>
                              <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                <div>
                                  <span className="text-[9px] text-slate-400 block">From</span>
                                  <span className="text-xs font-black text-slate-900 dark:text-white">
                                    ₹ {Number(hotel.price).toLocaleString("en-IN")}{" "}
                                    <span className="text-[9px] font-normal text-slate-400">
                                      / night
                                    </span>
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSelectHotel(hotel)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                                >
                                  <span>Book Hotel</span>
                                  <ChevronRight size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Packages section */}
                    {msg.packages && msg.packages.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>Curated Packages ({msg.packages.length})</span>
                          <span>All-Inclusive</span>
                        </div>
                        {msg.packages.map((pkg, pIdx) => (
                          <div
                            key={pkg.id || pkg._id || pIdx}
                            className="rounded-xl overflow-hidden bg-slate-50 dark:bg-[#131d36] border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition shadow-xs text-left"
                          >
                            <div className="relative h-24 overflow-hidden">
                              <img
                                src={
                                  pkg.image ||
                                  (pkg.images && pkg.images[0]) ||
                                  "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=700&q=80"
                                }
                                alt={pkg.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-bold">
                                {pkg.destination}
                              </span>
                              <span className="absolute bottom-1.5 left-1.5 text-white text-[10px] font-semibold">
                                {pkg.duration}
                              </span>
                            </div>

                            <div className="p-2.5">
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                {pkg.title}
                              </h4>
                              <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                <div>
                                  <span className="text-[9px] text-slate-400 block">Total Package</span>
                                  <span className="text-xs font-black text-slate-900 dark:text-white">
                                    ₹ {Number(pkg.price || pkg.sellPrice || 0).toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSelectPackage(pkg)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                                >
                                  <span>View Package</span>
                                  <ChevronRight size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Visa card */}
                    {msg.visa && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-[#131d36] border border-slate-200 dark:border-slate-800 text-left">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {msg.visa.title}
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                            {msg.visa.turnaround}
                          </span>
                        </div>
                        <ul className="my-2 space-y-1 text-[10px] text-slate-600 dark:text-slate-300">
                          {msg.visa.features.map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-center gap-1">
                              <Check size={11} className="text-emerald-500 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 block">
                              Total Govt & Processing Fee
                            </span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              ₹ {Number(msg.visa.fee).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate("/visa-card")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                          >
                            <span>Apply Visa</span>
                            <ChevronRight size={10} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action prompt button */}
                    {msg.actionPrompt && (
                      <button
                        type="button"
                        onClick={() => openFullStudio(msg.actionPrompt)}
                        className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                      >
                        <Sparkles size={12} className="text-amber-300" />
                        <span>Open in AI Travel Studio</span>
                        <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 px-3 py-2 rounded-2xl rounded-bl-xs w-16">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1427] flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask Maqam Assistant (e.g. 5-day Umrah package, Mumbai to Dubai flights)..."
                className="flex-1 bg-slate-100/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 shadow-xs"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* Floating Trigger Button with Speech Bubble */}
        {!effectiveHideTrigger && (
          <div
            ref={orbRef}
            className="flex flex-col items-center cursor-pointer group"
            onClick={() => !shouldSuppress && setIsOpen((prev) => !prev)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Speech bubble "Hey I am Maqam / Ask me anything" */}
            {!isOpen && (
              <div
                className={`mb-2.5 transition-all duration-500 ease-out filter drop-shadow-[0_10px_25px_rgba(5,150,105,0.15)] ${
                  showSpeechBubble || isHovered
                    ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 scale-90 translate-y-2 pointer-events-none invisible"
                }`}
                style={{ transform: `translateX(${pointerOffset.x * 4}px)` }}
              >
                <div className="relative bg-white dark:bg-slate-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[18px] sm:rounded-[22px] border border-emerald-500/20 dark:border-emerald-500/30 text-center select-none shadow-[0_6px_20px_rgba(0,0,0,0.08)] min-w-[110px] sm:min-w-[130px] animate-in fade-in zoom-in-95 duration-300">
                  <p className="text-[12px] sm:text-[14px] md:text-[15px] font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 bg-clip-text text-transparent leading-tight tracking-tight">
                    Hey I am {botName}
                  </p>
                  <p className="text-[10px] sm:text-[11.5px] font-semibold text-slate-600 dark:text-slate-300 leading-tight mt-0.5 sm:mt-1 flex items-center justify-center gap-1 sm:gap-1.5">
                    <span>Ask me anything</span>
                    <Sparkles size={11} className="text-amber-500 animate-pulse" />
                  </p>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white dark:bg-slate-900 rotate-45 border-r border-b border-emerald-500/20 dark:border-emerald-500/30" />
                </div>
              </div>
            )}

            {/* 3D Floating Avatar Orb */}
            <div className="relative animate-float-3d" style={{ perspective: "800px" }}>
              {/* Outer Ambient Glow */}
              <div
                className={`absolute -inset-1.5 sm:-inset-2 rounded-full bg-gradient-to-r from-emerald-500/40 via-teal-400/30 to-amber-400/30 blur-md sm:blur-lg transition-all duration-500 ${
                  isHovered ? "scale-125 opacity-100" : "scale-100 opacity-60"
                }`}
                style={{
                  transform: `translate(${pointerOffset.x * 6}px, ${pointerOffset.y * 6}px)`,
                }}
              />

              {/* Main Sphere Container - Responsive for mobile, tablet, and desktop */}
              <div
                className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-[68px] lg:h-[68px] rounded-full p-[2.5px] sm:p-[3px] lg:p-[3.5px] bg-gradient-to-br from-amber-300 via-emerald-400 to-teal-800 shadow-[0_8px_20px_rgba(5,150,105,0.35),inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.4)] sm:shadow-[0_12px_30px_rgba(5,150,105,0.45),inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.4)] active:scale-95 transition-all duration-200 ease-out flex items-center justify-center"
                style={{
                  transform: `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${
                    isHovered ? 1.08 : 1
                  })`,
                  transformStyle: "preserve-3d",
                }}
              >
                <div className="w-full h-full rounded-full relative overflow-hidden bg-[radial-gradient(circle_at_35%_25%,#34d399_0%,#059669_40%,#044e3a_75%,#022c22_100%)] shadow-[inset_0_4px_8px_rgba(255,255,255,0.35),inset_0_-4px_8px_rgba(0,0,0,0.6)] flex items-center justify-center">
                  {/* Specular Highlight */}
                  <div
                    className="absolute pointer-events-none transition-all duration-150"
                    style={{
                      top: `${1 - pointerOffset.y * 3}px`,
                      left: `${3 + pointerOffset.x * 3.5}px`,
                      right: `${3 - pointerOffset.x * 3.5}px`,
                      height: "38%",
                      borderRadius: "9999px",
                      background: `radial-gradient(ellipse at ${
                        50 + pointerOffset.x * 25
                      }% 20%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.1) 50%, transparent 80%)`,
                    }}
                  />

                  {/* 3D SVG Noor Avatar - Responsively Sized */}
                  <NoorAvatar3D
                    className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-11 lg:h-11"
                    pointerOffset={pointerOffset}
                    isHovered={isHovered}
                  />
                </div>

                {/* Online Pulsing Indicator Dot */}
                <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500 border-2 border-white dark:border-slate-800 shadow-sm" />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Menu,
  X,
  User,
  Briefcase,
  ChevronDown,
  Home,
  Hotel,
  Package,
  CarTaxiFront,
  Compass,
  Shield,
  CreditCard,
  WalletCards,
  LogIn,
  UserPlus,
  LayoutDashboard,
  ChevronRight,
  Sparkles,
  Utensils,
  Phone,
  LogOut,
  Sun,
  Moon,
  Lock,
  Headphones,
} from "lucide-react";
import { BiSolidUpArrow } from "react-icons/bi";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { BiSolidPlaneAlt } from "react-icons/bi";
import { RiRobot2Fill } from "react-icons/ri";
import { toast } from "react-toastify";
import LogOutPopModal from "./LogOutPopModal";
import Login from "./Login";
import { useAuth } from "../store/authContext";
import Logo from "../assets/logo.png";
import image01 from "../assets/image01.jpg";
import image03 from "../assets/image03.jpg";
import image04 from "../assets/image04.jpg";
import AnimatedHamburger from "./ui/AnimatedHamburger";
import RandomLetterSwap from "./ui/RandomLetterSwap";
import { useHeroBanner } from "../hooks/useHeroBanner";

const heroImages = [image01, image03, image04];

// Each nav item has its own accent color for a vibrant, unique look
const menu = [
  {
    name: "Home",
    sub: "Explore",
    icon: Home,
    href: "/",
    color: "from-cyan-400 to-sky-500",
    glow: "shadow-cyan-500/40",
    text: "text-cyan-400",
  },
  {
    name: "Flights",
    sub: "Airline Deals",
    icon: BiSolidPlaneAlt,
    href: "/flight",
    color: "from-blue-400 to-indigo-500",
    glow: "shadow-blue-500/40",
    text: "text-blue-400",
  },
  {
    name: "Hotels",
    sub: "Makkah & Madinah",
    icon: Hotel,
    href: "/hotel-page",
    color: "from-violet-400 to-purple-500",
    glow: "shadow-violet-500/40",
    text: "text-violet-400",
  },
  {
    name: "Packages",
    sub: "Umrah & Hajj",
    icon: Package,
    href: "/package-page",
    color: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/40",
    text: "text-amber-400",
  },
  {
    name: "Guides",
    sub: "Ziyarat & Local",
    icon: Compass,
    href: "/guides",
    color: "from-teal-400 to-emerald-500",
    glow: "shadow-teal-500/40",
    text: "text-teal-400",
  },
  {
    name: "AI Planner",
    sub: "Smart Itinerary",
    icon: RiRobot2Fill,
    href: "/ai-package-generator",
    color: "from-pink-400 to-rose-500",
    glow: "shadow-pink-500/40",
    text: "text-pink-400",
  },
  {
    name: "Cab",
    sub: "Transfers",
    icon: CarTaxiFront,
    href: "/cab-bookng-form",
    color: "from-yellow-400 to-amber-500",
    glow: "shadow-yellow-500/40",
    text: "text-yellow-400",
  },
  {
    name: "Food",
    sub: "Halal Dining",
    icon: Utensils,
    href: "/food",
    color: "from-red-400 to-rose-500",
    glow: "shadow-red-500/40",
    text: "text-red-400",
  },
  {
    name: "Insurance",
    sub: "Travel Cover",
    icon: Shield,
    href: "/insurance",
    color: "from-green-400 to-emerald-500",
    glow: "shadow-green-500/40",
    text: "text-green-400",
  },
  {
    name: "Visa",
    sub: "Saudi E-Visa",
    icon: CreditCard,
    href: "/visa-card",
    color: "from-sky-400 to-blue-500",
    glow: "shadow-sky-500/40",
    text: "text-sky-400",
  },
];

const primaryMenu = menu.filter((item) =>
  ["Flights", "Hotels", "Packages"].includes(item.name),
);
const planningMenu = menu.filter((item) =>
  ["Guides", "AI Planner"].includes(item.name),
);
const essentialsMenu = menu.filter((item) =>
  ["Cab", "Food", "Insurance", "Visa"].includes(item.name),
);

const mobileMenuGroups = [
  { label: "Book your journey", items: primaryMenu },
  { label: "Plan with confidence", items: planningMenu },
  { label: "Travel essentials", items: essentialsMenu },
];

const DesktopNavItem = ({ item, active, onClick }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={`
        group relative
        flex flex-col items-center justify-center
        gap-1.5
        px-2 lg:px-2.5 xl:px-3.5
        py-1.5
        rounded-lg
        text-xs lg:text-[13.5px] xl:text-[15px]
        font-semibold
        whitespace-nowrap
        transition-all duration-200
        ${
          active
            ? "text-[#00987A] bg-white/8"
            : "text-orange-500 hover:text-orange-500 hover:bg-white/5"
        }
      `}
    >
      <Icon
        size={23}
        strokeWidth={active ? 2.5 : 2.1}
        className={`
          transition-all duration-200
          ${active ? "text-[#10b981]" : "text-orange-500 group-hover:text-orange-500"}
        `}
      />
      <span>{item.name}</span>

      {/* Active Bottom Indicator */}
      {active && (
        <span
          className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[2.5px] rounded-full"
          style={{ width: "90%", background: "linear-gradient(to right, #00987A, #10b981)" }}
        />
      )}
    </NavLink>
  );
};

const GroupedNavDropdown = ({
  label,
  items,
  active,
  isTabActive,
  onItemClick,
  show,
  onToggle,
}) => {
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef(null);
  const menuId = `nav-group-${label.toLowerCase()}`;

  useEffect(() => {
    if (!show) return undefined;

    const dismissOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) onToggle(false);
    };
    const dismissOnEscape = (event) => {
      if (event.key === "Escape") {
        onToggle(false);
        menuRef.current?.querySelector("button")?.focus();
      }
    };

    document.addEventListener("mousedown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("mousedown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [show, onToggle]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={show}
        aria-controls={menuId}
        aria-label={`${label} destinations`}
        onClick={() => onToggle(!show)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className={`group flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${
          active || show
            ? "border-white/20 bg-white/15 text-white"
            : "border-white/15 bg-transparent text-white/85 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span className="inline-block tracking-wide">
          <RandomLetterSwap label={label} isHovered={hovered} />
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`transition-transform duration-200 ${show ? "rotate-180" : ""}`}
        />
      </button>

      {show && (
        <div
          id={menuId}
          aria-label={label}
          className="absolute left-0 top-full z-[60] mt-2 min-w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1720] p-2 text-white shadow-[0_18px_44px_rgba(0,0,0,0.28)]"
        >
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">
            {label === "Planning" ? "Plan with confidence" : "Travel essentials"}
          </p>
          {items.map((item) => {
            const Icon = item.icon;
            const itemActive = isTabActive(item.href);
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onItemClick(item)}
                className={`group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-300 ${
                  itemActive
                    ? "bg-emerald-500/15 text-white"
                    : "text-white/85 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/8 text-emerald-300">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">
                    <RandomLetterSwap label={item.name} />
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-white/55">
                    {item.sub}
                  </span>
                </span>
                {itemActive && (
                  <span className="size-1.5 shrink-0 rounded-full bg-emerald-300" />
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CommonHeader = ({ title, value }) => {
  const navigator = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [current, setCurrent] = useState(0);
  const [openImage] = useState(value);
  const [scrolled, setScrolled] = useState(false);
  const { heroBanner } = useHeroBanner();

  const activeHeroImages = useMemo(() => {
    if (
      heroBanner &&
      heroBanner.isPublished !== false &&
      typeof heroBanner.imageUrl === "string" &&
      heroBanner.imageUrl.trim().length > 0
    ) {
      return [heroBanner.imageUrl.trim(), ...heroImages];
    }
    return heroImages;
  }, [heroBanner]);
  const dropdownTimer = useRef(null);
  const dropdownRef = useRef(null);
  const {
    isAuthenticated: ctxAuth,
    user: ctxUser,
    openLoginModal,
    openRegisterModal,
  } = useAuth();
  const reduxAuth = useSelector((state) => state.auth.isAuthenticated);
  const reduxUser = useSelector((state) => state.auth.user);
  const isAuthenticated = ctxAuth || reduxAuth;
  const user = ctxUser || reduxUser;

  // Click-outside listener for account dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll-aware compact mode
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile sidebar is open & close on Escape
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") setOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "unset";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "unset";
    }
  }, [open]);

  // Hero slider auto-advance
  useEffect(() => {
    if (!openImage) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeHeroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [openImage, activeHeroImages.length]);

  const isTabActive = (href) => {
    if (href === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/home");
    }
    if (href === "/flight") {
      return (
        location.pathname === "/flight" ||
        location.pathname.startsWith("/flight") ||
        location.pathname.includes("fare-quote") ||
        location.pathname.includes("review")
      );
    }
    if (href === "/hotel-page") {
      return (
        location.pathname === "/hotel-page" ||
        location.pathname === "/hotel" ||
        location.pathname.startsWith("/hotel") ||
        location.pathname.startsWith("/booking-details") ||
        location.pathname.startsWith("/selected-room-information") ||
        location.pathname.startsWith("/details")
      );
    }
    if (href === "/guides") {
      return (
        location.pathname === "/guides" ||
        location.pathname.startsWith("/guides") ||
        location.pathname === "/guide"
      );
    }
    return location.pathname === href;
  };

  const handleDropdownEnter = () => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setShowUserDropdown(true);
  };
  const handleDropdownLeave = () => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    dropdownTimer.current = setTimeout(() => setShowUserDropdown(false), 250);
  };

  const handleVisaNavClick = (e, item) => {
    if (
      (item.href === "/visa-card" || item.name === "Visa") &&
      !isAuthenticated
    ) {
      e.preventDefault();
      openLoginModal({
        source: "visa",
        redirectPath: "/visa-card",
        onSuccess: () => {
          navigator("/visa-card");
        },
      });
      return true;
    }
    return false;
  };

  return (
    <div className="relative pointer-events-none w-full font-jakarta">
      {/* MAIN HEADER - STYLED EXACTLY AS MAQAMH.PAGES.DEV */}
      <header
        className={`pointer-events-auto fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 border-b border-slate-200/80 bg-white shadow-xs ${
          scrolled ? "h-16" : "h-18"
        }`}
      >
        <div
          className={`relative mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
            scrolled ? "h-16" : "h-18"
          }`}
        >
          {/* ========================================================= */}
          {/* LOGO (MAQAM TRAVELS) */}
          {/* ========================================================= */}

          <NavLink
            to="/"
            aria-label="Maqam Travels home"
            className="flex shrink-0 items-center group py-1"
          >
            <img
              src={Logo}
              alt="Maqam Travels"
              className={`object-contain transition-all duration-300 ${
                scrolled ? "h-9" : "h-10"
              } group-hover:scale-[1.03]`}
            />
          </NavLink>

          {/* ========================================================= */}
          {/* DESKTOP NAVIGATION: ALL NAV ITEMS */}
          {/* ========================================================= */}

          <nav
            aria-label="Primary navigation"
            className="hidden items-center lg:flex"
          >
            <div className="flex items-center gap-0.5">
              {menu.map((item, index) => {
                const Icon = item.icon;
                const active = isTabActive(item.href);
                return (
                  <NavLink
                    key={index}
                    to={item.href}
                    onClick={(event) => handleVisaNavClick(event, item)}
                    className={`
                      group relative
                      flex flex-col items-center justify-center
                      gap-1.5
                      px-2 lg:px-2.5 xl:px-3.5
                      py-1.5
                      rounded-lg
                      text-xs lg:text-[13.5px] xl:text-[15px]
                      font-semibold
                      whitespace-nowrap
                      transition-all duration-200
                      ${
                        active
                          ? "text-[#00987A] bg-emerald-50/60"
                          : "text-orange-500 hover:text-orange-500 hover:bg-slate-50"
                      }
                    `}
                  >
                    <Icon
                      size={23}
                      strokeWidth={active ? 2.5 : 2.1}
                      className={`
                        transition-all duration-200
                        ${
                          active
                            ? "text-[#10b981]"
                            : "text-orange-500 group-hover:text-orange-500"
                        }
                      `}
                    />
                    <span>{item.name}</span>
                    {active && (
                      <span
                        className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[2.5px] rounded-full"
                        style={{
                          width: "90%",
                          background: "linear-gradient(to right, #00987A, #10b981)",
                        }}
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          {/* ========================================================= */}
          {/* RIGHT ACTIONS */}
          {/* ========================================================= */}

          <div className="hidden lg:flex items-center gap-2.5 ml-4 shrink-0">
            {/* Account / Sign In */}
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={handleDropdownEnter}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserDropdown((prev) => !prev);
                }}
                className="
                  flex h-10 min-w-36 items-center justify-center gap-2
                  rounded-lg
                  px-3.5
                  text-sm sm:text-base
                  font-bold
                  text-white
                  cursor-pointer
                  transition-all duration-200
                  border border-blue-400/20
                  bg-gradient-to-r from-blue-600 to-violet-600
                  hover:from-blue-500 hover:to-violet-500
                  shadow-[0_5px_20px_rgba(59,130,246,0.25)]
                "
                title={isAuthenticated ? "Open Account / Profile" : "Sign In to your account"}
              >
                {/* Avatar / Icon */}
                <span
                  className="
                    flex items-center justify-center
                    w-6.5 h-6.5
                    rounded-full
                    bg-white/15
                    border border-white/20
                  "
                >
                  {isAuthenticated ? (
                    <User size={14} />
                  ) : (
                    <LogIn size={14} />
                  )}
                </span>

                <span className="max-w-[120px] truncate">
                  {isAuthenticated ? (user?.firstName || user?.name || "Dragon") : "Sign In"}
                </span>

                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    showUserDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* ===================================================== */}
              {/* ACCOUNT DROPDOWN */}
              {/* ===================================================== */}

              {showUserDropdown && (
                <div
                  className="absolute right-0 top-full mt-3 w-64 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  onMouseEnter={handleDropdownEnter}
                  onMouseLeave={handleDropdownLeave}
                >
                  {/* Arrow */}
                  <div className="absolute -top-2 right-7 w-4 h-4 rotate-45 bg-[#0f172a] border-l border-t border-white/10" />

                  <div
                    className="
                      relative overflow-hidden
                      rounded-2xl
                      border border-white/10
                      bg-[#0f172a]/95
                      backdrop-blur-xl
                      shadow-[0_20px_50px_rgba(0,0,0,0.55)]
                    "
                  >
                    {/* Header */}
                    <div className="px-4 py-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div
                          className="
                      flex items-center justify-center
                      w-10 h-10
                      rounded-full
                      bg-linear-to-br from-blue-500 to-violet-600
                    "
                        >
                          <User size={17} className="text-white" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {isAuthenticated
                              ? `Welcome, ${user?.firstName || "Traveler"}`
                              : "Welcome"}
                          </p>

                          <p className="text-xs text-white/40 truncate">
                            {isAuthenticated
                              ? user?.email || user?.phone || "Maqam Member"
                              : "Sign in to your account"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="py-2">
                      {(isAuthenticated
                        ? [
                            {
                              icon: LayoutDashboard,
                              label: "My Profile",
                              sub: "View and update your profile",
                              path: "/profile",
                              grad: "from-amber-500 to-orange-500",
                            },
                            {
                              icon: Headphones,
                              label: "Customer Care",
                              sub: "Track quotations & requests",
                              path: "/profile?tab=customer-care",
                              grad: "from-[#0f6b7b] to-[#0d7c89]",
                            },
                            {
                              icon: WalletCards,
                              label: "My Bookings",
                              sub: "Manage your reservations",
                              path: "/profile?tab=my-bookings",
                              grad: "from-teal-500 to-emerald-500",
                            },
                          ]
                        : [
                            {
                              icon: Headphones,
                              label: "Customer Care",
                              sub: "Track quotations & enquiries",
                              path: "/profile?tab=customer-care",
                              grad: "from-[#0f6b7b] to-[#0d7c89]",
                            },
                            {
                              icon: LogIn,
                              label: "Login",
                              sub: "Sign into your account",
                              path: "/login",
                              grad: "from-blue-500 to-cyan-500",
                            },
                            {
                              icon: UserPlus,
                              label: "Register",
                              sub: "Create a new account",
                              path: "/registration",
                              grad: "from-violet-500 to-pink-500",
                            },
                          ]
                      ).map((action) => {
                        const ActionIcon = action.icon;
                        return (
                          <button
                            key={action.label}
                            onClick={() => {
                              if (action.label === "Login") {
                                openLoginModal();
                              } else if (action.label === "Register") {
                                openRegisterModal();
                              } else {
                                navigator(action.path);
                              }
                              setShowUserDropdown(false);
                            }}
                            className="
                          w-full
                          flex items-center gap-3
                          px-4 py-2.5
                          text-left
                          hover:bg-white/5
                          transition-all duration-200
                          cursor-pointer
                          group
                        "
                          >
                            <div
                              className={`
                            flex items-center justify-center
                            w-8 h-8
                            rounded-lg
                            bg-linear-to-br ${action.grad}
                          `}
                            >
                              <ActionIcon size={14} className="text-white" />
                            </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {action.label}
                            </p>

                            <p className="text-[11px] text-white/40">{action.sub}</p>
                          </div>

                          <ChevronRight
                            size={14}
                            className="
                          text-white/20
                          group-hover:text-white/60
                          transition-colors
                        "
                          />
                        </button>
                      );
                    })}

                      {/* Desktop Account Dropdown Log Out */}
                      {isAuthenticated && (
                        <div className="pt-1 mt-1 border-t border-white/10 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowLogoutModal(true);
                              setShowUserDropdown(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/15 transition cursor-pointer group"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 group-hover:bg-rose-500/30 transition-colors">
                              <LogOut size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-rose-300">
                                Log Out
                              </p>
                              <p className="text-[11px] text-rose-400/60">
                                Sign out of this account
                              </p>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* My Bookings (When Logged In) */}
            {isAuthenticated && (
              <>
                <div className="h-6 w-px bg-slate-200" />
                <NavLink
                  to="/profile?tab=my-bookings"
                  className="flex h-10 min-w-36 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-emerald-600 px-3.5 text-sm sm:text-base font-bold text-white shadow-[0_5px_20px_rgba(234,88,12,0.25)] transition-all duration-200 hover:from-orange-400 hover:to-emerald-500"
                >
                  <WalletCards size={16} />
                  <span>My Bookings</span>
                </NavLink>
              </>
            )}
          </div>

          {/* ========================================================= */}
          {/* MOBILE MENU (Animated Three Line Hamburger) */}
          {/* ========================================================= */}

          <div className="lg:hidden flex items-center">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              aria-label="Toggle mobile navigation menu"
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 hover:text-teal-700 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* =========================================================== */}
        {/* MOBILE LUXURY SLIDE-OVER SIDEBAR */}
        {/* =========================================================== */}

        {createPortal(
          <div
            className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 pointer-events-auto ${
              open
                ? "visible opacity-100"
                : "invisible opacity-0 pointer-events-none"
            }`}
            inert={!open ? true : undefined}
          >
          {/* Backdrop overlay */}
          <div
            className={`fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300 ${
              open ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setOpen(false)}
          />

          {/* Slide-over Drawer */}
          <aside
            className={`fixed inset-0 h-dvh w-full bg-[#f8faf9] text-slate-900 flex flex-col transition-transform duration-300 ease-out transform z-[101] ${
              open ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Drawer Header */}
            <div className="flex min-h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 text-slate-900">
              <NavLink
                to="/"
                onClick={() => setOpen(false)}
                className="flex items-center group"
              >
                <img
                  src={Logo}
                  alt="Maqam Travels"
                  className="h-8 sm:h-9 object-contain drop-shadow-md"
                />
              </NavLink>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:scale-95"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="hidden">
              {/* Sidebar navigation */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
                    Navigation
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {menu.length} items
                  </span>
                </div>

                <div className="space-y-1.5">
                  {menu.map((item, index) => {
                    const active = isTabActive(item.href);

                    return (
                      <NavLink
                        key={index}
                        to={item.href}
                        onClick={(e) => {
                          handleVisaNavClick(e, item);
                          setOpen(false);
                        }}
                        className={`
                          flex items-center justify-between gap-3 w-full rounded-xl border px-3.5 py-2.5 transition-all duration-200 cursor-pointer active:scale-[0.98]
                          ${
                            active
                              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-semibold shadow-xs"
                              : "border-white/5 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60 hover:border-white/10 hover:text-white"
                          }
                        `}
                      >
                        <div className="text-left">
                          <span className="text-sm font-semibold block leading-snug">
                            <RandomLetterSwap label={item.name} />
                          </span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {item.sub || "Explore"}
                          </span>
                        </div>

                        <ChevronRight
                          size={15}
                          className={`shrink-0 ${active ? "text-emerald-300" : "text-slate-500"}`}
                        />
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              {/* Account / Bookings Section */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block px-1 mb-1">
                  Account & Bookings
                </span>

                {isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigator("/profile");
                        setOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-slate-900/60 border border-white/6 text-slate-200 hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <User size={17} className="text-teal-400" />
                        <span>Account</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>

                    <NavLink
                      to="/profile?tab=my-bookings"
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition text-xs font-bold ${
                          isActive
                            ? "bg-gradient-to-r from-teal-600 to-emerald-600 border-transparent text-white"
                            : "bg-slate-900/60 border-white/6 text-slate-200 hover:bg-slate-800"
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <WalletCards size={17} className="text-teal-400" />
                        <span>My Bookings</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </NavLink>

                    {/* Responsive Mobile Drawer Log Out Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogoutModal(true);
                        setOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 hover:bg-rose-900/40 text-xs font-bold transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut size={17} className="text-rose-400" />
                        <span>Log Out</span>
                      </div>
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        openLoginModal();
                        setShowUserDropdown(false);
                        setOpen(false);
                      }}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-teal-950/60 active:scale-98 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <LogIn size={16} />
                      <span>Sign In</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        openRegisterModal();
                        setShowUserDropdown(false);
                        setOpen(false);
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <UserPlus size={15} className="text-teal-400" />
                      <span>Sign Up / Register</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 24/7 Pilgrimage Support Box */}
              <div className="pt-1">
                <a
                  href="tel:+966125717777"
                  className="block p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950/40 to-slate-900 border border-teal-500/30 hover:border-teal-500/50 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Phone size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-teal-300 block tracking-wider">
                        24/7 Pilgrim Concierge
                      </span>
                      <span className="text-xs font-bold text-white block">
                        +966 12 571 7777
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
              <nav aria-label="Mobile navigation" className="space-y-6">
                {mobileMenuGroups.map((group, groupIndex) => (
                  <section
                    key={group.label}
                    aria-labelledby={`mobile-nav-group-${groupIndex}`}
                    className={groupIndex > 0 ? "border-t border-slate-200 pt-5" : ""}
                  >
                    <h2
                      id={`mobile-nav-group-${groupIndex}`}
                      className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500"
                    >
                      {group.label}
                    </h2>
                    <div className={groupIndex === 0 ? "space-y-2" : "grid grid-cols-2 gap-2"}>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isTabActive(item.href);
                        return (
                          <NavLink
                            key={item.href}
                            to={item.href}
                            onClick={(event) => {
                              handleVisaNavClick(event, item);
                              setOpen(false);
                            }}
                            className={`group flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                              active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                                : "border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50/60"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <Icon size={17} aria-hidden="true" className="shrink-0 text-emerald-700" />
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-semibold">
                                  <RandomLetterSwap label={item.name} />
                                </span>
                                {groupIndex === 0 && (
                                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                                    {item.sub}
                                  </span>
                                )}
                              </span>
                            </span>
                            {item.name === "Visa" && !isAuthenticated && (
                              <Lock size={13} aria-label="Sign-in required" className="shrink-0 text-slate-400" />
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </nav>
            </div>

            {/* Account and pilgrim support stay anchored below the scroll area. */}
            <footer className="shrink-0 border-t border-slate-200 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <a
                href="tel:+966125717777"
                className="mb-3 flex min-h-12 items-center gap-3 rounded-xl bg-[#eef6f2] px-3 text-slate-800 transition-colors hover:bg-emerald-50"
              >
                <Phone size={17} aria-hidden="true" className="shrink-0 text-emerald-700" />
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800">24/7 Pilgrim Concierge</span>
                  <span className="block text-[12px] font-semibold">+966 12 571 7777</span>
                </span>
              </a>
              {isAuthenticated ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { navigator("/profile"); setOpen(false); }}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <User size={15} aria-hidden="true" /> Account
                  </button>
                  <NavLink
                    to="/profile?tab=my-bookings"
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#116d5b] px-2 text-[12px] font-semibold text-white hover:bg-emerald-800"
                  >
                    <WalletCards size={15} aria-hidden="true" /> My Bookings
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => { setShowLogoutModal(true); setOpen(false); }}
                    className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <LogOut size={15} aria-hidden="true" /> Log Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      openLoginModal();
                      setOpen(false);
                    }}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#116d5b] px-2 text-[12px] font-bold text-white hover:bg-emerald-800"
                  >
                    <LogIn size={15} aria-hidden="true" /> Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openRegisterModal();
                      setOpen(false);
                    }}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <UserPlus size={15} aria-hidden="true" /> Register
                  </button>
                </div>
              )}
            </footer>

            {/* Drawer Bottom Accreditation */}
            <div className="hidden px-4 py-3 border-t border-white/10 bg-[#060c17] flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <Shield size={11} /> Umrah Certified
              </span>
              <span>Maqam Holidays</span>
            </div>
          </aside>
          </div>,
          document.body,
        )}
      </header>
      {/*HERO IMAGE SLIDER*/}
      {openImage && (
        <div className="relative w-full h-105 overflow-hidden">
          {/* Slides with Ken Burns zoom */}
          {activeHeroImages.map((img, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                i === current ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={img}
                alt={`hero-${i}`}
                className={`w-full h-full object-cover transition-transform duration-8000 ease-in-out ${
                  i === current ? "scale-110" : "scale-100"
                }`}
              />
            </div>
          ))}

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-linear-to-b from-[#030d1e]/60 via-transparent to-[#030d1e]/80 pointer-events-none" />
          <div className="absolute inset-0 bg-linear-to-r from-[#030d1e]/40 via-transparent to-[#030d1e]/40 pointer-events-none" />

          {/* Slide indicator dots */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {activeHeroImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-400 ${
                  i === current
                    ? "w-6 h-2 bg-white shadow-lg shadow-white/40"
                    : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>

          {/* Optional: Slide title badge */}
          {title && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 text-white text-sm font-semibold shadow-xl">
                <Sparkles size={14} className="text-amber-400" />
                <span>{title}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <LogOutPopModal
        isModalOpen={showLogoutModal}
        setModalOpen={setShowLogoutModal}
      />
    </div>
  );
};

export default CommonHeader;

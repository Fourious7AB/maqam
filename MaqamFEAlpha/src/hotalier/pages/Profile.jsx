import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Hotel,
  Mail,
  MapPin,
  Phone,
  Star,
  User,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  Clock,
  BedDouble,
  Plus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { useHotelierData } from "../components/hotelierContext";

function formatDate(isoStr) {
  if (!isoStr) return "Not available";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoStr;
  }
}

export default function Profile() {
  const { profile } = useHotelierData();
  const { user, hotel } = profile ?? {};
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, label, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const memberSince = formatDate(user?.createdAt);
  const lastActive = user?.lastLogin ? formatDate(user.lastLogin) : "Current active session";

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-emerald-950">Hotel profile</h2>
          <p className="text-sm text-slate-500">
            Property dossier and authorized manager credentials
          </p>
        </div>
      </div>

      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-sm sm:p-6"
        style={{
          backgroundImage:
            "linear-gradient(120deg,#065f46 0%,#047857 55%,#059669 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full opacity-30 blur-2xl"
          style={{ background: "radial-gradient(circle,#6ee7b7,transparent 70%)" }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-100">
                Hotelier Portal
              </span>
              <span className="rounded-full bg-emerald-300/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-100">
                Active Property
              </span>
            </div>
            <h1 className="mt-2 truncate text-xl font-bold tracking-tight sm:text-2xl">
              {hotel?.name || "InterContinental Riyadh"}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-100/90">
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {hotel?.destination || "Riyadh, Saudi Arabia"}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Star size={13} fill="currentColor" strokeWidth={0} /> {hotel?.starRating || 5} Star Luxury Hotel
              </span>
            </p>
          </div>

          <div className="shrink-0">
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-inset ring-white/15">
              <div className="text-[10px] uppercase tracking-wider text-emerald-200">
                Account Manager
              </div>
              <div className="text-sm font-bold text-white">
                {user?.fullName || "arav Doe"}
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-100/80">
                Joined {memberSince}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Dossier Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Hotel Property Dossier */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between border-b border-emerald-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/50">
                <Hotel size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">Property information</h3>
                <p className="text-[11px] text-slate-500">Assigned property records</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              {hotel?.isActive !== false ? "Active listing" : "Inactive"}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {/* Property Name */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Hotel name
              </label>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                {hotel?.name || "InterContinental Riyadh"}
              </div>
            </div>

            {/* Hotel ID with copy */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Hotel ID (system reference)
              </label>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-mono text-slate-700">
                <span className="truncate">{hotel?.id || "6abbab020d38868cbc2e4859"}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(hotel?.id, "Hotel ID", "hotelId")}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-slate-200 hover:bg-emerald-50"
                >
                  {copiedKey === "hotelId" ? (
                    <>
                      <Check size={12} className="text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Location & Address */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Destination
                </label>
                <div className="mt-0.5 text-xs font-medium text-slate-800">
                  {hotel?.destination || "Riyadh, Saudi Arabia"}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Star rating
                </label>
                <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                  <Star size={12} fill="currentColor" strokeWidth={0} /> {hotel?.starRating || 5} Stars
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Address
              </label>
              <div className="mt-0.5 text-xs text-slate-700">
                {hotel?.address || "King Fahd Road, Al Olaya, Riyadh, Saudi Arabia"}
              </div>
            </div>

            {/* Amenities */}
            {hotel?.amenities?.length ? (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Property amenities
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {hotel.amenities.map((item) => (
                    <span
                      key={item}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Hotelier Account Card */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between border-b border-emerald-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/50">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">Manager credentials</h3>
                <p className="text-[11px] text-slate-500">Authorized hotelier user profile</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              {user?.role || "hotelier"}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {/* Full Name */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Full name
                </label>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">
                  {user?.fullName || "arav Doe"}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Account status
                </label>
                <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  {user?.isActive ? "Active account" : "Inactive"}
                </div>
              </div>
            </div>

            {/* User ID with copy */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                User ID (account reference)
              </label>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-mono text-slate-700">
                <span className="truncate">{user?.id || "6abe102f97033b181b2b7126"}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(user?.id, "User ID", "userId")}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-slate-200 hover:bg-emerald-50"
                >
                  {copiedKey === "userId" ? (
                    <>
                      <Check size={12} className="text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Email Address & Verification */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Email address
              </label>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                <span className="flex items-center gap-2 truncate text-slate-800">
                  <Mail size={13} className="text-emerald-600" />
                  {user?.email || "arav@gamil.com"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                    user?.isVerified
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {user?.isVerified ? (
                    <>
                      <ShieldCheck size={11} /> Verified
                    </>
                  ) : (
                    <>
                      <AlertCircle size={11} /> Pending verification
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Phone & Verification */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Phone number
              </label>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                <span className="flex items-center gap-2 truncate text-slate-800">
                  <Phone size={13} className="text-emerald-600" />
                  {user?.phone || "97864534558"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                    user?.isPhoneVerified
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {user?.isPhoneVerified ? (
                    <>
                      <ShieldCheck size={11} /> Verified
                    </>
                  ) : (
                    <>
                      <AlertCircle size={11} /> Pending verification
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Member since
                </label>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-700">
                  <Calendar size={13} className="text-emerald-600" />
                  {memberSince}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Last sign-in
                </label>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-700">
                  <Clock size={13} className="text-emerald-600" />
                  {lastActive}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Portal Navigation Links */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-emerald-950">Quick management shortcuts</h3>
        <p className="text-[11px] text-slate-500">Jump directly to your active hotel operations</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            to="/hotelier/rooms"
            className="group flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white transition group-hover:bg-emerald-500">
              <BedDouble size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-emerald-950">Room inventory</div>
              <div className="text-[10px] text-slate-500">Adjust stock availability</div>
            </div>
          </Link>

          <Link
            to="/hotelier/rooms/add"
            className="group flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white transition group-hover:bg-emerald-500">
              <Plus size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-emerald-950">Add room block</div>
              <div className="text-[10px] text-slate-500">Submit new batch</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

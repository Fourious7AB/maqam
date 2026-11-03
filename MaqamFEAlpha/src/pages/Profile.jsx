import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { tokenService } from "../admin/services/tokenService";
import LogOutPopModal from "../components/LogOutPopModal";
import ResetPasswordModal from "../components/ChangePasswordModal";
import DeleteAccountModal from "../components/DeleteAccountModal";
import CoTravellersManager from "../components/user/CoTravellersManager";
import CustomerCareSection from "../components/quotes/CustomerCareSection";
import UserProfileBookingsSection from "../components/user/UserProfileBookingsSection";
import MaqamMapModal from "../components/user/MaqamMapModal";
import {
  Edit,
  ImageUp,
  Laptop,
  User,
  Users,
  LogOut,
  MapPin,
  Plane,
  CheckCircle2,
  Navigation,
  Compass,
  Sparkles,
  LocateFixed,
  Trash2,
  ShieldAlert,
  Map,
  Headphones,
  UserCheck,
  Shield,
  Calendar,
  Phone,
  Mail,
} from "lucide-react";
import CommonHeader from "../components/CommonHeader";
// import ThemeToggle from "../components/ThemeToggle";
// import { useTheme } from "../context/ThemeContext";
import { toast } from "react-toastify";
import { UserAPI } from "../configs/api";
import { updateUserProfile } from "../components/reducer/AuthSlice";
import authService from "../services/authService";
import travellerService from "../services/travellerService";
import {
  INTERNATIONAL_AIRPORTS,
  findNearestAirportByQuery,
  findNearestAirportByCoords,
  getSavedUserLocation,
  saveUserLocation,
  reverseGeocodeCoords,
  KNOWN_CITIES_DATA,
} from "../utils/airportLocator";

const PROFILE_MENU = [
  { key: "profile", label: "My Profile", icon: User },
  { key: "my-bookings", label: "My Bookings", icon: Calendar },
  { key: "customer-care", label: "Customer Care", icon: Headphones },
  { key: "co-travellers", label: "Co-Travellers", icon: Users },
  { key: "logged-in-devices", label: "Logged In Devices", icon: Laptop },
  { key: "reset-password", label: "Change Password", icon: Laptop },
];

const ProfileSettings = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [primaryTravellerId, setPrimaryTravellerId] = useState(null);
  const [primaryTraveller, setPrimaryTraveller] = useState(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const dispatch = useDispatch();
  // const { theme } = useTheme();

  const authUser = useSelector((state) => state.auth.user);
  const storedUser = (() => {
    try {
      return (
        tokenService.getUserProfile() ||
        JSON.parse(localStorage.getItem("maqam_auth_user")) ||
        JSON.parse(localStorage.getItem("user")) ||
        null
      );
    } catch {
      return null;
    }
  })();
  const currentUser = authUser || storedUser;

  const [profileData, setProfileData] = useState(() => {
    const saved = getSavedUserLocation();
    const u = currentUser;
    const first = u?.firstName || (u?.name ? u.name.split(" ")[0] : "");
    const last =
      u?.lastName || (u?.name ? u.name.split(" ").slice(1).join(" ") : "");

    return {
      firstName: first,
      lastName: last,
      name: `${first} ${last}`.trim(),
      email: u?.email || "",
      phone: u?.phone || "",
      dateOfBirth: u?.dateOfBirth ? String(u.dateOfBirth).split("T")[0] : "",
      gender: u?.gender || "Male",
      maritalStatus: u?.maritalStatus || "Single",
      anniversaryDate: u?.anniversaryDate ? String(u.anniversaryDate).split("T")[0] : "",
      nationality: u?.nationality || "India",
      addressLine1: saved.addressLine1 || u?.addressLine1 || "",
      addressLine2: saved.addressLine2 || u?.addressLine2 || "",
      city: saved.city || u?.city || "",
      state: saved.state || u?.state || "",
      zipCode: saved.zipCode || u?.zipCode || "",
      country: saved.country || u?.country || "India",
      originAirport: saved.originAirport || u?.originAirport || "DEL",
      originAirportName:
        saved.originAirportName || "Indira Gandhi International Airport",
      about: u?.about || "",
      avatar:
        u?.avatar ||
        "https://images.unsplash.com/photo-1776943340398-67524b7bcf7f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    };
  });

  // Calculate current nearest airport based on city or selected airport
  const currentNearestAirport = useMemo(() => {
    if (profileData.originAirport) {
      const match = INTERNATIONAL_AIRPORTS.find(
        (a) =>
          a.iataCode.toUpperCase() === profileData.originAirport.toUpperCase(),
      );
      if (match) return match;
    }
    return findNearestAirportByQuery(profileData.city || "Delhi");
  }, [profileData.originAirport, profileData.city]);

  useEffect(() => {
    if (!currentUser) return;
    const first =
      currentUser.firstName ||
      (currentUser.name ? currentUser.name.split(" ")[0] : "");
    const last =
      currentUser.lastName ||
      (currentUser.name ? currentUser.name.split(" ").slice(1).join(" ") : "");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileData((prev) => ({
      ...prev,
      firstName: first || prev.firstName,
      lastName: last || prev.lastName,
      name: first || last ? `${first} ${last}`.trim() : prev.name,
      email: currentUser.email || prev.email,
      phone: currentUser.phone || prev.phone,
      avatar: currentUser.avatar || prev.avatar,
    }));
  }, [currentUser]);

  // Load latest authenticated user profile from backend on mount
  useEffect(() => {
    let isMounted = true;
    const loadRemoteProfile = async () => {
      const token = tokenService.getAccessToken();
      if (!token) return;

      try {
        const remoteUser = await authService.getMe();
        if (remoteUser && isMounted) {
          dispatch(updateUserProfile(remoteUser));
          const first = remoteUser.firstName || "";
          const last = remoteUser.lastName || "";
          setProfileData((prev) => ({
            ...prev,
            firstName: first || prev.firstName,
            lastName: last || prev.lastName,
            name: first || last ? `${first} ${last}`.trim() : prev.name,
            email: remoteUser.email || prev.email,
            phone: remoteUser.phone || prev.phone,
            avatar: remoteUser.avatar || prev.avatar,
          }));
        }
      } catch (err) {
        console.warn(
          "Could not fetch remote user profile on mount:",
          err?.message,
        );
      }

      // Fetch saved traveller profile to hydrate passenger and passport details
      try {
        const travellers = await travellerService.getAllTravellers();
        if (travellers && travellers.length > 0 && isMounted) {
          const cleanUserPhone = String(currentUser?.phone || "")
            .replace(/\D/g, "")
            .slice(-10);
          const primary =
            travellers.find((t) => t.isDefault) ||
            travellers.find(
              (t) =>
                t.phone &&
                String(t.phone).replace(/\D/g, "").slice(-10) ===
                  cleanUserPhone,
            ) ||
            travellers[0];

          if (primary) {
            setPrimaryTravellerId(primary._id || primary.id);
            setPrimaryTraveller(primary);
            setProfileData((prev) => ({
              ...prev,
              title: primary.title || prev.title || "Mr",
              firstName: primary.firstName || prev.firstName,
              lastName: primary.lastName || prev.lastName,
              name:
                `${primary.firstName || ""} ${primary.lastName || ""}`.trim() ||
                prev.name,
              email: primary.email || prev.email,
              phone: primary.phone || prev.phone,
              gender: primary.gender || prev.gender,
              passengerType:
                primary.passengerType || prev.passengerType || "Adult",
              dateOfBirth: primary.dateOfBirth
                ? String(primary.dateOfBirth).split("T")[0]
                : prev.dateOfBirth,
              passportNo: primary.passportNo || prev.passportNo,
              passportIssueDate: primary.passportIssueDate
                ? String(primary.passportIssueDate).split("T")[0]
                : prev.passportIssueDate,
              passportExpiry: primary.passportExpiry
                ? String(primary.passportExpiry).split("T")[0]
                : prev.passportExpiry,
              nationality: primary.nationality || prev.nationality,
              addressLine1: primary.addressLine1 || prev.addressLine1,
              city: primary.city || prev.city,
            }));
          }
        }
      } catch (travellerErr) {
        console.warn(
          "Could not load traveller profiles on mount:",
          travellerErr?.message,
        );
      }
    };

    loadRemoteProfile();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => {
    if (
      tabParam &&
      ["profile", "my-bookings", "customer-care", "co-travellers", "logged-in-devices"].includes(tabParam)
    ) {
      return tabParam;
    }
    return "profile";
  });

  useEffect(() => {
    if (
      tabParam &&
      ["profile", "my-bookings", "customer-care", "co-travellers", "logged-in-devices"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [isModalOpen, setModalOpen] = useState(false);
  const [isResetPasswordModal, setResetPasswordModal] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleInputChange = (field, value) => {
    setProfileData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "firstName" || field === "lastName") {
        updated.name =
          `${updated.firstName || ""} ${updated.lastName || ""}`.trim();
      }
      return updated;
    });
  };

  // When city changes, auto-detect nearest international airport, state, and zip code
  const handleLocationChange = (cityName) => {
    const nearest = findNearestAirportByQuery(cityName);
    const cleanKey = cityName?.trim()?.toLowerCase();
    const cityMeta = KNOWN_CITIES_DATA[cleanKey];

    setProfileData((prev) => ({
      ...prev,
      city: cityName,
      state: cityMeta?.state || prev.state || nearest.name,
      zipCode: cityMeta?.zipCode || prev.zipCode || "",
      originAirport: nearest.iataCode,
      originAirportName: nearest.airport,
      country: cityMeta?.country || prev.country || nearest.country,
    }));
  };

  // Auto-detect location via browser GPS and reverse geocode address & postal code
  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = findNearestAirportByCoords(latitude, longitude);

        // Fetch detailed street address, state, and zip code via reverse geocoding
        let geo = null;
        try {
          geo = await reverseGeocodeCoords(latitude, longitude);
        } catch (e) {
          console.warn("Reverse geocode failed:", e);
        }

        const cityDetected = geo?.city || nearest.name;
        const cleanKey = cityDetected?.toLowerCase();
        const fallbackMeta = KNOWN_CITIES_DATA[cleanKey];

        const stateDetected = geo?.state || fallbackMeta?.state || nearest.name;
        const zipDetected = geo?.zipCode || fallbackMeta?.zipCode || "";
        const countryDetected = geo?.country || fallbackMeta?.country || nearest.country;
        const line1 = geo?.addressLine1 || "";
        const line2 = geo?.addressLine2 || "";

        setProfileData((prev) => ({
          ...prev,
          addressLine1: line1 || prev.addressLine1 || "",
          addressLine2: line2 || prev.addressLine2 || "",
          city: cityDetected,
          state: stateDetected,
          zipCode: zipDetected || prev.zipCode || "",
          country: countryDetected,
          originAirport: nearest.iataCode,
          originAirportName: nearest.airport,
        }));

        // Enable editing mode so the inputs are unlocked and user can review & save
        setIsEditing(true);
        setDetectingGps(false);

        const detailsSummary = [
          line1,
          line2,
          cityDetected,
          stateDetected,
          zipDetected ? `PIN: ${zipDetected}` : null,
        ]
          .filter(Boolean)
          .join(", ");

        toast.success(
          `Location detected: ${detailsSummary || cityDetected}! Nearest Airport: ${nearest.airport} (${nearest.iataCode})`,
        );
      },
      (err) => {
        setDetectingGps(false);
        console.warn("GPS detection notice:", err.message);
        toast.info(
          "Could not fetch GPS location. Please allow location permissions or select your city from the list.",
        );
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  // Apply location selected directly from interactive Maqam Map
  const handleApplyLocationFromMap = (locationData) => {
    setProfileData((prev) => ({
      ...prev,
      addressLine1: locationData.addressLine1 || prev.addressLine1,
      addressLine2: locationData.addressLine2 || prev.addressLine2,
      city: locationData.city || prev.city,
      state: locationData.state || prev.state,
      zipCode: locationData.zipCode || prev.zipCode,
      country: locationData.country || prev.country,
      originAirport: locationData.originAirport || prev.originAirport,
      originAirportName:
        locationData.originAirportName || prev.originAirportName,
    }));
    setIsEditing(true);
  };

  const handleMenuClick = (key) => {
    if (key === "reset-password") {
      setActiveTab("reset-password");
      setResetPasswordModal(true);
      return;
    }

    setActiveTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  // Handle local avatar photo upload & preview
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result;
      if (base64) {
        setProfileData((prev) => ({ ...prev, avatar: base64 }));
        toast.success(
          "Profile photo preview updated! Click 'Save Changes' to persist.",
        );
        if (!isEditing) setIsEditing(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const firstName = profileData.firstName?.trim() || "";
    const lastName = profileData.lastName?.trim() || "";
    const email = (profileData.email || "").trim();

    if (!firstName) {
      toast.error("First name is required");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const token = tokenService.getAccessToken();
      let serverUser = null;

      if (token) {
        // 1. Account profile (/auth/me) is the source of truth. Fail loudly.
        try {
          serverUser = await authService.updateProfile({
            firstName,
            lastName,
            email,
            avatar: profileData.avatar,
          });
        } catch (authErr) {
          toast.error(
            authErr?.response?.data?.message ||
              authErr?.message ||
              "Failed to update profile",
          );
          return;
        }

        // 2. Traveller record (passport/DOB details). Non-blocking.
        const cleanPhone = String(profileData.phone || "")
          .replace(/\D/g, "")
          .slice(-10);
        if (cleanPhone && firstName) {
          try {
            const travellerPayload = {
              title:
                profileData.title ||
                (profileData.gender === "Female" ? "Ms" : "Mr"),
              firstName,
              lastName: lastName || firstName,
              gender: profileData.gender === "Female" ? "Female" : "Male",
              passengerType: profileData.passengerType || "Adult",
              cellCountryCode: profileData.cellCountryCode || "+91",
              phone: cleanPhone,
              email: email.toLowerCase() || undefined,
              isDefault: true,
            };
            if (profileData.dateOfBirth) {
              travellerPayload.dateOfBirth = new Date(
                profileData.dateOfBirth,
              ).toISOString();
            }
            if (profileData.passportNo?.trim()) {
              travellerPayload.passportNo = profileData.passportNo
                .trim()
                .toUpperCase();
            }
            if (profileData.passportIssueDate) {
              travellerPayload.passportIssueDate = new Date(
                profileData.passportIssueDate,
              ).toISOString();
            }
            if (profileData.passportExpiry) {
              travellerPayload.passportExpiry = new Date(
                profileData.passportExpiry,
              ).toISOString();
            }

            if (primaryTravellerId) {
              await travellerService.updateTraveller(
                primaryTravellerId,
                travellerPayload,
              );
            } else {
              const created =
                await travellerService.createTraveller(travellerPayload);
              if (created?._id || created?.id) {
                setPrimaryTravellerId(created._id || created.id);
              }
            }
          } catch (travellerApiErr) {
            console.warn("Traveller profile sync failed:", travellerApiErr);
            toast.warn(
              travellerApiErr?.response?.data?.message ||
                "Profile saved, but traveller details could not be synced",
            );
          }
        }
      }

      // 3. Merge server profile with local travel preferences.
      const updatedUser = {
        ...(currentUser || {}),
        ...(serverUser && typeof serverUser === "object" ? serverUser : {}),
        firstName,
        lastName,
        email,
        originAirport: currentNearestAirport.iataCode,
        originAirportName: currentNearestAirport.airport,
        originCity: currentNearestAirport.name,
      };

      saveUserLocation({
        addressLine1: profileData.addressLine1,
        addressLine2: profileData.addressLine2,
        city: profileData.city || currentNearestAirport.name,
        state: profileData.state,
        zipCode: profileData.zipCode,
        country: profileData.country || currentNearestAirport.country,
        originAirport: currentNearestAirport.iataCode,
        originAirportName: currentNearestAirport.airport,
        originCity: currentNearestAirport.name,
      });
      dispatch(updateUserProfile(updatedUser));

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Profile update error:", error.message);
      toast.error("An error occurred while updating profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePrimaryTraveller = async () => {
    if (!primaryTravellerId) {
      toast.info("No saved traveller record found to delete.");
      return;
    }
    if (
      !window.confirm(
        "Are you sure you want to remove your saved traveller profile details from the server?",
      )
    ) {
      return;
    }
    try {
      await travellerService.deleteTraveller(primaryTravellerId);
      setPrimaryTravellerId(null);
      toast.success("Traveller profile deleted successfully from server.");
    } catch (err) {
      console.error("Delete primary traveller error:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to delete traveller profile data",
      );
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <>
      <CommonHeader title="Profile Settings" />

      <div className="min-h-screen bg-[#f3f5f7] dark:bg-[#070c18] px-4 pb-10 pt-28 font-poppins transition-colors duration-200">
        <div className="mx-auto max-w-[1200px]">
          <div className="overflow-hidden rounded-[24px] border border-[#edf1f5] dark:border-slate-800 bg-white dark:bg-[#0d1527] shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-colors">
            <div className="flex flex-col lg:flex-row">
              <aside className="w-full bg-[#f8fafc] dark:bg-[#0b1120] p-4 lg:w-[280px] lg:border-r lg:border-[#edf1f5] dark:lg:border-slate-800 lg:p-5 transition-colors">
                <div className="rounded-2xl bg-gradient-to-r from-[#0f6b7b] via-[#0d7c89] to-[#0b5b73] p-4 text-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/60 bg-white/10">
                      <User size={24} />
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {`${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
                          profileData.name}
                      </p>
                      <p className="text-xs text-cyan-100">
                        {profileData.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {PROFILE_MENU.map((item) => {
                    const isActive = activeTab === item.key;
                    const IconComponent = item.icon;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleMenuClick(item.key)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition cursor-pointer ${
                          isActive
                            ? "bg-[#eaf7f8] dark:bg-teal-950/60 text-[#0a6975] dark:text-teal-300 shadow-inner"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                            isActive
                              ? "bg-[#0b6975] text-white"
                              : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <IconComponent size={15} />
                        </span>
                        {item.label}
                      </button>
                    );
                  })}

                  {/* Theme / Appearance Preference (Commented out) */}
                  {/*
                  <div className="pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-2xs">
                          {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Theme</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{theme} Mode</p>
                        </div>
                      </div>
                      <ThemeToggle size="sm" />
                    </div>
                  </div>
                  */}

                  {/* Log Out Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-300 transition cursor-pointer group"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                        <LogOut size={15} />
                      </span>
                      <span>Log Out</span>
                    </button>
                  </div>

                  {/* Delete Account Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-300 transition cursor-pointer group"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                        <Trash2 size={15} />
                      </span>
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              </aside>

              <main className="flex-1 bg-[#f7f9fb] dark:bg-[#070c18] p-4 sm:p-6 lg:p-7 transition-colors">
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f766e] dark:text-teal-400">
                          Personal Details
                        </p>
                        <h2 className="mt-1 text-3xl font-extrabold tracking-[-0.04em] text-slate-900 dark:text-white">
                          My Profile
                        </h2>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* <ThemeToggle /> */}
                        {!isEditing ? (
                          <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#0f6b7b] dark:bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d5f6f] dark:hover:bg-teal-700 cursor-pointer"
                          >
                            <Edit size={16} />
                            Edit Profile
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleCancel}
                              className="rounded-xl bg-slate-200 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSave}
                              disabled={isLoading}
                              className="rounded-xl bg-[#0f6b7b] dark:bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d5f6f] dark:hover:bg-teal-700 disabled:opacity-60 cursor-pointer"
                            >
                              {isLoading ? "Saving..." : "Save Changes"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[#e8edf2] dark:border-slate-800 bg-white dark:bg-[#0d1527] p-4 shadow-sm sm:p-5 transition-colors">
                      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white dark:border-slate-800 bg-gradient-to-br from-[#0d7c89] to-[#0b5a67] shadow-md">
                              <img
                                src={
                                  profileData.avatar ||
                                  "https://images.unsplash.com/photo-1776943340398-67524b7bcf7f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                                }
                                alt="profile"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white dark:border-slate-800 bg-[#0f6b7b] dark:bg-teal-600 text-white shadow-md hover:bg-[#0d5f6f] dark:hover:bg-teal-700 transition">
                              <ImageUp size={15} />
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarChange}
                              />
                            </label>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              Profile Photo
                            </p>
                            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                              {`${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
                                profileData.name}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl bg-[#fff4d6] dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 px-3 py-2 text-sm font-medium text-[#876100] dark:text-amber-300">
                          Add your date of birth for a birthday surprise.
                        </div>
                      </div>
                    </div>

                    {/* Primary / Default Traveller Profile Showcase Card */}
                    <div className="rounded-[20px] border border-teal-500/30 dark:border-teal-700/40 bg-gradient-to-br from-teal-50/50 via-white to-emerald-50/30 dark:from-[#0d1527] dark:via-[#0b1120] dark:to-teal-950/20 p-5 shadow-sm transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-teal-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/60 text-[#0f6b7b] dark:text-teal-400">
                            <UserCheck size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                                Primary Traveller Profile
                              </h3>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                <CheckCircle2 size={11} /> Default
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Autofills as lead passenger during flight and hotel checkouts
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab("co-travellers")}
                          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-[#0f6b7b] dark:text-teal-400 border border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
                        >
                          <Users size={13} />
                          <span>Manage Co-Travellers</span>
                        </button>
                      </div>

                      {primaryTraveller ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                          <div className="rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Full Legal Name
                            </span>
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white block mt-0.5">
                              {primaryTraveller.title ? `${primaryTraveller.title}. ` : ""}
                              {primaryTraveller.firstName} {primaryTraveller.lastName}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {primaryTraveller.passengerType || "Adult"} · {primaryTraveller.gender || "Gender"}
                            </span>
                          </div>

                          <div className="rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Contact Details
                            </span>
                            <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5 truncate">
                              <Phone size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
                              <span>{primaryTraveller.cellCountryCode || "+91"} {primaryTraveller.phone || "N/A"}</span>
                            </p>
                            <p className="font-medium text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5 truncate">
                              <Mail size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
                              <span className="truncate">{primaryTraveller.email || "N/A"}</span>
                            </p>
                          </div>

                          <div className="rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Date of Birth &amp; Travel Docs
                            </span>
                            <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                              <Calendar size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
                              <span>
                                {primaryTraveller.dateOfBirth
                                  ? new Date(primaryTraveller.dateOfBirth).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "DOB not specified"}
                              </span>
                            </p>
                            {primaryTraveller.passportNo ? (
                              <p className="font-mono text-[11px] text-teal-800 dark:text-teal-300 font-bold mt-1 flex items-center gap-1">
                                <Shield size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
                                <span>Passport: {primaryTraveller.passportNo}</span>
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-400 mt-1 block">
                                Passport details optional
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>
                            No primary traveller profile configured yet. Co-travellers you designate as Primary will appear here for fast autofill.
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab("co-travellers")}
                            className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer shrink-0 ml-3"
                          >
                            Set Up Now →
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[20px] border border-[#e8edf2] dark:border-slate-800 bg-white dark:bg-[#0d1527] p-4 shadow-sm sm:p-5 transition-colors">
                      <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
                        General Information
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label="First Name"
                          type="text"
                          value={profileData.firstName}
                          onChange={(value) =>
                            handleInputChange("firstName", value)
                          }
                          disabled={!isEditing}
                        />
                        <Input
                          label="Last Name"
                          type="text"
                          value={profileData.lastName}
                          onChange={(value) =>
                            handleInputChange("lastName", value)
                          }
                          disabled={!isEditing}
                        />

                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Gender
                          </label>
                          <select
                            value={profileData.gender}
                            onChange={(e) =>
                              handleInputChange("gender", e.target.value)
                            }
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700/80 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white dark:focus:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-500"
                          >
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={profileData.dateOfBirth}
                            onChange={(e) =>
                              handleInputChange("dateOfBirth", e.target.value)
                            }
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700/80 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white dark:focus:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Marital Status
                          </label>
                          <select
                            value={profileData.maritalStatus}
                            onChange={(e) =>
                              handleInputChange("maritalStatus", e.target.value)
                            }
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700/80 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white dark:focus:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-500"
                          >
                            <option>Married</option>
                            <option>Single</option>
                            <option>Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Nationality
                          </label>
                          <input
                            type="text"
                            value={profileData.nationality}
                            onChange={(e) =>
                              handleInputChange("nationality", e.target.value)
                            }
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700/80 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white dark:focus:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[#e8edf2] dark:border-slate-800 bg-white dark:bg-[#0d1527] p-4 shadow-sm sm:p-5 transition-colors">
                      <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
                        Contact Details
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label="Mobile Number"
                          type="text"
                          value={profileData.phone}
                          onChange={(value) =>
                            handleInputChange("phone", value)
                          }
                          disabled
                        />
                        <Input
                          label="Email ID"
                          type="email"
                          value={profileData.email}
                          onChange={(value) =>
                            handleInputChange("email", value)
                          }
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    {/* Present Address Section */}
                    <div className="rounded-[20px] border border-[#e8edf2] dark:border-slate-800 bg-white dark:bg-[#0d1527] p-4 shadow-sm sm:p-5 transition-colors">
                      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#0f766e] dark:text-teal-300">
                            <MapPin size={22} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                              Present Address &amp; Departure Location
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Your location detects your nearest international
                              airport to power live flights to Riyadh
                            </p>
                          </div>
                        </div>

                        {/* Location Action Buttons: Maqam Map & GPS Detect */}
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setIsMapModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f6b7b] to-[#0a4e5a] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:from-[#0d5f6f] hover:to-[#083e48] active:scale-95 transition cursor-pointer group"
                            title="Open interactive Maqam Map (Google Maps style) to search & pin your location"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-white/20 text-white group-hover:scale-110 transition">
                              <Map size={13} className="text-amber-300" />
                            </span>
                            <span>Maqam Map</span>
                            <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-teal-100">
                              Google Map
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={handleGpsDetect}
                            disabled={detectingGps}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/50 px-3 py-2 text-xs font-semibold text-[#0f766e] dark:text-teal-300 transition hover:bg-teal-100 dark:hover:bg-teal-900/40 active:scale-95 disabled:opacity-60 cursor-pointer shadow-xs"
                          >
                            <LocateFixed
                              size={14}
                              className={detectingGps ? "animate-spin" : ""}
                            />
                            {detectingGps
                              ? "Detecting GPS..."
                              : "Auto-Detect My Location"}
                          </button>
                        </div>
                      </div>

                      {/* Interactive Maqam Map Quick Launcher Bar */}
                      <div
                        onClick={() => setIsMapModalOpen(true)}
                        className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-teal-200/90 dark:border-teal-800/50 bg-gradient-to-r from-teal-50/70 via-cyan-50/50 to-emerald-50/60 dark:from-teal-950/30 dark:via-slate-800/40 dark:to-emerald-950/30 p-3.5 shadow-xs transition hover:border-[#0f6b7b] dark:hover:border-teal-500 hover:shadow-sm cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-[#0f6b7b] dark:text-teal-400 shadow-xs group-hover:scale-105 transition">
                            <MapPin size={20} className="text-[#0f6b7b] dark:text-teal-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0f6b7b] dark:group-hover:text-teal-400 transition">
                              Need to pinpoint exact house or street on map?
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Open <strong>Maqam Map</strong> (Google Maps style) to search, drag the pin, and auto-detect your PIN code &amp; address.
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1.5 shrink-0 rounded-xl bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-[#0f6b7b] dark:text-teal-300 border border-teal-200 dark:border-teal-700/60 shadow-xs group-hover:bg-[#0f6b7b] dark:group-hover:bg-teal-600 group-hover:text-white transition">
                          <Compass size={13} /> Open Map
                        </span>
                      </div>

                      {/* Prominent Nearest International Airport Display Card */}
                      <div className="mb-5 overflow-hidden rounded-2xl border-2 border-emerald-500/25 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-sky-500/10 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900/40 p-4 sm:p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0f766e] text-white shadow-md shadow-[#0f766e]/30">
                              <Plane size={24} className="rotate-45" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0f766e] dark:text-emerald-400">
                                  Nearest International Airport
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse"></span>
                                  Auto-Matched to Location
                                </span>
                              </div>
                              <h4 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                                {currentNearestAirport.airport}
                              </h4>
                              <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                                Airport Code:{" "}
                                <strong className="text-[#0f766e] dark:text-emerald-400 text-sm">
                                  {currentNearestAirport.iataCode}
                                </strong>{" "}
                                · Serving {currentNearestAirport.name},{" "}
                                {currentNearestAirport.country}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Location Select Pills */}
                      <div className="mb-5">
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          Quick Select Major City / Hub:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            "Delhi",
                            "Mumbai",
                            "Bengaluru",
                            "Kolkata",
                            "Hyderabad",
                            "Chennai",
                            "Ahmedabad",
                            "Lucknow",
                            "Kochi",
                            "Dubai",
                          ].map((city) => {
                            const isSelected =
                              profileData.city?.toLowerCase() ===
                                city.toLowerCase() ||
                              currentNearestAirport.name.toLowerCase() ===
                                city.toLowerCase();
                            return (
                              <button
                                key={city}
                                type="button"
                                onClick={() => handleLocationChange(city)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                                  isSelected
                                    ? "bg-[#0f766e] dark:bg-teal-600 text-white shadow-xs font-bold"
                                    : "border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
                                }`}
                              >
                                {city}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <div className="mb-1.5 flex items-center justify-between">
                            <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Address Line 1 (Street / House / Apartment)
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsMapModalOpen(true)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0f6b7b] dark:text-teal-400 hover:text-[#0d5f6f] dark:hover:text-teal-300 hover:underline cursor-pointer"
                              title="Search or pinpoint address on Maqam Map"
                            >
                              <MapPin size={12} className="text-teal-600 dark:text-teal-400" />
                              <span>Select on Maqam Map</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. 42 Park Avenue, Flat 3B"
                            value={profileData.addressLine1 || ""}
                            onChange={(e) =>
                              handleInputChange("addressLine1", e.target.value)
                            }
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700/80 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white dark:focus:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-500"
                          />
                        </div>

                        <Input
                          label="Address Line 2 (Area / Landmark - Optional)"
                          type="text"
                          placeholder="e.g. Near City Center"
                          value={profileData.addressLine2}
                          onChange={(value) =>
                            handleInputChange("addressLine2", value)
                          }
                          disabled={!isEditing}
                        />

                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            City / Town (Updates Nearest Airport)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Pune, Noida, Kolkata, Lucknow"
                            value={profileData.city || ""}
                            onChange={(e) =>
                              handleLocationChange(e.target.value)
                            }
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700/80 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white dark:focus:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-500"
                          />
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            Nearest airport:{" "}
                            <strong className="text-slate-700 dark:text-slate-200">
                              {currentNearestAirport.airport} (
                              {currentNearestAirport.iataCode})
                            </strong>
                          </p>
                        </div>

                        <Input
                          label="State / Province"
                          type="text"
                          placeholder="e.g. Delhi, Maharashtra, Karnataka"
                          value={profileData.state}
                          onChange={(value) =>
                            handleInputChange("state", value)
                          }
                          disabled={!isEditing}
                        />

                        <Input
                          label="Postal / Zip Code"
                          type="text"
                          placeholder="e.g. 110001"
                          value={profileData.zipCode}
                          onChange={(value) =>
                            handleInputChange("zipCode", value)
                          }
                          disabled={!isEditing}
                        />

                        <Input
                          label="Country"
                          type="text"
                          placeholder="e.g. India"
                          value={profileData.country}
                          onChange={(value) =>
                            handleInputChange("country", value)
                          }
                          disabled={!isEditing}
                        />

                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Select Departure International Airport (Origin for
                            Riyadh Flights)
                          </label>
                          <select
                            value={currentNearestAirport.iataCode}
                            onChange={(e) => {
                              const code = e.target.value;
                              const found = INTERNATIONAL_AIRPORTS.find(
                                (a) => a.iataCode === code,
                              );
                              if (found) {
                                setProfileData((prev) => ({
                                  ...prev,
                                  originAirport: found.iataCode,
                                  originAirportName: found.airport,
                                  country: found.country,
                                }));
                              }
                            }}
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700/80 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white dark:focus:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-500"
                          >
                            {INTERNATIONAL_AIRPORTS.map((airport) => (
                              <option
                                key={airport.iataCode}
                                value={airport.iataCode}
                              >
                                {airport.name} ({airport.iataCode}) —{" "}
                                {airport.airport} ({airport.country})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800/40 p-3 text-xs text-teal-900 dark:text-teal-200">
                        <Plane
                          size={16}
                          className="text-[#0f766e] dark:text-teal-400 shrink-0 rotate-45"
                        />
                        <span>
                          <strong>Connected to Flight Search:</strong> When
                          saved, <strong>"Flight to Riyadh"</strong> on the
                          homepage will automatically show all available
                          airlines and live prices departing from{" "}
                          <strong>
                            {currentNearestAirport.airport} (
                            {currentNearestAirport.iataCode})
                          </strong>{" "}
                          to <strong>Riyadh (RUH)</strong>.
                        </span>
                      </div>
                    </div>

                    {/* Danger Zone: Account Deactivation & Permanent Deletion */}
                    <div className="rounded-[20px] border border-rose-200/90 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-4 sm:p-5 shadow-xs transition-colors">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50">
                            <ShieldAlert size={20} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base font-bold text-rose-900 dark:text-rose-200 leading-tight">
                              Danger Zone
                            </h4>
                            <p className="text-xs text-rose-700 dark:text-rose-300/80 mt-1 leading-relaxed">
                              Deactivate your profile session, remove saved
                              traveller records, or permanently purge your
                              account data.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 xl:shrink-0 pt-1 xl:pt-0">
                          {primaryTravellerId && (
                            <button
                              type="button"
                              onClick={handleDeletePrimaryTraveller}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-400 shadow-xs hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white transition cursor-pointer shrink-0 active:scale-95"
                            >
                              <Trash2 size={14} />
                              <span>Delete Traveller Data</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 dark:border-rose-800/60 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 shadow-xs hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition cursor-pointer shrink-0 active:scale-95"
                          >
                            <Trash2 size={14} />
                            <span>Delete Account</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "my-bookings" && <UserProfileBookingsSection />}

                {activeTab === "customer-care" && <CustomerCareSection />}

                {activeTab === "co-travellers" && <CoTravellersManager />}

                {activeTab === "logged-in-devices" && (
                  <div className="rounded-[20px] border border-[#e8edf2] dark:border-slate-800 bg-white dark:bg-[#0d1527] p-4 shadow-sm sm:p-5 transition-colors">
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      Logged In Devices
                    </h2>
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 text-center text-slate-600 dark:text-slate-400">
                      Your active devices will appear here.
                    </div>
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      </div>

      <LogOutPopModal isModalOpen={isModalOpen} setModalOpen={setModalOpen} />
      <ResetPasswordModal
        isResetPasswordModal={isResetPasswordModal}
        setResetPasswordModal={setResetPasswordModal}
      />
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
      <MaqamMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialLocation={
          currentNearestAirport?.lat && currentNearestAirport?.lng
            ? {
                lat: currentNearestAirport.lat,
                lng: currentNearestAirport.lng,
              }
            : null
        }
        onApplyLocation={handleApplyLocationFromMap}
      />
    </>
  );
};

export default ProfileSettings;

/* Reusable Components */

const Input = ({
  label,
  type = "text",
  value,
  onChange,
  disabled = false,
  placeholder,
}) => (
  <div>
    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
      {label}
    </label>
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700/80 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white dark:focus:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-500"
    />
  </div>
);

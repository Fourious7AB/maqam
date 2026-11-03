// -----------------------------------------------------------------------------
// DataProvider — one shared store for the admin, hotelier, and public pages.
// Holds every inventory collection plus accounts and bookings,
// so anything the admin creates or re-prices is seen everywhere in the session.
//
// Backend flexibility (same philosophy as services/http.js):
//   • No VITE_API_URL         -> pure in-memory CRUD over the seed data.
//   • VITE_API_URL configured -> GET all collections on mount + POST/PUT/DELETE
//     on mutations against /hotels, /flights, /cabs, /meals, /visa, /packages,
//     /accounts, /bookings. A failed load degrades to seeds (+ a toast).
// -----------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  isApiEnabled,
  unwrapItem,
  unwrapList,
} from "../services/http";
import { tokenService } from "../admin/services/tokenService";
import { nextId } from "../utils/format";
import {
  DataContext,
  COLLECTIONS,
  ID_PREFIX,
  priceForAudience,
} from "./dataContext";
import {
  seedHotels,
  seedFlights,
  seedCabs,
  seedMeals,
  seedVisa,
  seedPackages,
  seedAccounts,
  seedBookings,
} from "./seedData";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function DataProvider({ children }) {
  const apiMode = isApiEnabled();

  const [hotels, setHotels] = useState(seedHotels);
  const [flights, setFlights] = useState(seedFlights);
  const [cabs, setCabs] = useState(seedCabs);
  const [meals, setMeals] = useState(seedMeals);
  const [visa, setVisa] = useState(seedVisa);
  const [packages, setPackages] = useState(seedPackages);
  const [accounts, setAccounts] = useState(seedAccounts);
  const [bookings, setBookings] = useState(seedBookings);

  const [loading, setLoading] = useState(apiMode);
  const [error, setError] = useState(null);

  // Stable setter lookup by collection name.
  const setters = useMemo(
    () => ({
      hotels: setHotels,
      flights: setFlights,
      cabs: setCabs,
      meals: setMeals,
      visa: setVisa,
      packages: setPackages,
      accounts: setAccounts,
      bookings: setBookings,
    }),
    [],
  );

  // Latest committed state, read inside callbacks to avoid stale closures.
  const dataRef = useRef({});
  useEffect(() => {
    dataRef.current = {
      hotels,
      flights,
      cabs,
      meals,
      visa,
      packages,
      accounts,
      bookings,
    };
  }, [hotels, flights, cabs, meals, visa, packages, accounts, bookings]);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!apiMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const keys = Object.keys(COLLECTIONS);
      // Only fetch collections that have a real endpoint (non-null) and don't require authentication when unauthenticated
      const activeKeys = keys.filter((k) => {
        if (!COLLECTIONS[k]) return false;
        if (k === "bookings" && !tokenService.getAccessToken()) return false;
        return true;
      });
      const results = await Promise.allSettled(
        activeKeys.map((k) => apiGet(COLLECTIONS[k])),
      );
      if (!mounted.current) return;
      activeKeys.forEach((k, i) => {
        if (results[i].status === "fulfilled") {
          setters[k](unwrapList(results[i].value));
        }
      });
    } catch (err) {
      if (!mounted.current) return;
      setError(err);
      // Graceful fallback so the whole app still works.
      setHotels(seedHotels);
      setFlights(seedFlights);
      setCabs(seedCabs);
      setMeals(seedMeals);
      setVisa(seedVisa);
      setPackages(seedPackages);
      setAccounts(seedAccounts);
      setBookings(seedBookings);
      toast.error("Couldn't reach the server — showing sample data.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [apiMode, setters]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Generic inventory CRUD ---------------------------------------------
  const addItem = useCallback(
    async (kind, values) => {
      const endpoint = COLLECTIONS[kind];
      let created = null;
      if (apiMode && endpoint)
        created = unwrapItem(await apiPost(endpoint, values));
      const prev = dataRef.current[kind] || [];
      const id = created?.id ?? nextId(prev, ID_PREFIX[kind] || "ID-");
      const row = created?.id ? created : { id, active: true, ...values };
      setters[kind]((list) => [row, ...list]);
      return row;
    },
    [apiMode, setters],
  );

  const updateItem = useCallback(
    async (kind, id, values) => {
      const endpoint = COLLECTIONS[kind];
      let updated = null;
      if (apiMode && endpoint)
        updated = unwrapItem(await apiPut(`${endpoint}/${id}`, values));
      setters[kind]((list) =>
        list.map((r) =>
          r.id === id ? { ...r, ...values, ...(updated || {}) } : r,
        ),
      );
      return updated;
    },
    [apiMode, setters],
  );

  const removeItem = useCallback(
    async (kind, id) => {
      const endpoint = COLLECTIONS[kind];
      if (apiMode && endpoint) await apiDelete(`${endpoint}/${id}`);
      setters[kind]((list) => list.filter((r) => r.id !== id));
    },
    [apiMode, setters],
  );

  // Admin Price Control writes sellPrice/discount (seen by everyone but hotelier).
  const setPrice = useCallback(
    (kind, id, { sellPrice, discount }) => {
      const patch = {};
      if (sellPrice != null) patch.sellPrice = Number(sellPrice);
      if (discount != null) patch.discount = Number(discount);
      return updateItem(kind, id, patch);
    },
    [updateItem],
  );

  // Hotelier writes basePrice only (never sees the admin markup).
  const setBasePrice = useCallback(
    (kind, id, basePrice) =>
      updateItem(kind, id, { basePrice: Number(basePrice) }),
    [updateItem],
  );

  const toggleActive = useCallback(
    (kind, id, active) => updateItem(kind, id, { active: !!active }),
    [updateItem],
  );

  // ---- Accounts ------------------------------------------------------------
  const createAccount = useCallback(
    async ({ name, email, phone, dob, role, photo }) => {
      const prefix = ID_PREFIX[role] || "AC-";
      let created = null;
      if (apiMode) {
        created = unwrapItem(
          await apiPost("/accounts", { name, email, phone, dob, role, photo }),
        );
      }
      const prev = dataRef.current.accounts || [];
      const sameRole = prev.filter((a) => a.role === role);
      const id =
        created?.id ?? nextId(sameRole.length ? sameRole : prev, prefix);
      const row = created?.id
        ? created
        : {
            id,
            name,
            email,
            phone,
            dob,
            role,
            photo: photo || "",
            joinedAt: today(),
            active: true,
          };
      setAccounts((list) => [row, ...list]);
      return row;
    },
    [apiMode],
  );

  const updateAccount = useCallback(
    (id, values) => updateItem("accounts", id, values),
    [updateItem],
  );
  const removeAccount = useCallback(
    (id) => removeItem("accounts", id),
    [removeItem],
  );

  // ---- Bookings ------------------------------------------------------------
  const addBooking = useCallback(
    async (values) => {
      let created = null;
      if (apiMode) created = unwrapItem(await apiPost("/api/v1/crm/bookings", values));
      const prev = dataRef.current.bookings || [];
      const id = created?.id ?? nextId(prev, ID_PREFIX.bookings);
      const row = created?.id
        ? created
        : {
            id,
            status: "requested",
            rejectReason: "",
            createdAt: today(),
            ...values,
          };
      setBookings((list) => [row, ...list]);
      return row;
    },
    [apiMode],
  );

  const updateBookingStatus = useCallback(
    (id, status, rejectReason = "") =>
      updateItem("bookings", id, { status, rejectReason }),
    [updateItem],
  );

  // Confirm booking (admin action)
  const confirmBooking = useCallback(
    async (id) => {
      try {
        if (apiMode) {
          await apiPut(`/api/v1/crm/bookings/${id}/confirm`, {});
        }
        await updateBookingStatus(id, "confirmed", "");
        toast.success("Booking confirmed successfully");
      } catch (err) {
        toast.error("Failed to confirm booking");
        throw err;
      }
    },
    [apiMode, updateBookingStatus],
  );

  // Reject booking (admin action)
  const rejectBooking = useCallback(
    async (id, reason) => {
      if (!reason || !reason.trim()) {
        toast.error("Rejection reason is required");
        return;
      }
      try {
        if (apiMode) {
          await apiPut(`/api/v1/crm/bookings/${id}/reject`, { reason });
        }
        await updateBookingStatus(id, "rejected", reason);
        toast.success("Booking rejected");
      } catch (err) {
        toast.error("Failed to reject booking");
        throw err;
      }
    },
    [apiMode, updateBookingStatus],
  );

  // ---- Selectors -----------------------------------------------------------
  const accountsByRole = useCallback(
    (role) =>
      (dataRef.current.accounts || accounts).filter((a) => a.role === role),
    [accounts],
  );

  // Get bookings by status
  const getBookingsByStatus = useCallback(
    (status) => {
      const allBookings = dataRef.current.bookings || bookings;
      if (!status) return allBookings;
      return allBookings.filter((b) => b.status === status);
    },
    [bookings],
  );

  // A hotelier's hotels, priced for the HOTELIER audience. This is the one seam
  // the hotelier side should read hotels through: the admin's sellPrice/discount
  // markup is deliberately NOT copied onto the returned rows, so it can never
  // leak to the hotelier — they only ever see their own base price. When the
  // hotelier dashboard is wired to shared inventory, it consumes this.
  const hotelsForHotelier = useCallback(
    (hotelierId) =>
      (dataRef.current.hotels || hotels)
        .filter((h) => h.hotelierId === hotelierId)
        .map((h) => ({
          id: h.id,
          name: h.name,
          city: h.city,
          distanceToHaram: h.distanceToHaram,
          rating: h.rating,
          hotelierId: h.hotelierId,
          images: h.images,
          amenities: h.amenities,
          roomTypes: h.roomTypes,
          active: h.active,
          // hotelier sees ONLY their base price — admin markup intentionally omitted
          basePrice: Number(h.basePrice || 0),
          price: priceForAudience(h, "hotelier"),
        })),
    [hotels],
  );

  // ---- Saved Travelers (for User / Customer re-use) ------------------------
  const [savedTravelers, setSavedTravelers] = useState(() => {
    try {
      const stored = localStorage.getItem("maqam_saved_travelers");
      if (stored) return JSON.parse(stored);
    } catch {
      /* ignore */
    }
    return [
      {
        id: "TR-101",
        userId: "CU-4001",
        name: "Abdul Rahman",
        phone: "+91 97777 55555",
        photo:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
        passportNo: "M1234567",
        visaNo: "UMR-889900",
        dob: "1988-03-03",
        gender: "Male",
        nationality: "Indian",
      },
      {
        id: "TR-102",
        userId: "CU-4001",
        name: "Sana Rahman",
        phone: "+91 97777 55556",
        photo:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
        passportNo: "M1234568",
        visaNo: "UMR-889901",
        dob: "1992-06-12",
        gender: "Female",
        nationality: "Indian",
      },
      {
        id: "TR-103",
        userId: "CU-4001",
        name: "Bilal Rahman",
        phone: "+91 97777 55557",
        photo:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
        passportNo: "M1234569",
        visaNo: "",
        dob: "2015-09-20",
        gender: "Male",
        nationality: "Indian",
      },
    ];
  });

  const saveTraveler = useCallback((traveler) => {
    setSavedTravelers((prev) => {
      let next;
      if (traveler.id) {
        next = prev.map((t) =>
          t.id === traveler.id ? { ...t, ...traveler } : t,
        );
      } else {
        const id = `TR-${Date.now().toString().slice(-4)}`;
        next = [{ id, ...traveler }, ...prev];
      }
      try {
        localStorage.setItem("maqam_saved_travelers", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const deleteTraveler = useCallback((id) => {
    setSavedTravelers((prev) => {
      const next = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem("maqam_saved_travelers", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // ---- Entity-Specific CRUD Helpers ----------------------------------------
  const createHotel = useCallback(
    (values) => addItem("hotels", values),
    [addItem],
  );
  const updateHotel = useCallback(
    (id, values) => updateItem("hotels", id, values),
    [updateItem],
  );
  const deleteHotel = useCallback(
    (id) => removeItem("hotels", id),
    [removeItem],
  );

  const createFlight = useCallback(
    (values) => addItem("flights", values),
    [addItem],
  );
  const updateFlight = useCallback(
    (id, values) => updateItem("flights", id, values),
    [updateItem],
  );
  const deleteFlight = useCallback(
    (id) => removeItem("flights", id),
    [removeItem],
  );

  const createPackage = useCallback(
    (values) => addItem("packages", values),
    [addItem],
  );
  const updatePackage = useCallback(
    (id, values) => updateItem("packages", id, values),
    [updateItem],
  );
  const deletePackage = useCallback(
    (id) => removeItem("packages", id),
    [removeItem],
  );

  const createCab = useCallback((values) => addItem("cabs", values), [addItem]);
  const updateCab = useCallback(
    (id, values) => updateItem("cabs", id, values),
    [updateItem],
  );
  const deleteCab = useCallback((id) => removeItem("cabs", id), [removeItem]);

  const createMeal = useCallback(
    (values) => addItem("meals", values),
    [addItem],
  );
  const updateMeal = useCallback(
    (id, values) => updateItem("meals", id, values),
    [updateItem],
  );
  const deleteMeal = useCallback((id) => removeItem("meals", id), [removeItem]);

  const createVisa = useCallback(
    (values) => addItem("visa", values),
    [addItem],
  );
  const updateVisa = useCallback(
    (id, values) => updateItem("visa", id, values),
    [updateItem],
  );
  const deleteVisa = useCallback((id) => removeItem("visa", id), [removeItem]);

  // ---- Salesman Analytics Helpers ------------------------------------------
  const getSalesmanStats = useCallback(
    (salesmanId) => {
      const allBookings = dataRef.current.bookings || bookings;
      const smBookings = allBookings.filter((b) => b.salesmanId === salesmanId);
      const totalSales = smBookings.reduce(
        (sum, b) => sum + (b.amount || b.totalPrice || 0),
        0,
      );
      const confirmedCount = smBookings.filter(
        (b) => b.status === "confirmed" || b.status === "Confirmed",
      ).length;
      const requestedCount = smBookings.filter(
        (b) => b.status === "requested" || b.status === "Pending",
      ).length;
      const rejectedCount = smBookings.filter(
        (b) => b.status === "rejected" || b.status === "Rejected",
      ).length;
      // 5% standard commission
      const commission = Math.round(totalSales * 0.05);

      const uniqueCustomers = new Set(
        smBookings.map((b) => b.customerId || b.customerName),
      ).size;

      return {
        totalBookings: smBookings.length,
        totalSales,
        confirmedCount,
        requestedCount,
        rejectedCount,
        commission,
        uniqueCustomers,
        bookings: smBookings,
      };
    },
    [bookings],
  );

  const value = useMemo(
    () => ({
      apiMode,
      loading,
      error,
      reload: load,
      // collections
      hotels,
      flights,
      cabs,
      meals,
      visa,
      packages,
      accounts,
      bookings,
      savedTravelers,
      // generic CRUD
      addItem,
      updateItem,
      removeItem,
      setPrice,
      setBasePrice,
      toggleActive,
      // entity CRUD aliases
      createHotel,
      updateHotel,
      deleteHotel,
      createFlight,
      updateFlight,
      deleteFlight,
      createPackage,
      updatePackage,
      deletePackage,
      createCab,
      updateCab,
      deleteCab,
      createMeal,
      updateMeal,
      deleteMeal,
      createVisa,
      updateVisa,
      deleteVisa,
      // accounts
      createAccount,
      updateAccount,
      removeAccount,
      // bookings
      addBooking,
      updateBookingStatus,
      confirmBooking,
      rejectBooking,
      // saved travelers
      saveTraveler,
      deleteTraveler,
      // selectors
      accountsByRole,
      getBookingsByStatus,
      hotelsForHotelier,
      getSalesmanStats,
    }),
    [
      apiMode,
      loading,
      error,
      load,
      hotels,
      flights,
      cabs,
      meals,
      visa,
      packages,
      accounts,
      bookings,
      savedTravelers,
      addItem,
      updateItem,
      removeItem,
      setPrice,
      setBasePrice,
      toggleActive,
      createHotel,
      updateHotel,
      deleteHotel,
      createFlight,
      updateFlight,
      deleteFlight,
      createPackage,
      updatePackage,
      deletePackage,
      createCab,
      updateCab,
      deleteCab,
      createMeal,
      updateMeal,
      deleteMeal,
      createVisa,
      updateVisa,
      deleteVisa,
      createAccount,
      updateAccount,
      removeAccount,
      addBooking,
      updateBookingStatus,
      confirmBooking,
      rejectBooking,
      saveTraveler,
      deleteTraveler,
      accountsByRole,
      getBookingsByStatus,
      hotelsForHotelier,
      getSalesmanStats,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// -----------------------------------------------------------------------------
// HotelierDataContext — shared store for live Hotelier room inventory & profile.
//
// Data sources:
//   • Room stock — LIVE against the hotelier portal API
//     (GET/POST /api/v1/hotelier/stock, unit hold/release, batch edits).
//   • Profile — LIVE from authenticated user session (GET /api/v1/auth/me).
// -----------------------------------------------------------------------------
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";

import { unwrapItem, unwrapList } from "../../services/http";
import {
  addStockUnits,
  createStockBlock,
  listStockBatches,
  normalizeBatch,
  setStockUnitStatus,
  toIsoDate,
  updateStockBatch,
} from "../services/stockApi";
import { mockHotelierProfile } from "../data/hotelierProfile";
import { HotelierDataContext } from "./hotelierContext";
import { useAuthStore } from "../../admin/store/authStore";

export function HotelierProvider({ children }) {
  const authUser = useAuthStore((s) => s.user);

  const [rooms, setRooms] = useState([]);

  const profile = useMemo(() => {
    const rawUser = authUser || {};
    const fallbackUser = mockHotelierProfile.user;
    const fallbackHotel = mockHotelierProfile.hotel;

    const user = {
      id: rawUser.id || fallbackUser.id,
      _id: rawUser.id || fallbackUser._id,
      phone: rawUser.phone || fallbackUser.phone,
      email: rawUser.email || fallbackUser.email,
      firstName: rawUser.firstName || fallbackUser.firstName,
      lastName: rawUser.lastName || fallbackUser.lastName,
      fullName:
        rawUser.fullName ||
        `${rawUser.firstName || ""} ${rawUser.lastName || ""}`.trim() ||
        fallbackUser.fullName,
      avatar: rawUser.avatar || null,
      role: rawUser.role || fallbackUser.role,
      isActive: rawUser.isActive ?? fallbackUser.isActive,
      isVerified: rawUser.isVerified ?? fallbackUser.isVerified,
      isPhoneVerified: rawUser.isPhoneVerified ?? fallbackUser.isPhoneVerified,
      hotelId: rawUser.hotelId || fallbackHotel.id,
      hotelName: rawUser.hotelName || fallbackHotel.name,
      lastLogin: rawUser.lastLogin ?? fallbackUser.lastLogin,
      createdAt: rawUser.createdAt || fallbackUser.createdAt,
    };

    const hotel = {
      id: rawUser.hotelId || fallbackHotel.id,
      _id: rawUser.hotelId || fallbackHotel._id,
      name: rawUser.hotelName || fallbackHotel.name,
      destination: fallbackHotel.destination,
      address: fallbackHotel.address,
      starRating: fallbackHotel.starRating,
      images: fallbackHotel.images || [],
      amenities: fallbackHotel.amenities || [],
      isActive: rawUser.isActive ?? true,
    };

    return { user, hotel };
  }, [authUser]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // GET /api/v1/hotelier/stock — every batch of this hotelier's hotel.
      const res = await listStockBatches();
      if (!mounted.current) return;
      setRooms(unwrapList(res).map(normalizeBatch));
    } catch (err) {
      if (!mounted.current) return;
      setError(err);
      setRooms([]);
      toast.error(err?.message || "Couldn't load your room stock.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // ---- Rooms (stock batches) -----------------------------------------------
  const addRoom = useCallback(async (values) => {
    // POST /api/v1/hotelier/stock — new blocks start pending_review.
    const payload = {
      roomType: values.type,
      checkIn: toIsoDate(values.checkIn),
      checkOut: toIsoDate(values.checkOut),
      pricePerNight: Number(values.price),
      meals: values.meals || [],
      reservationRef: values.reservationRef,
      nameAdditionDeadline: toIsoDate(values.nameAdditionDeadline),
      unitCount: Number(values.unitCount || values.total) || 0,
    };
    const res = unwrapItem(await createStockBlock(payload));
    const raw = res?.stock ?? res ?? {};
    const row = normalizeBatch({
      reviewStatus: "pending_review",
      ...raw,
      roomType: raw.roomType ?? payload.roomType,
      pricePerNight: raw.pricePerNight ?? payload.pricePerNight,
      checkIn: raw.checkIn ?? payload.checkIn,
      checkOut: raw.checkOut ?? payload.checkOut,
      meals: raw.meals ?? payload.meals,
      reservationRef: raw.reservationRef ?? payload.reservationRef,
      nameAdditionDeadline: raw.nameAdditionDeadline ?? payload.nameAdditionDeadline,
      totalUnits: raw.totalUnits ?? payload.unitCount,
    });
    setRooms((prev) => [row, ...prev]);
    return row;
  }, []);

  const updateRoom = useCallback(async (id, values) => {
    // PATCH /api/v1/hotelier/stock/:id
    const patch = {};
    if (values.type != null && values.type !== "") patch.roomType = values.type;
    if (values.checkIn) patch.checkIn = toIsoDate(values.checkIn);
    if (values.checkOut) patch.checkOut = toIsoDate(values.checkOut);
    if (values.price != null && values.price !== "") patch.pricePerNight = Number(values.price);
    if (values.meals) patch.meals = values.meals;
    if (values.reservationRef != null && values.reservationRef !== "")
      patch.reservationRef = values.reservationRef;
    if (values.nameAdditionDeadline)
      patch.nameAdditionDeadline = toIsoDate(values.nameAdditionDeadline);
    if (Object.keys(patch).length === 0) return;
    await updateStockBatch(id, patch);
    setRooms((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              type: patch.roomType ?? r.type,
              price: patch.pricePerNight ?? r.price,
              checkIn: patch.checkIn ?? r.checkIn,
              checkOut: patch.checkOut ?? r.checkOut,
              meals: patch.meals ?? r.meals,
              meal: patch.meals
                ? {
                    provided: patch.meals.length > 0,
                    plan: patch.meals
                      .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
                      .join(" + "),
                    price: 0,
                  }
                : r.meal,
              reservationRef: patch.reservationRef ?? r.reservationRef,
              nameAdditionDeadline: patch.nameAdditionDeadline ?? r.nameAdditionDeadline,
              reviewStatus: "pending_review",
            }
          : r
      )
    );
  }, []);

  const removeRoom = useCallback(async () => {
    throw new Error("Stock batches can't be deleted here. Contact the agency admin.");
  }, []);

  // Stepper maps to unit status: minus holds one available unit (blocked), plus releases one held unit.
  const applyUnitStatus = useCallback((roomId, unitId, status) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const units = (r.units || []).map((u) =>
          (u._id ?? u.id) === unitId ? { ...u, status } : u
        );
        return {
          ...r,
          units,
          available: units.filter((u) => u.status === "available").length,
          blocked: units.filter((u) => u.status === "blocked").length,
        };
      })
    );
  }, []);

  const adjustRoomAvailability = useCallback(
    async (id, delta) => {
      const room = rooms.find((r) => r.id === id);
      if (!room) return false;
      const units = room.units || [];
      const unit =
        delta < 0
          ? units.find((u) => u.status === "available")
          : units.find((u) => u.status === "blocked");
      if (!unit) return false;
      const nextStatus = delta < 0 ? "blocked" : "available";
      await setStockUnitStatus(id, unit._id ?? unit.id, nextStatus);
      applyUnitStatus(id, unit._id ?? unit.id, nextStatus);
      return true;
    },
    [rooms, applyUnitStatus]
  );

  // POST /api/v1/hotelier/stock/:id/units — extra units
  const addBatchUnits = useCallback(async (id, count) => {
    const amount = Number(count) || 0;
    if (amount <= 0) return false;
    await addStockUnits(id, amount);
    setRooms((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, total: (Number(r.total) || 0) + amount, reviewStatus: "pending_review" }
          : r
      )
    );
    return true;
  }, []);

  const value = useMemo(
    () => ({
      apiMode: true,
      loading,
      error,
      rooms,
      cars: [],
      bookings: [],
      profile,
      reload: load,
      addRoom,
      updateRoom,
      removeRoom,
      adjustRoomAvailability,
      addBatchUnits,
    }),
    [
      loading,
      error,
      rooms,
      profile,
      load,
      addRoom,
      updateRoom,
      removeRoom,
      adjustRoomAvailability,
      addBatchUnits,
    ]
  );

  return (
    <HotelierDataContext.Provider value={value}>
      {children}
    </HotelierDataContext.Provider>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  RotateCw,
  Ticket,
  Hotel,
  Wallet,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Eye,
  Power,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  Tag,
  AlertCircle,
  FileText,
  ChevronRight,
  ExternalLink,
  Shield,
  Layers,
  Percent,
} from "lucide-react";
import { toast } from "react-toastify";

import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import InventoryTable from "../../../components/inventory/InventoryTable";
import StockPagination from "../../../components/inventory/StockPagination";
import StatusBadge from "../../../components/common/StatusBadge";
import CrmImageUploadSection from "../../../components/common/CrmImageUploadSection";

import { offersApi } from "../offersApi";
import { stocksApi } from "../../inventory/stocks/stocksApi";
import { settingsApi } from "../../settings/settingsApi";

const PAGE_SIZE = 10;

const TABS = [
  { key: "offers", label: "Retail Offers" },
  { key: "bookings", label: "Offer Bookings" },
];

const BOOKING_STATUSES = ["all", "pending", "confirmed", "cancelled", "completed"];

const emptyOfferForm = {
  itemType: "flight",
  stock: "",
  unitsPerBooking: "1",
  title: "",
  description: "",
  destination: "",
  sellPrice: "",
  originalPrice: "",
  discountPercentage: "",
  inclusions: "",
  startDate: "",
  endDate: "",
  termsAndConditions: "",
  images: [],
};

const toIso = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const toInputDateTime = (dateVal) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16);
  } catch {
    return "";
  }
};

const flightStockLabel = (stock) => {
  const cost = stock.costPerUnit ?? stock.costPerSeat ?? stock.cost ?? stock.price ?? 0;
  const costStr = cost ? ` · Cost: ₹${Number(cost).toLocaleString("en-IN")}` : "";
  return `${stock.airline ?? ""} ${stock.flightNumber ?? ""} · ${stock.origin ?? ""}→${stock.destination ?? ""} · PNR ${stock.pnr ?? "—"} · ${stock.availableUnits ?? 0} seats${costStr}`;
};

const hotelStockLabel = (stock) => {
  const cost = stock.costPerUnit ?? stock.costPerRoom ?? stock.pricePerNight ?? stock.cost ?? 0;
  const costStr = cost ? ` · Cost: ₹${Number(cost).toLocaleString("en-IN")}` : "";
  return `${stock.hotelName ?? "Hotel"} · ${stock.roomType ?? ""} · ${stock.destination ?? ""} · ${stock.availableUnits ?? 0} rooms${costStr}`;
};

const tabButton = (active) =>
  `rounded-xl px-4 py-2 text-sm font-semibold transition ${
    active
      ? "bg-emerald-700 text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100"
  }`;

export default function Offers() {
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("offers");

  const markupQuery = useQuery({
    queryKey: ["settings", "markup"],
    queryFn: () => settingsApi.getMarkup(),
    staleTime: 60000,
  });
  const markupSettings = markupQuery.data;

  const getActiveMarkupPercent = (type = form.itemType) => {
    if (type === "flight") {
      return Number(markupSettings?.flightMarkupPercent ?? markupSettings?.markPercent ?? 12.5);
    }
    return Number(markupSettings?.hotelMarkupPercent ?? markupSettings?.markPercent ?? 15.0);
  };

  // Offers tab state
  const [itemType, setItemType] = useState("");
  const [destination, setDestination] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyOfferForm);

  // Offer 360 Details Dossier state (GET /api/v1/crm/offers/:id)
  const [viewTargetId, setViewTargetId] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedId, setCopiedId] = useState(false);

  // Bookings tab state
  const [bookingStatus, setBookingStatus] = useState("all");
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookTarget, setBookTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // Edit offer state — loads single offer (GET /api/v1/crm/offers/:id,
  // live stock metrics included) and submits PATCH /api/v1/crm/offers/:id.
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(emptyOfferForm);

  // Book-for-customer state
  const [bookForm, setBookForm] = useState({
    customerId: "",
    quantity: "1",
    method: "bank_transfer",
    referenceNumber: "",
    notes: "",
  });

  const offersQuery = useQuery({
    queryKey: ["offers", { page, itemType, destination, statusFilter }],
    queryFn: () =>
      offersApi.list({
        page,
        limit: PAGE_SIZE,
        itemType,
        destination: destination.trim(),
        isActive: statusFilter,
      }),
    placeholderData: (previous) => previous,
  });

  const bookingsQuery = useQuery({
    queryKey: ["offers", "bookings", { bookingsPage, bookingStatus }],
    queryFn: () =>
      offersApi.listBookings({
        page: bookingsPage,
        limit: PAGE_SIZE,
        status: bookingStatus === "all" ? "" : bookingStatus,
      }),
    placeholderData: (previous) => previous,
  });

  // Stock picker data for create and edit modals (loaded on demand while open).
  const activePickerType = editTarget ? editForm.itemType : form.itemType;
  const stockPickerKey = ["offer-stock-picker", activePickerType];
  const stockPickerQuery = useQuery({
    queryKey: stockPickerKey,
    queryFn: () =>
      activePickerType === "flight"
        ? stocksApi.listFlights({ page: 1, limit: 100, availableOnly: true })
        : stocksApi.listHotels({ page: 1, limit: 100, availableOnly: true }),
    enabled: createOpen || Boolean(editTarget),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [destination]);

  const invalidateOffers = () => {
    queryClient.invalidateQueries({ queryKey: ["offers"] });
  };

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => offersApi.toggleStatus(id),
    onSuccess: (data) => {
      invalidateOffers();
      queryClient.invalidateQueries({ queryKey: ["offers", "detail"] });
      queryClient.invalidateQueries({ queryKey: ["offers", "single"] });
      toast.success(
        data?.isActive !== undefined
          ? `Offer is now ${data.isActive ? "Active (Live in Portal)" : "Paused (Hidden from Portal)"}`
          : "Offer status updated",
      );
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || "Failed to update offer status"),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => offersApi.create(payload),
    onSuccess: (offer) => {
      invalidateOffers();
      toast.success(
        offer?.title
          ? `Offer "${offer.title}" created successfully`
          : "Retail offer created successfully",
      );
      setCreateOpen(false);
      setForm(emptyOfferForm);
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || "Failed to create offer"),
  });

  // GET /api/v1/crm/offers/:id — single offer detail for dossier view.
  const viewDetailQuery = useQuery({
    queryKey: ["offers", "detail", viewTargetId],
    queryFn: () => offersApi.getSingle(viewTargetId),
    enabled: Boolean(viewTargetId),
  });

  useEffect(() => {
    setActiveImageIndex(0);
  }, [viewTargetId]);

  const copyOfferId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success("Offer ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  // GET /api/v1/crm/offers/:id — single offer detail with live stock metrics for edit.
  const editDetailQuery = useQuery({
    queryKey: ["offers", "single", editTarget?.id],
    queryFn: () => offersApi.getSingle(editTarget.id),
    enabled: Boolean(editTarget),
  });

  // Prefill from the table row at open time (event handler — no cascading
  // renders). GET /api/v1/crm/offers/:id still runs for the live-stock banner.
  const openEditor = (row) => {
    const stockId =
      typeof row.flightRef?.stock === "object"
        ? (row.flightRef.stock._id ?? row.flightRef.stock.id)
        : (row.flightRef?.stock ||
           (typeof row.hotelRef?.stock === "object"
             ? (row.hotelRef.stock._id ?? row.hotelRef.stock.id)
             : row.hotelRef?.stock) ||
           row.stock ||
           "");

    setEditForm({
      ...emptyOfferForm,
      stock: stockId || "",
      itemType: row.itemType ?? row.type ?? "flight",
      title: row.title ?? "",
      description: row.description ?? "",
      destination: row.destination ?? "",
      sellPrice: String(row.sellPrice ?? ""),
      originalPrice: String(row.originalPrice ?? ""),
      discountPercentage: String(row.discountPercentage ?? ""),
      unitsPerBooking: String(row.unitsPerBooking ?? 1),
      startDate: row.startDate ? row.startDate.slice(0, 16) : "",
      endDate: row.endDate ? row.endDate.slice(0, 16) : "",
      inclusions: Array.isArray(row.inclusions)
        ? row.inclusions.join("\n")
        : typeof row.inclusions === "string"
          ? row.inclusions
          : "",
      termsAndConditions: row.termsAndConditions ?? "",
      images: Array.isArray(row.images) ? row.images.filter(Boolean) : [],
    });
    setEditTarget(row);
  };

  // If editDetailQuery loads stock info that was not present in the table row, sync it
  useEffect(() => {
    if (!editTarget || !editDetailQuery.data) return;
    const detail = editDetailQuery.data;
    const stockId =
      typeof detail.flightRef?.stock === "object"
        ? (detail.flightRef.stock._id ?? detail.flightRef.stock.id)
        : (detail.flightRef?.stock ||
           (typeof detail.hotelRef?.stock === "object"
             ? (detail.hotelRef.stock._id ?? detail.hotelRef.stock.id)
             : detail.hotelRef?.stock) ||
           detail.stock ||
           "");
    if (stockId && !editForm.stock) {
      setEditForm((prev) => ({ ...prev, stock: stockId }));
    }
  }, [editDetailQuery.data, editTarget]);

  const updateEditField = (field, value) => setEditForm((prev) => ({ ...prev, [field]: value }));

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => offersApi.update(id, payload),
    onSuccess: (offer) => {
      invalidateOffers();
      queryClient.invalidateQueries({ queryKey: ["offers", "single"] });
      queryClient.invalidateQueries({ queryKey: ["offers", "detail"] });
      toast.success(
        offer?.title ? `Offer "${offer.title}" updated successfully` : "Retail offer updated successfully",
      );
      setEditTarget(null);
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || "Failed to update offer"),
  });

  const submitEdit = (event) => {
    event.preventDefault();
    if (!editTarget) return;
    const refKey = editForm.itemType === "flight" ? "flightRef" : "hotelRef";
    const payload = {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      destination: editForm.destination.trim(),
      sellPrice: Number(editForm.sellPrice),
      originalPrice: editForm.originalPrice ? Number(editForm.originalPrice) : undefined,
      discountPercentage: editForm.discountPercentage !== "" ? Number(editForm.discountPercentage) : undefined,
      unitsPerBooking: Number(editForm.unitsPerBooking || 1),
      images: Array.isArray(editForm.images) ? editForm.images.filter(Boolean) : [],
      inclusions: editForm.inclusions.split("\n").map((line) => line.trim()).filter(Boolean),
      startDate: toIso(editForm.startDate),
      endDate: toIso(editForm.endDate),
      termsAndConditions: editForm.termsAndConditions.trim() || undefined,
    };
    if (editForm.stock) {
      payload[refKey] = {
        stock: editForm.stock,
        unitsPerBooking: Number(editForm.unitsPerBooking || 1),
      };
    }
    updateMutation.mutate({ id: editTarget.id, payload });
  };

  const bookMutation = useMutation({
    mutationFn: (payload) => offersApi.bookForCustomer(payload),
    onSuccess: (data) => {
      invalidateOffers();
      queryClient.invalidateQueries({ queryKey: ["offers", "bookings"] });
      toast.success(
        `Booking confirmed${data?.payment?.transactionId ? ` · ${data.payment.transactionId}` : ""}`,
      );
      setBookTarget(null);
      setBookForm({ customerId: "", quantity: "1", method: "bank_transfer", referenceNumber: "", notes: "" });
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || "Failed to create booking"),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => offersApi.cancelBooking(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers", "bookings"] });
      invalidateOffers();
      toast.success("Booking cancelled and stock released");
      setCancelTarget(null);
      setCancelReason("");
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || "Failed to cancel booking"),
  });

  const offers = offersQuery.data?.offers ?? [];
  const bookings = bookingsQuery.data?.bookings ?? [];

  const stocks = useMemo(
    () => stockPickerQuery.data?.stocks ?? [],
    [stockPickerQuery.data],
  );
  const selectedStock = useMemo(
    () => stocks.find((stock) => (stock._id ?? stock.id) === form.stock),
    [stocks, form.stock],
  );

  // Fetch individual stock details (/api/v1/crm/stocks/flights/:id or /api/v1/stock/flight/:id)
  const selectedStockDetailQuery = useQuery({
    queryKey: ["stocks", form.itemType, "single", form.stock],
    queryFn: () =>
      form.itemType === "flight"
        ? stocksApi.getFlightDetails(form.stock)
        : stocksApi.getHotelDetails(form.stock),
    enabled: Boolean(createOpen && form.stock),
  });

  // Merged stock data combining already present list data and detail payload
  const activeStock = useMemo(() => {
    if (!selectedStock && !selectedStockDetailQuery.data) return null;
    return {
      ...(selectedStock || {}),
      ...(selectedStockDetailQuery.data || {}),
    };
  }, [selectedStock, selectedStockDetailQuery.data]);

  // Extract wholesale cost from stock
  const stockWholesaleCost = useMemo(() => {
    if (!activeStock) return 0;
    const cost =
      activeStock.costPerUnit ??
      activeStock.costPerSeat ??
      activeStock.costPerRoom ??
      activeStock.cost ??
      activeStock.pricePerNight ??
      activeStock.price ??
      0;
    return Number(cost || 0);
  }, [activeStock]);

  // Live real-time margin and gross profit calculator
  const liveMarginCalc = useMemo(() => {
    const sell = Number(form.sellPrice || 0);
    const cost = stockWholesaleCost;
    if (!cost || !sell) return null;
    const grossProfit = sell - cost;
    const marginPct = sell > 0 ? Math.round((grossProfit / sell) * 100) : 0;
    const isLoss = grossProfit < 0;
    return { grossProfit, marginPct, isLoss };
  }, [form.sellPrice, stockWholesaleCost]);

  // When stock is selected from dropdown, populate already present data & stock price
  const handleStockSelect = (stockId) => {
    if (!stockId) {
      updateField("stock", "");
      return;
    }

    const stock = stocks.find((s) => (s._id ?? s.id) === stockId);
    if (!stock) {
      updateField("stock", stockId);
      return;
    }

    const wholesale = Number(
      stock.costPerUnit ??
      stock.costPerSeat ??
      stock.costPerRoom ??
      stock.cost ??
      stock.pricePerNight ??
      stock.price ??
      0
    );

    const isFlight = stock.flightNumber || stock.airline || form.itemType === "flight";
    const markupPct = getActiveMarkupPercent(isFlight ? "flight" : "hotel");
    const suggestedSell = wholesale > 0 ? Math.round(wholesale * (1 + markupPct / 100)) : "";
    const suggestedOriginal = wholesale > 0 ? Math.round(wholesale * (1 + (markupPct + 10) / 100)) : "";

    let title = form.title;
    if (!title.trim() || title === "Direct Flight to Dubai — IndiGo Special") {
      if (form.itemType === "flight") {
        title = `${stock.airline || "Flight"} ${stock.flightNumber ? stock.flightNumber + " " : ""}${stock.origin ? stock.origin + " → " : ""}${stock.destination || ""}`.trim();
      } else {
        title = `${stock.hotelName || "Hotel"} — ${stock.roomType || stock.destination || "Room"}`.trim();
      }
    }

    const startDate = toInputDateTime(stock.departureDate || stock.checkIn);
    const endDate = toInputDateTime(stock.arrivalDate || stock.checkOut);

    setForm((prev) => ({
      ...prev,
      stock: stockId,
      sellPrice: prev.sellPrice && Number(prev.sellPrice) > 0 ? prev.sellPrice : String(suggestedSell || wholesale || ""),
      originalPrice: prev.originalPrice && Number(prev.originalPrice) > 0 ? prev.originalPrice : String(suggestedOriginal || ""),
      destination: prev.destination || stock.destination || "",
      title: title || prev.title,
      startDate: prev.startDate || startDate,
      endDate: prev.endDate || endDate,
    }));

    if (wholesale > 0) {
      toast.info(`Stock selected · Wholesale cost: ${money(wholesale)} · +${markupPct}% Markup applied`);
    }
  };

  const syncStockDetailsToForm = () => {
    if (!activeStock) return;
    const wholesale = stockWholesaleCost;
    const markupPct = getActiveMarkupPercent(form.itemType);
    const suggestedSell = wholesale > 0 ? Math.round(wholesale * (1 + markupPct / 100)) : "";
    const suggestedOriginal = wholesale > 0 ? Math.round(wholesale * (1 + (markupPct + 10) / 100)) : "";

    let title = "";
    if (form.itemType === "flight") {
      title = `${activeStock.airline || "Flight"} ${activeStock.flightNumber ? activeStock.flightNumber + " " : ""}${activeStock.origin ? activeStock.origin + " → " : ""}${activeStock.destination || ""}`.trim();
    } else {
      title = `${activeStock.hotelName || "Hotel"} — ${activeStock.roomType || activeStock.destination || "Room"}`.trim();
    }

    const startDate = toInputDateTime(activeStock.departureDate || activeStock.checkIn);
    const endDate = toInputDateTime(activeStock.arrivalDate || activeStock.checkOut);

    setForm((prev) => ({
      ...prev,
      destination: activeStock.destination || prev.destination,
      title: title || prev.title,
      startDate: startDate || prev.startDate,
      endDate: endDate || prev.endDate,
      sellPrice: suggestedSell ? String(suggestedSell) : (wholesale ? String(wholesale) : prev.sellPrice),
      originalPrice: suggestedOriginal ? String(suggestedOriginal) : prev.originalPrice,
    }));

    toast.success(`Stock details synchronized with +${markupPct}% markup!`);
  };

  // Sync details from detailed fetch if price wasn't available in list
  useEffect(() => {
    if (!createOpen || !form.stock || !selectedStockDetailQuery.data) return;
    const detail = selectedStockDetailQuery.data;
    const cost = Number(
      detail.costPerUnit ??
      detail.costPerSeat ??
      detail.costPerRoom ??
      detail.cost ??
      detail.price ??
      0
    );
    if (cost > 0 && (!form.sellPrice || Number(form.sellPrice) === 0)) {
      const markupPct = getActiveMarkupPercent(form.itemType);
      setForm((prev) => ({
        ...prev,
        sellPrice: prev.sellPrice || String(Math.round(cost * (1 + markupPct / 100))),
        originalPrice: prev.originalPrice || String(Math.round(cost * (1 + (markupPct + 10) / 100))),
        destination: prev.destination || detail.destination || "",
      }));
    }
  }, [selectedStockDetailQuery.data, createOpen, form.stock, markupSettings]);

  // Resolve 360 view offer details (combining list data with live getSingle payload)
  const viewOffer = useMemo(() => {
    if (!viewTargetId) return null;
    const base = offers.find((o) => (o._id ?? o.id) === viewTargetId);
    const detail = viewDetailQuery.data;
    if (!detail) return base ? { ...base, id: base._id ?? base.id } : null;
    return { ...(base || {}), ...detail, id: detail._id ?? detail.id ?? viewTargetId };
  }, [viewTargetId, viewDetailQuery.data, offers]);

  const viewFlightStock = typeof viewOffer?.flightRef?.stock === "object" ? viewOffer.flightRef.stock : null;
  const viewHotelStock = typeof viewOffer?.hotelRef?.stock === "object" ? viewOffer.hotelRef.stock : null;
  const viewStockId =
    viewFlightStock?._id ??
    viewFlightStock?.id ??
    viewHotelStock?._id ??
    viewHotelStock?.id ??
    (typeof viewOffer?.flightRef?.stock === "string" ? viewOffer.flightRef.stock : null) ??
    (typeof viewOffer?.hotelRef?.stock === "string" ? viewOffer.hotelRef.stock : null) ??
    viewOffer?.stock ??
    null;

  const viewStockDetailQuery = useQuery({
    queryKey: ["stocks", viewOffer?.itemType, "single", viewStockId],
    queryFn: () =>
      viewOffer?.itemType === "flight"
        ? stocksApi.getFlightDetails(viewStockId)
        : stocksApi.getHotelDetails(viewStockId),
    enabled: Boolean(viewTargetId && viewStockId && !viewFlightStock && !viewHotelStock),
  });

  const activeViewStock = useMemo(() => {
    return viewFlightStock || viewHotelStock || viewStockDetailQuery.data || null;
  }, [viewFlightStock, viewHotelStock, viewStockDetailQuery.data]);

  // Edit modal stock picker list and selection
  const editStocks = useMemo(
    () => (editTarget ? (stockPickerQuery.data?.stocks ?? []) : []),
    [editTarget, stockPickerQuery.data],
  );

  const selectedEditStock = useMemo(
    () => editStocks.find((stock) => (stock._id ?? stock.id) === editForm.stock),
    [editStocks, editForm.stock],
  );

  const activeEditStock = useMemo(() => {
    if (!editTarget) return null;
    const populatedFromTarget =
      typeof editTarget.flightRef?.stock === "object"
        ? editTarget.flightRef.stock
        : typeof editTarget.hotelRef?.stock === "object"
          ? editTarget.hotelRef.stock
          : null;
    const populatedFromDetail =
      editDetailQuery.data && typeof editDetailQuery.data.flightRef?.stock === "object"
        ? editDetailQuery.data.flightRef.stock
        : editDetailQuery.data && typeof editDetailQuery.data.hotelRef?.stock === "object"
          ? editDetailQuery.data.hotelRef.stock
          : null;
    return selectedEditStock || populatedFromDetail || populatedFromTarget || null;
  }, [editTarget, selectedEditStock, editDetailQuery.data]);

  const editStockWholesaleCost = useMemo(() => {
    if (activeEditStock) {
      const cost =
        activeEditStock.costPerUnit ??
        activeEditStock.costPerSeat ??
        activeEditStock.costPerRoom ??
        activeEditStock.cost ??
        activeEditStock.pricePerNight ??
        activeEditStock.price ??
        0;
      if (Number(cost) > 0) return Number(cost);
    }
    if (editDetailQuery.data?.costPrice) {
      return Number(editDetailQuery.data.costPrice);
    }
    return 0;
  }, [activeEditStock, editDetailQuery.data]);

  const editLiveMarginCalc = useMemo(() => {
    const sell = Number(editForm.sellPrice || 0);
    const cost = editStockWholesaleCost;
    if (!cost || !sell) return null;
    const grossProfit = sell - cost;
    const marginPct = sell > 0 ? Math.round((grossProfit / sell) * 100) : 0;
    const isLoss = grossProfit < 0;
    return { grossProfit, marginPct, isLoss };
  }, [editForm.sellPrice, editStockWholesaleCost]);

  const handleEditStockSelect = (stockId) => {
    if (!stockId) {
      updateEditField("stock", "");
      return;
    }
    const stock = editStocks.find((s) => (s._id ?? s.id) === stockId);
    updateEditField("stock", stockId);
    if (stock) {
      const wholesale = Number(
        stock.costPerUnit ??
        stock.costPerSeat ??
        stock.costPerRoom ??
        stock.cost ??
        stock.pricePerNight ??
        stock.price ??
        0
      );
      if (wholesale > 0) {
        toast.info(`Stock selected · Wholesale cost: ${money(wholesale)}`);
      }
    }
  };

  const discountPreview = useMemo(() => {
    const sell = Number(form.sellPrice || 0);
    const original = Number(form.originalPrice || 0);
    if (original > 0 && sell > 0 && sell <= original) {
      return Math.round(((original - sell) / original) * 100);
    }
    return null;
  }, [form.sellPrice, form.originalPrice]);

  const updateField = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const switchItemType = (itemType) => {
    setForm((previous) => ({
      ...emptyOfferForm,
      itemType,
      title: previous.title,
      destination: previous.destination,
      description: previous.description,
      images: previous.images || [],
    }));
  };

  const handleCreate = (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.destination.trim()) {
      toast.error("Title and destination are required");
      return;
    }
    if (!form.stock) {
      toast.error("Please select a wholesale stock batch to link");
      return;
    }
    const sellPrice = Number(form.sellPrice || 0);
    if (sellPrice <= 0) {
      toast.error("Enter a valid selling price");
      return;
    }

    const base = {
      title: form.title.trim(),
      description: form.description.trim(),
      destination: form.destination.trim(),
      itemType: form.itemType,
      sellPrice,
      originalPrice: Number(form.originalPrice || 0) || undefined,
      discountPercentage:
        form.discountPercentage !== ""
          ? Number(form.discountPercentage)
          : discountPreview ?? undefined,
      unitsPerBooking: Number(form.unitsPerBooking || 1),
      images: Array.isArray(form.images) ? form.images.filter(Boolean) : [],
      inclusions: form.inclusions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      startDate: toIso(form.startDate),
      endDate: toIso(form.endDate),
    };

    const refKey = form.itemType === "flight" ? "flightRef" : "hotelRef";
    createMutation.mutate({
      ...base,
      [refKey]: { stock: form.stock, unitsPerBooking: Number(form.unitsPerBooking || 1) },
      ...(form.termsAndConditions.trim()
        ? { termsAndConditions: form.termsAndConditions.trim() }
        : {}),
    });
  };

  const handleBook = (event) => {
    event.preventDefault();
    if (!bookForm.customerId.trim()) {
      toast.error("Customer ID is required");
      return;
    }
    bookMutation.mutate({
      offerId: bookTarget._id ?? bookTarget.id,
      customerId: bookForm.customerId.trim(),
      quantity: Number(bookForm.quantity || 1),
      payment: {
        method: bookForm.method,
        referenceNumber: bookForm.referenceNumber.trim() || undefined,
        notes: bookForm.notes.trim() || undefined,
      },
    });
  };

  const handleCancelBooking = (event) => {
    event.preventDefault();
    cancelMutation.mutate({
      id: cancelTarget._id ?? cancelTarget.id,
      reason: cancelReason.trim(),
    });
  };

  const renderOffersTab = () => (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <div className="sm:w-44">
          <label className="mb-1.5 block text-xs font-semibold text-slate-500">Type</label>
          <select
            value={itemType}
            onChange={(event) => {
              setItemType(event.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="">All types</option>
            <option value="flight">Flight</option>
            <option value="hotel">Hotel</option>
          </select>
        </div>

        <div className="sm:w-44">
          <label className="mb-1.5 block text-xs font-semibold text-slate-500">Status</label>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="flex-1">
          <Input
            label="Destination"
            placeholder="e.g. Dubai..."
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          />
        </div>
      </div>

      {offersQuery.isLoading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
          Loading offers...
        </div>
      ) : offersQuery.isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center text-sm font-semibold text-red-600">
          Failed to load offers. Please try again.
        </div>
      ) : (
        <InventoryTable
          rows={offers.map((offer) => ({ ...offer, id: offer._id ?? offer.id }))}
          empty="No retail offers yet. Create one from a wholesale stock batch."
          columns={[
            {
              key: "offer",
              label: "Offer",
              render: (row) => {
                const coverImage = Array.isArray(row.images) && row.images.length > 0 ? row.images[0] : null;
                const imageCount = Array.isArray(row.images) ? row.images.length : 0;
                return (
                  <div
                    onClick={() => setViewTargetId(row.id)}
                    className="flex cursor-pointer items-center gap-3 transition group hover:opacity-85"
                    title="Click to view full retail offer dossier"
                  >
                    {coverImage ? (
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs group-hover:ring-2 group-hover:ring-emerald-500/30">
                        <img
                          src={coverImage}
                          alt={row.title}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                          loading="lazy"
                        />
                        {imageCount > 1 && (
                          <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/70 px-1 text-[8px] font-bold text-white">
                            +{imageCount - 1}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 group-hover:border-emerald-300 group-hover:bg-emerald-50/50 group-hover:text-emerald-700">
                        {row.itemType === "flight" ? <Ticket size={16} /> : <Hotel size={16} />}
                      </div>
                    )}
                    <div>
                      <b className="text-slate-900 transition group-hover:text-emerald-700">{row.title}</b>
                      <p className="text-xs text-slate-400">
                        {row.destination} · {row.itemType === "flight" ? "Flight" : "Hotel"}
                      </p>
                    </div>
                  </div>
                );
              },
            },
            {
              key: "pricing",
              label: "Retail Price",
              render: (row) => (
                <div>
                  <span className="font-bold text-slate-800">{money(row.sellPrice)}</span>
                  {Number(row.originalPrice) > Number(row.sellPrice) && (
                    <span className="ml-2 text-xs text-slate-400 line-through">
                      {money(row.originalPrice)}
                    </span>
                  )}
                  {Number(row.discountPercentage) > 0 && (
                    <p className="text-xs font-semibold text-emerald-700">
                      {row.discountPercentage}% off
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: "margin",
              label: "Wholesale & Profit",
              render: (row) => {
                const sell = Number(row.sellPrice || 0);
                let cost = Number(row.costPrice || 0);
                if (!cost && row.flightRef?.stock && typeof row.flightRef.stock === "object") {
                  cost = Number(row.flightRef.stock.costPerUnit || row.flightRef.stock.costPerSeat || 0);
                }
                if (!cost && row.hotelRef?.stock && typeof row.hotelRef.stock === "object") {
                  cost = Number(row.hotelRef.stock.pricePerNight || row.hotelRef.stock.costPerRoom || 0);
                }
                let profit = Number(row.grossProfit || 0);
                if (!profit && cost > 0 && sell > 0) {
                  profit = sell - cost;
                }
                const marginPct =
                  Number(row.profitMarginPercentage) ||
                  (cost > 0 && sell > 0 ? Math.round((profit / sell) * 100) : 0);
                return (
                  <div>
                    <span className={`font-semibold ${profit < 0 ? "text-red-600" : "text-emerald-700"}`}>
                      {profit >= 0 ? "+" : ""}{money(profit)} ({marginPct}%)
                    </span>
                    <p className="text-xs text-slate-400">
                      cost: {money(cost)}
                    </p>
                  </div>
                );
              },
            },
            {
              key: "availability",
              label: "Available",
              render: (row) => {
                const units = row.availableBookings ?? row.availableUnits ?? 0;
                return (
                  <span className={Number(units) === 0 ? "font-bold text-red-600" : "font-bold text-emerald-700"}>
                    {units}
                  </span>
                );
              },
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <button
                  type="button"
                  title={`Click to ${row.isActive ? "pause" : "activate"} offer`}
                  onClick={() => toggleStatusMutation.mutate(row.id)}
                  disabled={toggleStatusMutation.isPending}
                  className="transition hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <StatusBadge status={row.isActive ? "Active" : "Inactive"} />
                </button>
              ),
            },
          ]}
          renderActions={(row) => (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setViewTargetId(row.id)}
                title="View full retail offer dossier"
              >
                <Eye size={16} />
                View
              </Button>
              <Button variant="secondary" onClick={() => openEditor(row)} title="Edit offer">
                <RotateCw size={16} />
                Edit
              </Button>
              <Button
                variant="secondary"
                onClick={() => setBookTarget(row)}
                disabled={Number(row.availableBookings ?? row.availableUnits ?? 0) === 0}
                title="Book for customer"
              >
                <Wallet size={16} />
                Book
              </Button>
            </div>
          )}
        />
      )}

      <StockPagination
        pagination={offersQuery.data?.pagination}
        onPageChange={setPage}
        disabled={offersQuery.isFetching}
      />
    </>
  );

  const renderBookingsTab = () => (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="sm:w-56">
          <label className="mb-1.5 block text-xs font-semibold text-slate-500">Status</label>
          <select
            value={bookingStatus}
            onChange={(event) => {
              setBookingStatus(event.target.value);
              setBookingsPage(1);
            }}
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
          >
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All statuses" : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {bookingsQuery.isLoading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
          Loading bookings...
        </div>
      ) : (
        <InventoryTable
          rows={bookings.map((booking) => ({ ...booking, id: booking._id ?? booking.id }))}
          empty="No offer bookings for this status."
          columns={[
            {
              key: "booking",
              label: "Booking",
              render: (row) => (
                <span className="font-mono text-xs font-bold">
                  {(row.bookingReference ?? row.id ?? "").slice(-12)}
                </span>
              ),
            },
            {
              key: "offer",
              label: "Offer",
              render: (row) => row.offer?.title ?? row.offerTitle ?? "—",
            },
            {
              key: "customer",
              label: "Customer",
              render: (row) => {
                const customer = row.customer;
                const name =
                  typeof customer === "object"
                    ? `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim()
                    : customer;
                return <span>{name || "—"}</span>;
              },
            },
            { key: "quantity", label: "Qty" },
            {
              key: "totalAmount",
              label: "Amount",
              render: (row) => <span className="font-semibold">{money(row.totalAmount)}</span>,
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusBadge
                  status={
                    row.status === "pending"
                      ? "Pending"
                      : row.status === "confirmed"
                        ? "Confirmed"
                        : "Cancelled"
                  }
                />
              ),
            },
          ]}
          renderActions={(row) =>
            row.status === "confirmed" || row.status === "pending" ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setCancelTarget(row);
                  setCancelReason("");
                }}
              >
                Cancel
              </Button>
            ) : null
          }
        />
      )}

      <StockPagination
        pagination={bookingsQuery.data?.pagination}
        onPageChange={setBookingsPage}
        disabled={bookingsQuery.isFetching}
      />
    </>
  );

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title="Retail Offers"
        subtitle="Standalone flight and hotel offers built on wholesale stock, with live margin analytics."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                tab === "offers" ? offersQuery.refetch() : bookingsQuery.refetch()
              }
              loading={tab === "offers" ? offersQuery.isFetching : bookingsQuery.isFetching}
            >
              <RotateCw size={16} />
              Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Create Offer
            </Button>
          </>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5">
        {TABS.map((item) => (
          <button key={item.key} type="button" onClick={() => setTab(item.key)} className={tabButton(tab === item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "offers" ? renderOffersTab() : renderBookingsTab()}

      {/* Create Offer Modal */}
      <Modal open={createOpen} title="Create Retail Offer" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Item type */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "flight", label: "Flight Offer", icon: Ticket },
              { key: "hotel", label: "Hotel Offer", icon: Hotel },
            ].map((option) => {
              const Icon = option.icon;
              const active = form.itemType === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => switchItemType(option.key)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} />
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Stock link */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              {form.itemType === "flight" ? "Ticket Stock Batch" : "Hotel Room Allotment"}
            </label>
            <select
              value={form.stock}
              onChange={(event) => handleStockSelect(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/10"
              required
            >
              <option value="">
                {stockPickerQuery.isLoading ? "Loading stock..." : "Select a stock batch"}
              </option>
              {stocks.map((stock) => {
                const id = stock._id ?? stock.id;
                return (
                  <option key={id} value={id}>
                    {form.itemType === "flight"
                      ? flightStockLabel(stock)
                      : hotelStockLabel(stock)}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Wholesale pricing and stock attributes auto-fill upon selection.
            </p>
          </div>

          {/* Wholesale Stock & Live Cost Analysis Card */}
          {activeStock && (
            <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50/50 p-4.5 shadow-xs animate-slide-in">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
                    {form.itemType === "flight" ? <Ticket size={18} /> : <Hotel size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        {form.itemType === "flight" ? "Linked Flight Stock" : "Linked Hotel Allotment"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 size={11} />
                        {activeStock.availableUnits ?? 0} {form.itemType === "flight" ? "seats available" : "rooms available"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {form.itemType === "flight"
                        ? `${activeStock.airline || ""} ${activeStock.flightNumber || ""} · ${activeStock.origin || ""} → ${activeStock.destination || ""} · PNR ${activeStock.pnr || "—"}`
                        : `${activeStock.hotelName || "Hotel"} · ${activeStock.roomType || ""} · ${activeStock.destination || ""}`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={syncStockDetailsToForm}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs transition hover:bg-emerald-50 active:scale-98"
                  title="Overwrite Title, Destination, Dates, and Price from Stock"
                >
                  <Sparkles size={13} className="text-emerald-600" />
                  <span>Sync All to Form</span>
                </button>
              </div>

              {/* Wholesale Pricing & Margin Analytics Cards */}
              <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
                {/* Wholesale cost card */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Wholesale Cost ({form.itemType === "flight" ? "per seat" : "per room"})
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-slate-900">
                      {stockWholesaleCost > 0 ? money(stockWholesaleCost) : "—"}
                    </span>
                    {selectedStockDetailQuery.isFetching && (
                      <span className="text-[10px] font-medium text-slate-400 animate-pulse">(updating...)</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    From stock batch record
                  </p>
                </div>

                {/* Live selling price card */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Retail Selling Price
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-slate-900">
                      {form.sellPrice ? money(form.sellPrice) : "Not set"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Customer booking price
                  </p>
                </div>

                {/* Profit margin card */}
                <div
                  className={`rounded-xl border p-3.5 shadow-2xs transition-colors ${
                    !liveMarginCalc
                      ? "border-slate-200/80 bg-white"
                      : liveMarginCalc.isLoss
                        ? "border-red-200 bg-red-50/60"
                        : "border-emerald-200 bg-emerald-50/60"
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Profit Margin
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    {liveMarginCalc ? (
                      <>
                        <span
                          className={`text-xl font-extrabold ${
                            liveMarginCalc.isLoss ? "text-red-700" : "text-emerald-700"
                          }`}
                        >
                          {liveMarginCalc.grossProfit >= 0 ? "+" : ""}
                          {money(liveMarginCalc.grossProfit)}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            liveMarginCalc.isLoss ? "text-red-600" : "text-emerald-700"
                          }`}
                        >
                          ({liveMarginCalc.marginPct}%)
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Enter price to calculate</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {liveMarginCalc?.isLoss
                      ? "⚠️ Below wholesale stock cost"
                      : liveMarginCalc
                        ? "Calculated profit per unit"
                        : "Profit margin preview"}
                  </p>
                </div>
              </div>

              {/* Quick Markup Presets */}
              {stockWholesaleCost > 0 && (
                <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500">Quick Markup:</span>
                  <button
                    type="button"
                    onClick={() => updateField("sellPrice", String(stockWholesaleCost))}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-100"
                    title="Sell at exact wholesale cost"
                  >
                    At Cost ({money(stockWholesaleCost)})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "sellPrice",
                        String(Math.round(stockWholesaleCost * (1 + getActiveMarkupPercent() / 100)))
                      )
                    }
                    className="rounded-lg border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-900 shadow-2xs transition hover:bg-emerald-200"
                    title={`Apply active platform markup (+${getActiveMarkupPercent()}%)`}
                  >
                    System (+{getActiveMarkupPercent()}%) ({money(Math.round(stockWholesaleCost * (1 + getActiveMarkupPercent() / 100)))})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("sellPrice", String(Math.round(stockWholesaleCost * 1.15)))
                    }
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs transition hover:bg-emerald-100"
                    title="Add 15% profit margin"
                  >
                    +15% ({money(Math.round(stockWholesaleCost * 1.15))})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("sellPrice", String(Math.round(stockWholesaleCost * 1.25)))
                    }
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs transition hover:bg-emerald-100"
                    title="Add 25% profit margin"
                  >
                    +25% ({money(Math.round(stockWholesaleCost * 1.25))})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("sellPrice", String(Math.round(stockWholesaleCost * 1.35)))
                    }
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs transition hover:bg-emerald-100"
                    title="Add 35% profit margin"
                  >
                    +35% ({money(Math.round(stockWholesaleCost * 1.35))})
                  </button>
                </div>
              )}

              {/* Already Present Stock Metadata Details */}
              <div className="mt-3.5 grid gap-2 rounded-xl border border-slate-200/60 bg-white/90 p-3 text-xs sm:grid-cols-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-500">Scheduled:</span>
                  <span className="font-medium text-slate-800">
                    {form.itemType === "flight"
                      ? `${formatDateTime(activeStock.departureDate)} → ${formatDateTime(activeStock.arrivalDate)}`
                      : `In: ${formatDate(activeStock.checkIn)} · Out: ${formatDate(activeStock.checkOut)}`}
                  </span>
                </div>
                {form.itemType === "flight" && activeStock.cabinClass && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-500">Cabin Class:</span>
                    <span className="font-medium capitalize text-slate-800">
                      {activeStock.cabinClass}
                    </span>
                  </div>
                )}
                {form.itemType === "flight" && activeStock.nameAdditionDeadline && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-500">Name Deadline:</span>
                    <span className="font-medium text-slate-800">
                      {formatDate(activeStock.nameAdditionDeadline)}
                    </span>
                  </div>
                )}
                {form.itemType === "hotel" && activeStock.meals && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-500">Meal Plan:</span>
                    <span className="font-medium text-slate-800">
                      {Array.isArray(activeStock.meals) ? activeStock.meals.join(", ") : activeStock.meals}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Title"
              required
              placeholder="Direct Flight to Dubai — IndiGo Special"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
            <Input
              label="Destination"
              required
              placeholder="Dubai"
              value={form.destination}
              onChange={(event) => updateField("destination", event.target.value)}
            />
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Special non-stop flight from Delhi to Dubai with baggage allowance."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
            <Input
              label="Selling Price (₹)"
              type="number"
              min={1}
              required
              value={form.sellPrice}
              onChange={(event) => updateField("sellPrice", event.target.value)}
            />
            <Input
              label="Original Price (₹)"
              type="number"
              min={0}
              value={form.originalPrice}
              onChange={(event) => updateField("originalPrice", event.target.value)}
            />
            <Input
              label="Discount %"
              type="number"
              min={0}
              max={100}
              placeholder={discountPreview !== null ? `Auto: ${discountPreview}%` : "0"}
              value={form.discountPercentage}
              onChange={(event) => updateField("discountPercentage", event.target.value)}
            />
            <Input
              label="Units per Booking"
              type="number"
              min={1}
              value={form.unitsPerBooking}
              onChange={(event) => updateField("unitsPerBooking", event.target.value)}
            />
            <Input
              label="Start Date"
              type="datetime-local"
              value={form.startDate}
              onChange={(event) => updateField("startDate", event.target.value)}
            />
            <Input
              label="End Date"
              type="datetime-local"
              value={form.endDate}
              onChange={(event) => updateField("endDate", event.target.value)}
            />
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Inclusions <span className="font-normal text-slate-400">(one per line)</span>
              </label>
              <textarea
                rows={3}
                value={form.inclusions}
                onChange={(event) => updateField("inclusions", event.target.value)}
                placeholder={"7kg Cabin Baggage\n30kg Check-in Baggage"}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Terms &amp; Conditions <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={form.termsAndConditions}
                onChange={(event) => updateField("termsAndConditions", event.target.value)}
                placeholder="Non-refundable. Date change allowed up to 48 hours prior."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          {/* Media & Image Upload Section */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <CrmImageUploadSection
              images={form.images || []}
              onChange={(urls) => updateField("images", urls)}
              section="offers"
              maxImages={10}
              title="Offer Media & Gallery"
              subtitle="Upload promotional images for this offer. The first image serves as the primary cover."
              showCustomerNotice={true}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create Offer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Book for Customer Modal */}
      <Modal open={Boolean(bookTarget)} title="Book for Customer" onClose={() => setBookTarget(null)}>
        {bookTarget && (
          <form onSubmit={handleBook} className="space-y-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <b>{bookTarget.title}</b>
              <p className="mt-0.5 text-xs text-slate-500">
                {money(bookTarget.sellPrice)} per booking ·{" "}
                {bookTarget.availableBookings ?? bookTarget.availableUnits ?? 0} available
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Customer ID"
                required
                placeholder="66d4a8e2e944f7b6b199e111"
                value={bookForm.customerId}
                onChange={(event) =>
                  setBookForm((previous) => ({ ...previous, customerId: event.target.value }))
                }
              />
              <Input
                label="Quantity"
                type="number"
                min={1}
                required
                value={bookForm.quantity}
                onChange={(event) =>
                  setBookForm((previous) => ({ ...previous, quantity: event.target.value }))
                }
              />
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Payment Method</label>
                <select
                  value={bookForm.method}
                  onChange={(event) =>
                    setBookForm((previous) => ({ ...previous, method: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <Input
                label="Payment Reference"
                placeholder="NEFT-HDFC-991282"
                value={bookForm.referenceNumber}
                onChange={(event) =>
                  setBookForm((previous) => ({ ...previous, referenceNumber: event.target.value }))
                }
              />
            </div>

            <p className="text-xs text-slate-400">
              Direct bookings confirm immediately and mark the linked stock units as used.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setBookTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={bookMutation.isPending}>
                Confirm Booking
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal open={Boolean(cancelTarget)} title="Cancel Booking" onClose={() => setCancelTarget(null)}>
        <form onSubmit={handleCancelBooking} className="space-y-4">
          <p className="text-sm text-slate-600">
            Cancelling releases the reserved stock units back to the available pool. This cannot be
            undone.
          </p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Reason</span>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Customer requested cancellation per refund policy"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCancelTarget(null)}>
              Keep Booking
            </Button>
            <Button type="submit" variant="danger" loading={cancelMutation.isPending}>
              Cancel Booking
            </Button>
          </div>
        </form>
      </Modal>

      {/* Offer 360 Details Dossier Modal — GET /api/v1/crm/offers/:id */}
      <Modal open={Boolean(viewTargetId)} title="Retail Offer Dossier" onClose={() => setViewTargetId(null)} size="xl">
        {viewDetailQuery.isLoading && !viewOffer ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <p className="mt-3 text-sm font-medium">Loading live offer details from server...</p>
          </div>
        ) : viewOffer ? (
          <div className="space-y-6">
            {/* Top Action & Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                    viewOffer.itemType === "flight"
                      ? "bg-sky-100 text-sky-800 border border-sky-200"
                      : "bg-purple-100 text-purple-800 border border-purple-200"
                  }`}
                >
                  {viewOffer.itemType === "flight" ? <Ticket size={13} /> : <Hotel size={13} />}
                  <span className="capitalize">{viewOffer.itemType} Offer</span>
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                  <MapPin size={13} className="text-slate-400" />
                  {viewOffer.destination}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                    viewOffer.isActive
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      viewOffer.isActive ? "bg-emerald-600 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  {viewOffer.isActive ? "Active · Published" : "Paused · Hidden"}
                </span>

                <button
                  type="button"
                  onClick={() => copyOfferId(viewOffer.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
                  title="Click to copy Offer ID"
                >
                  {copiedId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>ID: {viewOffer.id?.slice(-8)}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleStatusMutation.mutate(viewOffer.id)}
                  disabled={toggleStatusMutation.isPending}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-2xs transition active:scale-95 ${
                    viewOffer.isActive
                      ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                  title="Toggle public visibility and booking capability (PATCH /api/v1/crm/offers/:id/toggle-status)"
                >
                  <Power size={13} className={viewOffer.isActive ? "text-amber-600" : "text-emerald-600"} />
                  <span>{viewOffer.isActive ? "Pause Offer" : "Activate Offer"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = viewOffer;
                    setViewTargetId(null);
                    openEditor(target);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-100 active:scale-95"
                  title="Modify pricing, descriptions, travel dates, or wholesale stock linkage"
                >
                  <RotateCw size={13} />
                  <span>Edit Offer</span>
                </button>
              </div>
            </div>

            {/* Media Gallery / Image Showcase */}
            {Array.isArray(viewOffer.images) && viewOffer.images.length > 0 ? (
              <div className="space-y-3">
                <div className="relative h-64 sm:h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-xs">
                  <img
                    src={viewOffer.images[activeImageIndex] || viewOffer.images[0]}
                    alt={viewOffer.title}
                    className="h-full w-full object-cover transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white pointer-events-none">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                        {viewOffer.itemType === "flight" ? "Flight Special" : "Hotel Special"}
                      </p>
                      <h3 className="text-lg font-bold text-white drop-shadow-sm">{viewOffer.title}</h3>
                    </div>
                    <span className="rounded-lg bg-black/60 backdrop-blur-xs px-2 py-1 text-xs font-bold text-white">
                      {activeImageIndex + 1} / {viewOffer.images.length}
                    </span>
                  </div>
                </div>

                {viewOffer.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {viewOffer.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                          activeImageIndex === idx
                            ? "border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                            : "border-slate-200 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute bottom-0 right-0 rounded-tl-md bg-emerald-700 px-1 text-[8px] font-bold text-white">
                            Cover
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-slate-100/60 p-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
                  {viewOffer.itemType === "flight" ? <Ticket size={24} /> : <Hotel size={24} />}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold text-slate-900">{viewOffer.title}</h3>
                  <p className="text-xs text-slate-500">
                    {viewOffer.destination} · {viewOffer.itemType === "flight" ? "Flight Offer" : "Hotel Offer"} · No promotional media attached
                  </p>
                </div>
              </div>
            )}

            {/* Title & Description */}
            {Array.isArray(viewOffer.images) && viewOffer.images.length > 0 && (
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{viewOffer.title}</h2>
                {viewOffer.description && (
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{viewOffer.description}</p>
                )}
              </div>
            )}

            {(!Array.isArray(viewOffer.images) || viewOffer.images.length === 0) && viewOffer.description && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm text-slate-600 leading-relaxed">
                {viewOffer.description}
              </div>
            )}

            {/* 6-Metric Financial & Stock Performance Grid */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Financial &amp; Margin Intelligence
                </span>
                {viewDetailQuery.isFetching && (
                  <span className="text-xs font-semibold text-emerald-700 animate-pulse">
                    Syncing live server metrics...
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {/* Sell Price */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Retail Sell Price
                  </span>
                  <div className="mt-1 text-lg font-extrabold text-slate-900 sm:text-xl">
                    {money(viewOffer.sellPrice)}
                  </div>
                  {Number(viewOffer.originalPrice) > Number(viewOffer.sellPrice) ? (
                    <p className="text-[11px] text-slate-400 line-through">{money(viewOffer.originalPrice)}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Current active rate</p>
                  )}
                </div>

                {/* Discount Rate */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Discount Rate
                  </span>
                  <div className="mt-1 text-lg font-extrabold text-emerald-700 sm:text-xl">
                    {Number(viewOffer.discountPercentage || 0) > 0 ? `${viewOffer.discountPercentage}%` : "0%"}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {Number(viewOffer.originalPrice) > Number(viewOffer.sellPrice)
                      ? "Off standard rate"
                      : "No discount applied"}
                  </p>
                </div>

                {/* Wholesale Cost Price */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Wholesale Cost
                  </span>
                  <div className="mt-1 text-lg font-extrabold text-slate-700 sm:text-xl">
                    {viewOffer.costPrice ? money(viewOffer.costPrice) : "—"}
                  </div>
                  <p className="text-[11px] text-slate-400">Procurement per unit</p>
                </div>

                {/* Gross Profit */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Gross Margin
                  </span>
                  <div className="mt-1 text-lg font-extrabold text-emerald-800 sm:text-xl">
                    {viewOffer.grossProfit !== undefined ? `+${money(viewOffer.grossProfit)}` : "—"}
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-700">Profit per booking</p>
                </div>

                {/* Profit Margin % */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Margin %
                  </span>
                  <div className="mt-1 text-lg font-extrabold text-emerald-800 sm:text-xl">
                    {viewOffer.profitMarginPercentage !== undefined ? `${viewOffer.profitMarginPercentage}%` : "—"}
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-700">Return on retail</p>
                </div>

                {/* Available Bookings */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Live Inventory
                  </span>
                  <div
                    className={`mt-1 text-lg font-extrabold sm:text-xl ${
                      Number(viewOffer.availableBookings ?? viewOffer.availableUnits ?? 0) === 0
                        ? "text-red-600"
                        : "text-emerald-700"
                    }`}
                  >
                    {viewOffer.availableBookings ?? viewOffer.availableUnits ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {viewOffer.unitsPerBooking ?? 1} {viewOffer.itemType === "flight" ? "seat(s)" : "room(s)"} / book
                  </p>
                </div>
              </div>
            </div>

            {/* Wholesale Stock Linkage Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 via-white to-emerald-50/30 p-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-2xs">
                    {viewOffer.itemType === "flight" ? <Ticket size={16} /> : <Hotel size={16} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Linked Wholesale Stock Allotment
                    </h4>
                    <p className="text-xs text-slate-500">
                      {viewOffer.itemType === "flight" ? "Wholesale TicketStock Batch" : "Wholesale HotelStock Batch"}
                    </p>
                  </div>
                </div>

                {activeViewStock && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 size={12} />
                    {activeViewStock.availableUnits ?? 0} units remaining
                  </span>
                )}
              </div>

              {activeViewStock ? (
                <div className="mt-3.5 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  {viewOffer.itemType === "flight" ? (
                    <>
                      <div className="rounded-xl border border-slate-200/70 bg-white p-3">
                        <span className="text-[10px] font-semibold uppercase text-slate-400">Flight &amp; Airline</span>
                        <p className="mt-0.5 text-sm font-bold text-slate-900">
                          {activeViewStock.airline || "Airline"} {activeViewStock.flightNumber || ""}
                        </p>
                        <p className="text-xs text-slate-500">PNR: {activeViewStock.pnr || "—"}</p>
                      </div>

                      <div className="rounded-xl border border-slate-200/70 bg-white p-3">
                        <span className="text-[10px] font-semibold uppercase text-slate-400">Route</span>
                        <p className="mt-0.5 text-sm font-bold text-slate-900">
                          {activeViewStock.origin || "Origin"} → {activeViewStock.destination || "Destination"}
                        </p>
                        <p className="text-xs capitalize text-slate-500">{activeViewStock.cabinClass || "Economy"} Class</p>
                      </div>

                      <div className="rounded-xl border border-slate-200/70 bg-white p-3">
                        <span className="text-[10px] font-semibold uppercase text-slate-400">Flight Schedule</span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-800">
                          Dep: {formatDateTime(activeViewStock.departureDate)}
                        </p>
                        <p className="text-xs font-semibold text-slate-800">
                          Arr: {formatDateTime(activeViewStock.arrivalDate)}
                        </p>
                      </div>

                      {activeViewStock.nameAdditionDeadline && (
                        <div className="rounded-xl border border-slate-200/70 bg-white p-3 sm:col-span-2 lg:col-span-3">
                          <span className="text-[10px] font-semibold uppercase text-slate-400">Passenger Name Deadline</span>
                          <p className="mt-0.5 font-medium text-slate-800">
                            Names must be submitted before {formatDate(activeViewStock.nameAdditionDeadline)}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="rounded-xl border border-slate-200/70 bg-white p-3">
                        <span className="text-[10px] font-semibold uppercase text-slate-400">Hotel Name</span>
                        <p className="mt-0.5 text-sm font-bold text-slate-900">{activeViewStock.hotelName || "Hotel"}</p>
                        <p className="text-xs text-slate-500">{activeViewStock.destination || ""}</p>
                      </div>

                      <div className="rounded-xl border border-slate-200/70 bg-white p-3">
                        <span className="text-[10px] font-semibold uppercase text-slate-400">Room &amp; Meal Plan</span>
                        <p className="mt-0.5 text-sm font-bold text-slate-900">{activeViewStock.roomType || "Standard Room"}</p>
                        <p className="text-xs text-slate-500">
                          {Array.isArray(activeViewStock.meals)
                            ? activeViewStock.meals.join(", ")
                            : activeViewStock.meals || "Room Only"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200/70 bg-white p-3">
                        <span className="text-[10px] font-semibold uppercase text-slate-400">Allotment Stay Dates</span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-800">
                          Check-in: {formatDate(activeViewStock.checkIn)}
                        </p>
                        <p className="text-xs font-semibold text-slate-800">
                          Check-out: {formatDate(activeViewStock.checkOut)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-slate-200/60 bg-white p-3 text-xs text-slate-500">
                  Linked Stock ID: <code className="font-mono font-bold text-slate-700">{viewStockId || "—"}</code>
                </div>
              )}
            </div>

            {/* Travel Dates & Validity */}
            {(viewOffer.startDate || viewOffer.endDate) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Travel Validity Period</h4>
                <div className="mt-2.5 flex flex-wrap items-center gap-4 text-sm text-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-700" />
                    <span className="text-xs text-slate-500">Valid From:</span>
                    <span className="font-semibold">{formatDateTime(viewOffer.startDate)}</span>
                  </div>
                  <span className="text-slate-300">→</span>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-emerald-700" />
                    <span className="text-xs text-slate-500">Valid Until:</span>
                    <span className="font-semibold">{formatDateTime(viewOffer.endDate)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Inclusions */}
            {Array.isArray(viewOffer.inclusions) && viewOffer.inclusions.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Offer Inclusions &amp; Highlights</h4>
                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  {viewOffer.inclusions.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-900"
                    >
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terms & Conditions */}
            {viewOffer.termsAndConditions && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Shield size={15} className="text-slate-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Terms &amp; Conditions</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 whitespace-pre-line">
                  {viewOffer.termsAndConditions}
                </p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => toggleStatusMutation.mutate(viewOffer.id)}
                  loading={toggleStatusMutation.isPending}
                  title="Toggle offer status"
                >
                  <Power size={15} className={viewOffer.isActive ? "text-amber-600" : "text-emerald-600"} />
                  {viewOffer.isActive ? "Pause Offer" : "Activate Offer"}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const target = viewOffer;
                    setViewTargetId(null);
                    setBookTarget(target);
                  }}
                  disabled={Number(viewOffer.availableBookings ?? viewOffer.availableUnits ?? 0) === 0}
                  title="Direct walk-in or phone booking"
                >
                  <Wallet size={15} />
                  Book for Customer
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => setViewTargetId(null)}>
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const target = viewOffer;
                    setViewTargetId(null);
                    openEditor(target);
                  }}
                >
                  <RotateCw size={15} />
                  Edit Offer
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Edit Offer Modal — GET /api/v1/crm/offers/:id to load, PATCH to submit */}
      <Modal open={Boolean(editTarget)} title="Edit Retail Offer" onClose={() => setEditTarget(null)} size="xl">
        <form onSubmit={submitEdit} className="space-y-4">
          {editDetailQuery.isFetching && (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Loading latest offer details…</p>
          )}
          {editDetailQuery.data && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Live stock: <b>{editDetailQuery.data.availableBookings ?? editDetailQuery.data.availableUnits ?? 0}</b> bookings
              {" "}· cost {money(editDetailQuery.data.costPrice)} · margin {editDetailQuery.data.profitMarginPercentage ?? 0}%
            </p>
          )}

          {/* Wholesale Stock Linkage & Batch Selector */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Wholesale Stock Linkage ({editForm.itemType === "flight" ? "TicketStock" : "HotelStock"})
                </span>
                <p className="text-xs text-slate-400">
                  Optionally modify the wholesale stock batch linked to this offer
                </p>
              </div>
              {stockPickerQuery.isFetching && (
                <span className="text-xs font-semibold text-emerald-700 animate-pulse">Loading stock batches...</span>
              )}
            </div>

            <div className="mt-3">
              <select
                value={editForm.stock}
                onChange={(event) => handleEditStockSelect(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              >
                <option value="">— Keep currently linked stock batch —</option>
                {editStocks.map((stock) => {
                  const id = stock._id ?? stock.id;
                  return (
                    <option key={id} value={id}>
                      {editForm.itemType === "flight" ? flightStockLabel(stock) : hotelStockLabel(stock)}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Active Stock Breakdown & Margin in Edit Modal */}
            {(activeEditStock || editStockWholesaleCost > 0) && (
              <div className="mt-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-2xs">
                      {editForm.itemType === "flight" ? <Ticket size={14} /> : <Hotel size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {activeEditStock
                          ? editForm.itemType === "flight"
                            ? `${activeEditStock.airline || ""} ${activeEditStock.flightNumber || ""} · ${activeEditStock.origin || ""} → ${activeEditStock.destination || ""}`
                            : `${activeEditStock.hotelName || "Hotel"} · ${activeEditStock.roomType || ""}`
                          : "Linked wholesale stock allotment"}
                      </p>
                    </div>
                  </div>

                  {activeEditStock && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {activeEditStock.availableUnits ?? 0} available
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Wholesale Cost</span>
                    <div className="mt-0.5 text-base font-extrabold text-slate-800">
                      {editStockWholesaleCost > 0 ? money(editStockWholesaleCost) : "—"}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Selling Price</span>
                    <div className="mt-0.5 text-base font-extrabold text-slate-800">
                      {editForm.sellPrice ? money(editForm.sellPrice) : "Not set"}
                    </div>
                  </div>

                  <div
                    className={`rounded-lg border p-2.5 ${
                      !editLiveMarginCalc
                        ? "border-slate-200/80 bg-white"
                        : editLiveMarginCalc.isLoss
                          ? "border-red-200 bg-red-50/70"
                          : "border-emerald-200 bg-emerald-50/70"
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Margin</span>
                    <div className="mt-0.5 text-base font-extrabold">
                      {editLiveMarginCalc ? (
                        <span className={editLiveMarginCalc.isLoss ? "text-red-700" : "text-emerald-700"}>
                          {editLiveMarginCalc.grossProfit >= 0 ? "+" : ""}
                          {money(editLiveMarginCalc.grossProfit)} ({editLiveMarginCalc.marginPct}%)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Enter price</span>
                      )}
                    </div>
                  </div>
                </div>

                {editStockWholesaleCost > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-slate-500">Quick Markup:</span>
                    <button
                      type="button"
                      onClick={() => updateEditField("sellPrice", String(editStockWholesaleCost))}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      At Cost ({money(editStockWholesaleCost)})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateEditField(
                          "sellPrice",
                          String(Math.round(editStockWholesaleCost * (1 + getActiveMarkupPercent(editForm.itemType) / 100)))
                        )
                      }
                      className="rounded-lg border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-900 hover:bg-emerald-200"
                      title={`Apply active platform markup (+${getActiveMarkupPercent(editForm.itemType)}%)`}
                    >
                      System (+{getActiveMarkupPercent(editForm.itemType)}%) ({money(Math.round(editStockWholesaleCost * (1 + getActiveMarkupPercent(editForm.itemType) / 100)))})
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEditField("sellPrice", String(Math.round(editStockWholesaleCost * 1.15)))}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      +15% ({money(Math.round(editStockWholesaleCost * 1.15))})
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEditField("sellPrice", String(Math.round(editStockWholesaleCost * 1.25)))}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      +25% ({money(Math.round(editStockWholesaleCost * 1.25))})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Title"
              required
              value={editForm.title}
              onChange={(event) => updateEditField("title", event.target.value)}
            />
            <Input
              label="Destination"
              required
              value={editForm.destination}
              onChange={(event) => updateEditField("destination", event.target.value)}
            />
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
              <textarea
                rows={2}
                value={editForm.description}
                onChange={(event) => updateEditField("description", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
            <Input
              label="Selling Price (₹)"
              type="number"
              min={1}
              required
              value={editForm.sellPrice}
              onChange={(event) => updateEditField("sellPrice", event.target.value)}
            />
            <Input
              label="Original Price (₹)"
              type="number"
              min={0}
              value={editForm.originalPrice}
              onChange={(event) => updateEditField("originalPrice", event.target.value)}
            />
            <Input
              label="Discount %"
              type="number"
              min={0}
              max={100}
              value={editForm.discountPercentage}
              onChange={(event) => updateEditField("discountPercentage", event.target.value)}
            />
            <Input
              label="Units per Booking"
              type="number"
              min={1}
              value={editForm.unitsPerBooking}
              onChange={(event) => updateEditField("unitsPerBooking", event.target.value)}
            />
            <Input
              label="Start Date"
              type="datetime-local"
              value={editForm.startDate}
              onChange={(event) => updateEditField("startDate", event.target.value)}
            />
            <Input
              label="End Date"
              type="datetime-local"
              value={editForm.endDate}
              onChange={(event) => updateEditField("endDate", event.target.value)}
            />
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Inclusions <span className="font-normal text-slate-400">(one per line)</span>
              </label>
              <textarea
                rows={3}
                value={editForm.inclusions}
                onChange={(event) => updateEditField("inclusions", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Terms &amp; Conditions <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={editForm.termsAndConditions}
                onChange={(event) => updateEditField("termsAndConditions", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          {/* Media & Image Upload Section */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <CrmImageUploadSection
              images={editForm.images || []}
              onChange={(urls) => updateEditField("images", urls)}
              section="offers"
              itemId={editTarget?._id ?? editTarget?.id}
              maxImages={10}
              title="Offer Media & Gallery"
              subtitle="Add or reorder images for this retail offer. The first image serves as the primary cover."
              showCustomerNotice={true}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

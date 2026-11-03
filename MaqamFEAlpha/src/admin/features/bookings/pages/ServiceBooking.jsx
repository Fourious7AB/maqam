import { useEffect, useMemo, useState } from "react";
import {
  Plane,
  Hotel,
  Car,
  UtensilsCrossed,
  Stamp,
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  BadgeCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import TravelerList, {
  newTraveler,
} from "../../../components/bookings/TravelerList";

import formatCurrency from "../../../utils/formatCurrency";
import { bookingsApi } from "../bookingsApi";
import DigitalBoardingPass from "../../../../components/flight/DigitalBoardingPass";
import OmnichannelAlertStatus from "../../../../components/notifications/OmnichannelAlertStatus";

// ------------------------------------------------------------------
// Dynamic single-service booking wizard.
// Lets a customer book ONE standalone service (flight / hotel / cab /
// meal / visa) -- no package required -- with quote, payment and an
// immediately-confirmed booking (mirrors the package flow, spec C).
// ------------------------------------------------------------------

const SERVICE_TYPES = [
  { value: "flight", label: "Flight", icon: Plane },
  { value: "hotel", label: "Hotel Stay", icon: Hotel },
  { value: "cab", label: "Cab Transfer", icon: Car },
  { value: "meal", label: "Meals", icon: UtensilsCrossed },
  { value: "visa", label: "Visa", icon: Stamp },
];

const STEPS = ["Service & Quote", "Travelers", "Payment", "Confirmation"];

export default function ServiceBooking() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);

  const [catalog, setCatalog] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [type, setType] = useState("flight");
  const [serviceId, setServiceId] = useState("");
  const [units, setUnits] = useState(1);
  const [customerId, setCustomerId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [quote, setQuote] = useState(null);
  const [travelers, setTravelers] = useState([newTraveler()]);
  const [validated, setValidated] = useState(false);

  const [payment, setPayment] = useState({
    method: "bank_transfer",
    referenceNumber: "",
    notes: "",
  });
  const [booking, setBooking] = useState(null);

  // ------------------------------------------------------------
  // Load catalog + customers
  // ------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [catalogResponse, customerResponse] = await Promise.all([
          bookingsApi.listServiceCatalog(),
          bookingsApi.listCustomers(),
        ]);
        if (!mounted) return;
        setCatalog(catalogResponse?.data || []);
        setCustomers(customerResponse?.data || []);
      } catch (error) {
        if (mounted) setMessage(error?.message || "Unable to load services.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // ------------------------------------------------------------
  // Catalog filtered by selected service type
  // ------------------------------------------------------------
  const filteredCatalog = useMemo(
    () => catalog.filter((service) => service.type === type),
    [catalog, type]
  );

  const selectedService = useMemo(
    () => filteredCatalog.find((service) => service.id === serviceId),
    [filteredCatalog, serviceId]
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId),
    [customers, customerId]
  );

  // ------------------------------------------------------------
  // Step 0: Quote
  // ------------------------------------------------------------
  const getQuote = async () => {
    setSaving(true);
    setMessage("");

    try {
      if (!serviceId) {
        setMessage("Please select a service.");
        return;
      }
      if (!customerId) {
        setMessage("Please select a customer.");
        return;
      }

      const result = await bookingsApi.quoteService({
        serviceId,
        units: Number(units || 1),
      });

      setQuote(result);
      setTravelers(
        Array.from({ length: Number(units || 1) }, (_, i) => travelers[i] || newTraveler())
      );
      setMessage("Quote ready. Continue to travelers.");
    } catch (error) {
      setMessage(error?.message || "Unable to get quote.");
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // Step 1: Validate travelers
  // ------------------------------------------------------------
  const validateTravelers = async () => {
    setSaving(true);
    setMessage("");

    try {
      const result = await bookingsApi.validateTravelers({
        travelers: travelers.slice(0, Number(units || 1)),
      });

      if (!result?.valid) {
        setMessage((result?.errors || ["Traveler validation failed."]).join(" "));
        return;
      }

      setValidated(true);
      setStep(2);
    } catch (error) {
      setMessage(error?.message || "Unable to validate travelers.");
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // Step 2: Book + Payment (one transaction, spec C contract)
  // ------------------------------------------------------------
  const confirmBooking = async () => {
    setSaving(true);
    setMessage("");

    try {
      if (!validated) {
        setMessage("Travelers must be validated before payment.");
        setStep(1);
        return;
      }
      if (!quote?.total) {
        setMessage("Booking price is unavailable.");
        setStep(0);
        return;
      }

      const confirmed = await bookingsApi.bookService({
        serviceId,
        serviceType: quote.serviceType,
        serviceName: quote.serviceName,
        customerId,
        customerName: selectedCustomer?.name || "Customer",
        units: Number(units || 1),
        unit: quote.unit,
        totalAmount: quote.total,
        travelDate: quote?.travelDate || "",
        travellers: travelers
          .slice(0, Number(units || 1))
          .map((traveler, index) => ({
            ...traveler,
            isLead: index === 0,
          })),
        payment: {
          method: payment.method || "bank_transfer",
          referenceNumber:
            payment.referenceNumber || `TXN-${Date.now()}`,
          notes:
            payment.notes ||
            `${quote.serviceName}${selectedCustomer?.name ? ` for ${selectedCustomer.name}` : ""}`,
        },
        serviceSnapshot: {
          serviceId,
          serviceName: quote.serviceName,
          provider: selectedService?.provider || null,
          unitPrice: quote.unitPrice,
          units: Number(units || 1),
          subtotal: quote.subtotal,
          discount: quote.discount,
          taxes: quote.taxes,
          total: quote.total,
          capturedAt: new Date().toISOString(),
        },
      });

      setBooking(confirmed);
      setStep(3);
    } catch (error) {
      setMessage(error?.message || "Payment or booking confirmation failed.");
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------
  if (loading) {
    return <LoadingSpinner />;
  }

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title="Book a Service"
        subtitle="Book any standalone service -- flight, hotel stay, cab transfer, meals or visa -- without a package."
        actions={
          <Button
            variant="secondary"
            onClick={() => navigate("/admin/bookings")}
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        }
      />

      {/* Stepper */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={`
                flex min-w-max items-center gap-2
                rounded-xl px-3 py-2
                text-xs font-bold
                ${
                  index === step
                    ? "bg-emerald-700 text-white"
                    : index < step
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-50 text-slate-400"
                }
              `}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/70">
                {index < step ? <Check size={13} /> : index + 1}
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        {/* MAIN */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* ================================================ */}
          {/* STEP 0: SERVICE & QUOTE                          */}
          {/* ================================================ */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Select a Service
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose the service type, then pick the exact service to book.
                </p>
              </div>

              {/* Service type selector */}
              <div className="flex flex-wrap gap-2">
                {SERVICE_TYPES.map((serviceType) => {
                  const Icon = serviceType.icon;
                  const active = serviceType.value === type;
                  return (
                    <button
                      key={serviceType.value}
                      onClick={() => {
                        setType(serviceType.value);
                        setServiceId("");
                        setQuote(null);
                      }}
                      className={`
                        flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold
                        ${
                          active
                            ? "bg-emerald-700 text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }
                      `}
                    >
                      <Icon size={15} />
                      {serviceType.label}
                    </button>
                  );
                })}
              </div>

              {/* Catalog list */}
              <div className="space-y-2">
                {filteredCatalog.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
                    No services available for this type yet.
                  </p>
                )}
                {filteredCatalog.map((service) => {
                  const active = service.id === serviceId;
                  return (
                    <button
                      key={service.id}
                      onClick={() => {
                        setServiceId(service.id);
                        setQuote(null);
                      }}
                      className={`
                        w-full rounded-2xl border p-4 text-left transition
                        ${
                          active
                            ? "border-emerald-600 bg-emerald-50"
                            : "border-slate-200 hover:border-emerald-300"
                        }
                      `}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-800">
                            {service.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {service.provider} - {service.id}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-700">
                            {formatCurrency(service.retailPrice)}
                          </p>
                          <p className="text-xs text-slate-400">
                            per {service.unitLabel}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Customer + quantity */}
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Customer
                  </span>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {selectedService ? `Quantity (${selectedService.unitLabel})` : "Quantity"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={units}
                    onChange={(e) => setUnits(Math.max(1, Number(e.target.value || 1)))}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </label>

                <div className="flex items-end">
                  <Button
                    loading={saving}
                    onClick={getQuote}
                    className="h-11 w-full"
                  >
                    <BadgeCheck size={16} />
                    Get Quote
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================ */}
          {/* STEP 1: TRAVELERS                                */}
          {/* ================================================ */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Traveler Information
                </h2>
                <p className="mt-1 text-sm text-sm text-slate-500">
                  {units} traveler(s) for this booking.
                </p>
              </div>

              <TravelerList
                travelers={travelers.slice(0, Number(units || 1))}
                onChange={setTravelers}
              />

              <div className="flex justify-between">
                <Button
                  variant="secondary"
                  onClick={() => setStep(0)}
                >
                  <ArrowLeft size={16} />
                  Previous
                </Button>

                <Button loading={saving} onClick={validateTravelers}>
                  Validate Travelers
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* ================================================ */}
          {/* STEP 2: PAYMENT                                  */}
          {/* ================================================ */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Payment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Booking is confirmed as soon as the payment is recorded.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Payment Method
                  </span>
                  <select
                    value={payment.method}
                    onChange={(e) =>
                      setPayment((p) => ({ ...p, method: e.target.value }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Reference Number
                  </span>
                  <input
                    placeholder="Auto-generated if empty"
                    value={payment.referenceNumber}
                    onChange={(e) =>
                      setPayment((p) => ({ ...p, referenceNumber: e.target.value }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </label>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="secondary"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} />
                  Previous
                </Button>

                <Button loading={saving} onClick={confirmBooking}>
                  <CreditCard size={16} />
                  Record Payment & Confirm
                </Button>
              </div>
            </div>
          )}

          {/* ================================================ */}
          {/* STEP 3: CONFIRMATION                             */}
          {/* ================================================ */}
          {step === 3 && (
            <div className="space-y-5 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Check size={30} />
              </span>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Booking Confirmed
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {quote?.serviceName} confirmed for {selectedCustomer?.name || "customer"}.
                </p>
              </div>

              <div className="mx-auto max-w-md rounded-2xl border border-slate-200 p-4 text-left">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-400">Booking Number</span>
                  <span className="font-bold text-slate-800">
                    {booking?.bookingNumber || booking?.id}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-400">Payment</span>
                  <span className="font-bold text-emerald-600">
                    {booking?.payment?.status || "paid"} - {formatCurrency(quote.total)}
                  </span>
                </div>
              </div>

              {(type === "flight" || quote?.serviceType === "flight") && (
                <div className="pt-2 flex flex-col items-center">
                  <div className="text-left w-full max-w-[400px] pb-2">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Generated Passenger Boarding Pass
                    </p>
                  </div>
                  <DigitalBoardingPass
                    booking={booking}
                    flight={booking?.flight || quote?.serviceDetails || { airline: quote?.serviceName, flightNumber: quote?.flightNumber || "6E 6819" }}
                    pnr={booking?.bookingNumber || "B4K68K"}
                    passengers={travelers.map((t, idx) => ({
                      firstName: t.firstName || "Passenger",
                      lastName: t.lastName || "",
                      seat: `${3 + idx}F`,
                      seatNumber: `${3 + idx}F`,
                    }))}
                    showActions={true}
                  />
                </div>
              )}

              {/* Omnichannel Dispatch Status (Email, WhatsApp, SMS) */}
              <div className="pt-2 w-full max-w-xl mx-auto text-left">
                <OmnichannelAlertStatus
                  bookingId={booking?.bookingNumber || booking?.id}
                  bookingType={quote?.serviceType || type || 'flight'}
                  pnr={booking?.bookingNumber || "B4K68K"}
                  recipientEmail={selectedCustomer?.email || "customer@maqamtravels.com"}
                  recipientPhone={selectedCustomer?.phone || "+91 9876543210"}
                  isAdmin={true}
                />
              </div>

              <div className="flex justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStep(0);
                    setBooking(null);
                    setQuote(null);
                    setValidated(false);
                  }}
                >
                  Book Another Service
                </Button>
                <Button onClick={() => navigate("/admin/bookings")}>
                  View All Bookings
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* SIDEBAR: PRICE SUMMARY */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Price Summary</h3>

          {!quote && (
            <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
              Select a service and press Get Quote to see the price breakdown.
            </p>
          )}

          {quote && (
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl border border-slate-200 p-3 text-sm">
                <p className="font-bold text-slate-800">{quote.serviceName}</p>
                <p className="text-xs text-slate-400">
                  {quote.units} x {quote.unit} - {formatCurrency(quote.unitPrice)} each
                </p>
              </div>

              {Object.entries({
                Retail: quote.breakdown.retail,
                Discount: quote.breakdown.discount,
                Taxes: quote.breakdown.taxes,
              }).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-1 text-sm"
                >
                  <span className="text-slate-400">{label}</span>
                  <span
                    className={
                      value < 0 ? "font-semibold text-emerald-600" : "font-semibold text-slate-600"
                    }
                  >
                    {formatCurrency(value)}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                <span className="font-bold text-emerald-800">Total</span>
                <span className="font-bold text-emerald-800">
                  {formatCurrency(quote.total)}
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

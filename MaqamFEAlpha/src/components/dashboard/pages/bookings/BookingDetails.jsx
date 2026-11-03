import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  User,
  XCircle,
  LoaderCircle,
  Plane,
  Hotel,
  Car,
  Package,
  Hash,
  ReceiptText,
} from "lucide-react";

import StatusBadge from "../../../../common/StatusBadge";

import {
  fetchBookingById,
  clearSelectedBooking,
} from "../../../../features/bookings/bookingsSlice";

const BookingDetails = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();

  /*
  |--------------------------------------------------------------------------
  | Redux
  |--------------------------------------------------------------------------
  */

  const {
    selectedBooking,
    detailsLoading,
    detailsError,
  } = useSelector((state) => state.bookings);

  const dispatch = useDispatch();

  /*
  |--------------------------------------------------------------------------
  | Fetch Booking
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingById(bookingId));
    }

    return () => {
      dispatch(clearSelectedBooking());
    };
  }, [dispatch, bookingId]);

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  const getInitials = (name = "") => {
    return (
      name
        .trim()
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U"
    );
  };

  const getServiceIcon = (type) => {
    switch (type) {
      case "Flight":
        return <Plane size={20} />;

      case "Hotel":
        return <Hotel size={20} />;

      case "Cab":
        return <Car size={20} />;

      case "Package":
        return <Package size={20} />;

      default:
        return <ReceiptText size={20} />;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (detailsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">

        <div className="mx-auto flex min-h-[500px] max-w-[1400px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col items-center">

            <LoaderCircle
              size={34}
              className="animate-spin text-indigo-600"
            />

            <p className="mt-3 text-sm font-medium text-slate-500">
              Loading booking details...
            </p>

          </div>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Error
  |--------------------------------------------------------------------------
  */

  if (detailsError) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">

        <div className="mx-auto max-w-[1400px]">

          <button
            type="button"
            onClick={() => navigate("/bookings")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
          >
            <ArrowLeft size={18} />
            Back to Bookings
          </button>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">

            <div className="flex items-start gap-3">

              <XCircle
                size={22}
                className="mt-0.5 text-red-600"
              />

              <div>

                <h2 className="font-semibold text-red-800">
                  Unable to load booking
                </h2>

                <p className="mt-1 text-sm text-red-600">
                  {detailsError}
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Booking Not Found
  |--------------------------------------------------------------------------
  */

  if (!selectedBooking) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">

        <div className="mx-auto max-w-[1400px]">

          <button
            type="button"
            onClick={() => navigate("/bookings")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
          >
            <ArrowLeft size={18} />
            Back to Bookings
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Booking not found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              The requested booking could not be found.
            </p>

          </div>

        </div>

      </div>
    );
  }

  const booking = selectedBooking;

  /*
  |--------------------------------------------------------------------------
  | Main UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-6">

      <div className="mx-auto max-w-[1400px]">

        {/* =========================================================
            BACK BUTTON
        ========================================================= */}

        <button
          type="button"
          onClick={() => navigate("/bookings")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
        >
          <ArrowLeft size={18} />
          Back to Bookings
        </button>

        {/* =========================================================
            HEADER
        ========================================================= */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                {getServiceIcon(booking.type)}
              </div>

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    Booking {booking.id}
                  </h1>

                  <StatusBadge
                    status={booking.status}
                  />

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Created on {booking.bookingDate}
                </p>

              </div>

            </div>

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-slate-50 px-4 py-3">

                <p className="text-xs text-slate-400">
                  Booking ID
                </p>

                <p className="mt-0.5 text-sm font-bold text-slate-800">
                  {booking.id}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* =========================================================
            CUSTOMER + BOOKING SUMMARY
        ========================================================= */}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* Customer */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center gap-2">

              <User
                size={19}
                className="text-indigo-600"
              />

              <h2 className="font-bold text-slate-900">
                Customer Information
              </h2>

            </div>

            {/* Avatar */}

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                {getInitials(
                  booking.userName
                )}
              </div>

              <div>

                <p className="font-semibold text-slate-900">
                  {booking.userName}
                </p>

                <p className="text-xs text-slate-400">
                  {booking.userId}
                </p>

              </div>

            </div>

            {/* Contact */}

            <div className="mt-5 space-y-3">

              {booking.email && (
                <InfoRow
                  icon={<Mail size={17} />}
                  label="Email"
                  value={booking.email}
                />
              )}

              {booking.phone && (
                <InfoRow
                  icon={<Phone size={17} />}
                  label="Phone"
                  value={booking.phone}
                />
              )}

              <InfoRow
                icon={<Hash size={17} />}
                label="User ID"
                value={booking.userId}
              />

            </div>

          </div>

          {/* Service */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center gap-2">

              <ReceiptText
                size={19}
                className="text-indigo-600"
              />

              <h2 className="font-bold text-slate-900">
                Booking Information
              </h2>

            </div>

            <div className="space-y-4">

              <DetailItem
                label="Service"
                value={booking.service}
              />

              <DetailItem
                label="Service Type"
                value={booking.type}
              />

              <DetailItem
                label="Booking Date"
                value={booking.bookingDate}
              />

              <DetailItem
                label="Travel Date"
                value={booking.travelDate}
              />

              <DetailItem
                label="Booking Status"
                value={
                  <StatusBadge
                    status={booking.status}
                  />
                }
              />

            </div>

          </div>

          {/* Payment */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center gap-2">

              <CreditCard
                size={19}
                className="text-indigo-600"
              />

              <h2 className="font-bold text-slate-900">
                Payment Information
              </h2>

            </div>

            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Total Amount
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatAmount(
                  booking.amount
                )}
              </p>

            </div>

            <div className="mt-5">

              <DetailItem
                label="Payment Status"
                value={booking.payment}
              />

            </div>

          </div>

        </div>

        {/* =========================================================
            TRAVEL INFORMATION
        ========================================================= */}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-6 flex items-center gap-2">

            <MapPin
              size={19}
              className="text-indigo-600"
            />

            <h2 className="font-bold text-slate-900">
              Travel Information
            </h2>

          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <TravelCard
              icon={<CalendarDays size={19} />}
              label="Booking Date"
              value={booking.bookingDate}
            />

            <TravelCard
              icon={<CalendarDays size={19} />}
              label="Travel Date"
              value={booking.travelDate}
            />

            <TravelCard
              icon={getServiceIcon(booking.type)}
              label="Service"
              value={booking.service}
            />

            <TravelCard
              icon={<CheckCircle2 size={19} />}
              label="Status"
              value={booking.status}
            />

          </div>

        </div>

        {/* =========================================================
            STATUS TIMELINE
        ========================================================= */}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-6 flex items-center gap-2">

            <Clock3
              size={19}
              className="text-indigo-600"
            />

            <h2 className="font-bold text-slate-900">
              Booking Timeline
            </h2>

          </div>

          <div className="space-y-5">

            <TimelineItem
              title="Booking Created"
              description={`Booking ${booking.id} was created.`}
              date={booking.bookingDate}
              active
            />

            <TimelineItem
              title="Payment Status"
              description={`Payment status is ${booking.payment}.`}
              date={booking.bookingDate}
              active={
                booking.payment === "Paid"
              }
            />

            <TimelineItem
              title="Booking Status"
              description={`Current booking status is ${booking.status}.`}
              date={booking.travelDate}
              active={
                booking.status === "Confirmed" ||
                booking.status === "Completed"
              }
              last
            />

          </div>

        </div>

      </div>
    </div>
  );
};

/* =====================================================================
   INFO ROW
===================================================================== */

const InfoRow = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="flex items-start gap-3">

      <div className="mt-0.5 text-slate-400">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-xs text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 break-words text-sm font-medium text-slate-700">
          {value}
        </p>

      </div>

    </div>
  );
};

/* =====================================================================
   DETAIL ITEM
===================================================================== */

const DetailItem = ({
  label,
  value,
}) => {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">

      <span className="text-sm text-slate-400">
        {label}
      </span>

      <span className="text-sm font-semibold text-slate-700">
        {value}
      </span>

    </div>
  );
};

/* =====================================================================
   TRAVEL CARD
===================================================================== */

const TravelCard = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

      <div className="flex items-center gap-2 text-indigo-600">
        {icon}

        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-800">
        {value}
      </p>

    </div>
  );
};

/* =====================================================================
   TIMELINE ITEM
===================================================================== */

const TimelineItem = ({
  title,
  description,
  date,
  active = false,
  last = false,
}) => {
  return (
    <div className="flex gap-4">

      <div className="flex flex-col items-center">

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            active
              ? "bg-emerald-100 text-emerald-600"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {active ? (
            <CheckCircle2 size={18} />
          ) : (
            <Clock3 size={18} />
          )}
        </div>

        {!last && (
          <div className="mt-2 h-full min-h-8 w-px bg-slate-200" />
        )}

      </div>

      <div className="pb-5">

        <div className="flex flex-wrap items-center gap-2">

          <h3 className="font-semibold text-slate-800">
            {title}
          </h3>

          {active && (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              Completed
            </span>
          )}

        </div>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>

        {date && (
          <p className="mt-1 text-xs text-slate-400">
            {date}
          </p>
        )}

      </div>

    </div>
  );
};

export default BookingDetails;
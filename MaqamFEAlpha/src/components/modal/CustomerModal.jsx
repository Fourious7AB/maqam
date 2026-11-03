import React from "react";
import {
  X,
  Sparkles,
  Plane,
  Building2,
  MapPin,
  Users,
  CalendarDays,
  Wallet,
  CheckCircle2,
  ArrowRight,
  Phone,
  Clock3,
  Compass,
  UserRound,
  Baby,
  Heart,
} from "lucide-react";

const CustomerModal = ({
  openCustomerModal,
  setOpenCustomerModal,
  packageData,
  onGoToBooking,
  onContactAdmin,
}) => {
  if (!openCustomerModal) return null;

  const closeModal = () => {
    setOpenCustomerModal(false);
  };

  // ------------------------------------------
  // Check whether booking can be started
  // ------------------------------------------

  const canGoToBooking =
    packageData?.flightName?.trim() &&
    packageData?.hotelMakkah?.trim() &&
    packageData?.travellers &&
    packageData?.adult &&
    packageData?.children !== "" &&
    packageData?.departureDate &&
    packageData?.endDate &&
    packageData?.duration &&
    packageData?.interests?.trim() &&
    (packageData?.budget || packageData?.budgetRange);

  const totalTravellers =
    Number(packageData?.adult || 0) +
    Number(packageData?.children || 0);

  return (
    <div
      className="
        fixed
        inset-0
        z-[300]
        flex
        items-center
        justify-center
        bg-black/60
        backdrop-blur-sm
        p-3
        sm:p-5
      "
      onClick={closeModal}
    >
      <div
        className="
          relative
          flex
          w-full
          max-w-3xl
          max-h-[94vh]
          flex-col
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-[0_30px_100px_rgba(0,0,0,0.30)]
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent */}
        <div className="absolute top-0 left-0 right-0 z-10 h-1 bg-emerald-500" />

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="shrink-0 border-b border-zinc-200 px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className="
                  mb-3
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-emerald-100
                  bg-emerald-50
                  px-3
                  py-1.5
                  text-[11px]
                  font-bold
                  text-emerald-700
                "
              >
                <Sparkles size={12} />
                Custom Package Review
              </div>

              <h2 className="text-xl font-extrabold text-zinc-900 sm:text-2xl">
                Review Your {packageData?.packageType || "Custom"} Journey
              </h2>

              <p className="mt-1.5 text-sm text-zinc-500">
                Please review all the details you entered before continuing.
              </p>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-full
                border
                border-zinc-200
                text-zinc-500
                transition-all
                hover:bg-zinc-100
                hover:text-zinc-900
                active:scale-95
              "
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-5 sm:p-7">

            {/* =================================================
                PACKAGE TYPE
            ================================================= */}

            <SectionTitle
              icon={Compass}
              title="Package Details"
            />

            <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ReviewItem
                icon={MapPin}
                label="Package Type"
                value={
                  packageData?.packageType === "Hajj"
                    ? "🕋 Hajj"
                    : "🕌 Umrah"
                }
              />

              <ReviewItem
                icon={Wallet}
                label="Budget"
                value={`₹${Number(
                  packageData?.budget ||
                    packageData?.budgetRange ||
                    0
                ).toLocaleString("en-IN")} / person`}
              />
            </div>

            {/* =================================================
                TRAVEL DETAILS
            ================================================= */}

            <SectionTitle
              icon={Plane}
              title="Travel Details"
            />

            <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">

              <ReviewItem
                icon={Plane}
                label="Preferred Airline / Flight"
                value={packageData?.flightName}
              />

              <ReviewItem
                icon={MapPin}
                label="Destination"
                value={packageData?.hotelMakkah}
              />

              <ReviewItem
                icon={CalendarDays}
                label="Start Date"
                value={packageData?.departureDate}
              />

              <ReviewItem
                icon={CalendarDays}
                label="End Date"
                value={packageData?.endDate}
              />

              <ReviewItem
                icon={CalendarDays}
                label="Duration"
                value={
                  packageData?.duration
                    ? `${packageData?.duration} Days`
                    : null
                }
              />

              <ReviewItem
                icon={Heart}
                label="Interests"
                value={packageData?.interests}
              />
            </div>

            {/* =================================================
                HOTEL DETAILS
            ================================================= */}

            <SectionTitle
              icon={Building2}
              title="Accommodation"
            />

            <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">

              <ReviewItem
                icon={Building2}
                label="Hotel"
                value={packageData?.hotelMadinah}
                optional
              />

              <ReviewItem
                icon={MapPin}
                label="Makkah / Destination"
                value={packageData?.hotelMakkah}
              />
            </div>

            {/* =================================================
                TRAVELLERS
            ================================================= */}

            <SectionTitle
              icon={Users}
              title="Travellers"
            />

            <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3">

              <ReviewItem
                icon={Users}
                label="Total Travellers"
                value={
                  totalTravellers
                    ? `${totalTravellers} Person(s)`
                    : packageData?.travellers
                      ? `${packageData.travellers} Person(s)`
                      : null
                }
              />

              <ReviewItem
                icon={UserRound}
                label="Adults"
                value={
                  packageData?.adult
                    ? `${packageData.adult} Adult(s)`
                    : null
                }
              />

              <ReviewItem
                icon={Baby}
                label="Children"
                value={
                  packageData?.children !== ""
                    ? `${packageData?.children} Child(ren)`
                    : null
                }
              />
            </div>

            {/* =================================================
                SPECIAL REQUESTS
            ================================================= */}

            <SectionTitle
              icon={Sparkles}
              title="Additional Preferences"
            />

            <div className="mb-7">

              <div
                className="
                  rounded-xl
                  border
                  border-zinc-200
                  bg-zinc-50
                  p-4
                "
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                  Special Requests
                </p>

                <p className="text-sm leading-relaxed text-zinc-700">
                  {packageData?.specialRequests?.trim()
                    ? packageData.specialRequests
                    : "No special requests added"}
                </p>
              </div>
            </div>

            {/* =================================================
                AI PACKAGE INFORMATION
            ================================================= */}

            <div
              className="
                rounded-2xl
                border
                border-emerald-100
                bg-emerald-50
                p-4
                sm:p-5
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-white
                    border
                    border-emerald-100
                  "
                >
                  <Sparkles
                    size={18}
                    className="text-emerald-600"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Your package will include
                  </h3>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">

                    <IncludedItem text="Day-wise itinerary" />

                    <IncludedItem text="Suggested flights" />

                    <IncludedItem text="Recommended hotels" />

                    <IncludedItem text="Activities" />

                    <IncludedItem text="Nearby attractions" />

                    <IncludedItem text="Estimated budget" />

                    <IncludedItem text="Package recommendation" />

                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* =====================================================
            FOOTER ACTIONS
        ===================================================== */}

        <div className="shrink-0 border-t border-zinc-200 bg-white px-5 py-4 sm:px-7">

          {canGoToBooking ? (
            <>
              <div className="mb-3 flex items-center justify-center gap-2 text-xs text-emerald-600">
                <CheckCircle2 size={14} />
                All required details are complete
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">

                {/* Back */}
                <button
                  type="button"
                  onClick={closeModal}
                  className="
                    h-12
                    flex-1
                    rounded-xl
                    border
                    border-zinc-200
                    bg-white
                    text-sm
                    font-bold
                    text-zinc-700
                    transition
                    hover:bg-zinc-50
                    active:scale-[0.98]
                  "
                >
                  Edit Details
                </button>

                {/* Booking */}
                <button
                  type="button"
                  onClick={onGoToBooking}
                  className="
                    flex
                    h-12
                    flex-[1.5]
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-zinc-900
                    px-5
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    shadow-zinc-900/10
                    transition
                    hover:bg-zinc-800
                    active:scale-[0.98]
                  "
                >
                  Go to Booking
                  <ArrowRight size={17} />
                </button>

              </div>

              <p className="mt-2 text-center text-[11px] text-zinc-400">
                You can review the final flight, hotel and pricing before
                confirming your booking.
              </p>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-center gap-2 text-xs text-amber-600">
                <Clock3 size={14} />
                Our team will help complete your package
              </div>

              <button
                type="button"
                onClick={onContactAdmin}
                className="
                  flex
                  h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-zinc-900
                  px-5
                  text-sm
                  font-bold
                  text-white
                  shadow-lg
                  shadow-zinc-900/10
                  transition
                  hover:bg-zinc-800
                  active:scale-[0.98]
                "
              >
                <Phone size={16} />
                Contact Our Admin
              </button>

              <p className="mt-2 text-center text-[11px] text-zinc-400">
                Some required information is missing. Our admin team can
                assist you in completing your package.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


/* =========================================================
   SECTION TITLE
========================================================= */

const SectionTitle = ({ icon: Icon, title }) => {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon
        size={15}
        className="text-emerald-600"
        strokeWidth={2.2}
      />

      <h3
        className="
          text-[11px]
          font-bold
          uppercase
          tracking-[0.12em]
          text-zinc-500
        "
      >
        {title}
      </h3>
    </div>
  );
};


/* =========================================================
   REVIEW ITEM
========================================================= */

const ReviewItem = ({
  icon: Icon,
  label,
  value,
  optional = false,
}) => {
  const hasValue =
    value !== undefined &&
    value !== null &&
    String(value).trim() !== "";

  return (
    <div
      className="
        rounded-xl
        border
        border-zinc-200
        bg-white
        p-3.5
        transition
        hover:border-zinc-300
      "
    >
      <div className="flex items-start gap-3">

        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-zinc-100
          "
        >
          <Icon
            size={15}
            className="text-zinc-600"
          />
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-2">
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.1em]
                text-zinc-400
              "
            >
              {label}
            </p>

            {optional && (
              <span className="text-[9px] text-zinc-400">
                Optional
              </span>
            )}
          </div>

          <p
            className={`
              mt-1
              break-words
              text-sm
              font-semibold
              ${
                hasValue
                  ? "text-zinc-900"
                  : "text-zinc-400 italic"
              }
            `}
          >
            {hasValue ? value : "Not provided"}
          </p>

        </div>
      </div>
    </div>
  );
};


/* =========================================================
   INCLUDED ITEM
========================================================= */

const IncludedItem = ({ text }) => {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2
        size={13}
        className="shrink-0 text-emerald-600"
      />

      <span className="text-xs text-emerald-800/80">
        {text}
      </span>
    </div>
  );
};

export default CustomerModal;
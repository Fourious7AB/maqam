import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { tokenService } from "../../admin/services/tokenService";
import { ArrowRight, Clock3, FileCheck2, Loader2, Globe, RefreshCw } from "lucide-react";
import api from "../stores/api";
import { VisaAPI } from "../../configs/api";
import AnimatedNumber from "../shared/AnimatedNumber";
import { staggerEntrance, clickSquash } from "../../animations/presets";

const getCountryFlag = (countryCode) => {
  if (!countryCode) return "";

  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt()))
    .join("");
};

export default function VisaCountries() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector(
    (state) =>
      state.auth.isAuthenticated ||
      Boolean(tokenService.getAccessToken()),
  );
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.info("Log in is mandatory to access Visa services.");
      navigate("/visa-card");
    }
  }, [isAuthenticated, navigate]);

  const fetchVisaCatalog = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(VisaAPI.UserVisasCatalogApi);
      const resData = response.data?.data || response.data;
      const dbVisas =
        resData?.availableVisas || (Array.isArray(resData) ? resData : []);

      if (Array.isArray(dbVisas)) {
        const mapped = dbVisas.map((item, idx) => {
          const rawCountry = item.country || item.title || "Country";
          const countryName = rawCountry
            .toLowerCase()
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

          const countryCode = (
            item.countryCode ||
            item.code ||
            "UN"
          ).toUpperCase();

          const totalPrice =
            item.fees?.totalPrice ||
            item.fees?.basePrice ||
            item.priceNumber ||
            5000;

          const image =
            item.countryPicture ||
            item.countryImage ||
            item.bannerImage ||
            item.image ||
            `https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=900&q=80`;

          const processing = item.processingTime || "3-5 Working Days";

          return {
            id: item._id || item.id || idx + 1,
            _id: item._id,
            country: countryName,
            code: countryCode,
            image,
            flag:
              item.countryFlag && item.countryFlag.startsWith("http")
                ? item.countryFlag
                : null,
            price: `₹${totalPrice.toLocaleString()}`,
            priceNumber: totalPrice,
            visaType: item.visaType || item.type || "E-Visa",
            processing,
          };
        });

        setCountries(mapped);
      }
    } catch (err) {
      console.error("Failed to load visa destinations from database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisaCatalog();
  }, []);

  useEffect(() => {
    if (!isLoading && countries.length > 0) {
      staggerEntrance(".visa-country-card", {
        stagger: 45,
        startDelay: 60,
      });
    }
  }, [isLoading, countries.length]);

  const handleVisaClick = (country) => {
    const slug = country.country.toLowerCase().replace(/\s+/g, "-");
    navigate(`/visa/${slug}`);
  };

  return (
    <section className="min-h-screen w-full bg-[#f5f5f5] py-6 sm:py-8 lg:py-10 font-poppins">
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
        {/* ====================================================
            TOP TITLE BAR
        ===================================================== */}

        <div className="mb-6 flex min-h-[52px] items-center justify-between rounded-2xl bg-[#1e293b] px-4 sm:px-6 shadow-sm border border-slate-700">
          <h1 className="text-sm font-semibold text-white sm:text-base lg:text-lg">
            View all countries where you can apply visas for
          </h1>
          <span className="text-xs font-bold text-emerald-400 bg-white/10 px-3 py-1 rounded-full">
            {isLoading ? "Loading..." : `${countries.length} Destinations`}
          </span>
        </div>

        {/* ====================================================
            COUNTRY GRID
        ===================================================== */}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-[250px] rounded-xl bg-slate-200/80 animate-pulse border border-slate-200"
              />
            ))}
          </div>
        ) : countries.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300 p-8 max-w-md mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Globe size={32} />
            </div>
            <p className="text-base sm:text-lg font-bold text-gray-900">
              No Visa Destinations Found in Database
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Please ensure visa items have been created and published in the database.
            </p>
            <button
              type="button"
              onClick={fetchVisaCatalog}
              className="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5 mx-auto"
            >
              <RefreshCw size={13} />
              <span>Retry Fetching Visas</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((country) => (
              <VisaCard
                key={country.id}
                country={country}
                onClick={() => handleVisaClick(country)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* VISA CARD  */

function VisaCard({ country, onClick }) {
  const numericPrice = Number(String(country.price || "").replace(/[^\d]/g, "")) || 0;

  return (
    <div
      onClick={(e) => {
        clickSquash(e.currentTarget);
        if (onClick) onClick();
      }}
      className="
        visa-country-card
        group
        relative
        flex
        h-[250px]
        cursor-pointer
        flex-col
        overflow-hidden
        rounded-xl
        bg-white
        shadow-[0_2px_8px_rgba(0,0,0,0.08)]
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)]
        active:scale-[0.98]
      "
    >
      {/* IMAGE SECTION  */}

      <div className="relative h-[145px] shrink-0 overflow-visible">
        {/* Image */}
        <img
          src={country.image}
          alt={`${country.country} visa`}
          className="
            absolute
            inset-0
            h-full
            w-full
            rounded-t-xl
            object-cover
            transition-transform
            duration-500
            group-hover:scale-105
          "
        />

        {/* Image Overlay */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            rounded-t-xl
            bg-gradient-to-t
            from-black/20
            via-transparent
            to-transparent
          "
        />

        {/*  VISA TYPE */}

        <div
          className="
            absolute
            right-3
            top-3
            z-10
            rounded-full
            border
            border-slate-200
            bg-white
            px-3
            py-1.5
            text-[9px]
            font-semibold
            text-slate-700
            shadow-sm
          "
        >
          {country.visaType}
        </div>

        {/* FLAG */}

        <div
          className="
            absolute
            bottom-0
            left-3
            z-20
            h-[44px]
            w-[56px]
            translate-y-1/2
            overflow-hidden
            rounded-md
            border-4
            border-white
            bg-white
            shadow-md
          "
        >
          <img
            src={
              country.flag ||
              `https://flagcdn.com/w160/${(country.code || "un").toLowerCase()}.png`
            }
            alt={`${country.country} flag`}
            className="h-20 w-20 object-cover"
            onError={(e) => {
              e.currentTarget.src = `https://flagcdn.com/w160/${(country.code || "un").toLowerCase()}.png`;
            }}
          />
        </div>
      </div>

      {/* CONTENT  250px - 165px = 85px */}

      <div
        className="
          flex
          h-[85px]
          w-[100%]
          shrink-0
          flex-col
          px-3.5
          pt-5
          pb-2
        "
      >
        {/*  COUNTRY + PRICE  */}
        <div className="flex h-[30px] items-start justify-between gap-2">
          {/* Country */}
          <div className="min-w-0 flex-1">
            <h2
              title={country.country}
              className="
                truncate
                text-[14px]
                font-bold
                leading-4
                text-slate-800
              "
            >
              {country.country}
            </h2>

            {/* Visa Type */}
            <div className="mt-1 flex items-center gap-1">
              <FileCheck2
                size={10}
                strokeWidth={2}
                className="shrink-0 text-emerald-500"
              />

              <span className="truncate text-[8px] leading-3 text-slate-500">
                {country.visaType}
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="shrink-0 text-right">
            <p
              className="
                text-[14px]
                font-bold
                leading-4
                text-slate-800
              "
            >
              {numericPrice > 0 ? (
                <AnimatedNumber value={numericPrice} prefix="₹" />
              ) : (
                country.price
              )}
            </p>

            <p className="mt-0.5 text-[8px] leading-3 text-slate-400">
              Onwards
            </p>
          </div>
        </div>

        {/*  ACTION AREA */}

        <div className="mt-auto border-t border-slate-100 pt-2">
          <div className="flex h-[30px] w-full items-center gap-2">
            {/* ================= PROCESSING ================= */}

            <div className="flex min-w-0 flex-1 items-center gap-1">
              {/* Clock */}
              <div
                className="
          flex
          h-5
          w-5
          shrink-0
          items-center
          justify-center
          rounded-full
          border
          border-emerald-100
          bg-emerald-50
        "
              >
                <Clock3
                  size={10}
                  strokeWidth={2.2}
                  className="text-emerald-600"
                />
              </div>

              {/* Processing Text */}
              <div className="min-w-0 leading-none">
                <p
                  className="
            whitespace-nowrap
            text-[6px]
            font-medium
            uppercase
            tracking-[0.02em]
            text-slate-400
          "
                >
                  Processing
                </p>

                <p
                  className="
            mt-1
            whitespace-nowrap
            text-[7px]
            font-semibold
            text-slate-700
          "
                >
                  {country.processing
                    .replace(" Working Days", "")
                    .replace(" Working Day", "")}{" "}
                  Days
                </p>
              </div>
            </div>

            {/* ================= APPLY BUTTON ================= */}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="
        group/apply
        flex
        h-[30px]
        w-[72px]
        shrink-0
        items-center
        justify-center
        gap-1
        rounded-md
        bg-emerald-600
        px-1.5
        text-[8px]
        font-bold
        text-white
        shadow-sm
        shadow-emerald-200
        transition-all
        duration-200
        hover:bg-emerald-700
        hover:shadow-md
        active:scale-95
      "
            >
              <span className="whitespace-nowrap">Apply Now</span>

              <span
                className="
          flex
          h-4
          w-4
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-white/15
          transition-transform
          duration-200
          group-hover/apply:translate-x-0.5
        "
              >
                <ArrowRight size={8} strokeWidth={2.5} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

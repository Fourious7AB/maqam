/**
 * Package Helper Utilities
 * Safely extracts and formats rich information from live Package API responses.
 */

export const getPackageFallbackImage = (destination = "", title = "") => {
  const d = `${destination} ${title}`.toLowerCase();
  if (d.includes("turkey") || d.includes("cappadocia") || d.includes("istanbul")) {
    return "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1000&q=80";
  }
  if (d.includes("dubai") || d.includes("abu dhabi") || d.includes("uae") || d.includes("dxb")) {
    return "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1000&q=80";
  }
  if (d.includes("egypt") || d.includes("cairo") || d.includes("pyramid") || d.includes("nile")) {
    return "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1000&q=80";
  }
  if (d.includes("morocco") || d.includes("marrakech") || d.includes("atlas")) {
    return "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=1000&q=80";
  }
  if (d.includes("maldives") || d.includes("beach") || d.includes("island")) {
    return "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1000&q=80";
  }
  if (d.includes("rajasthan") || d.includes("ragisthan") || d.includes("jaipur") || d.includes("udaipur")) {
    return "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1000&q=80";
  }
  if (d.includes("madinah") || d.includes("medina")) {
    return "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1000&q=80";
  }
  if (
    d.includes("makkah") ||
    d.includes("mecca") ||
    d.includes("umrah") ||
    d.includes("hajj") ||
    d.includes("caba") ||
    d.includes("kaaba")
  ) {
    return "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1000&q=80";
  }
  return "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1000&q=80";
};

export const extractImageUrl = (item) => {
  if (!item) return null;
  if (typeof item === "string") {
    const s = item.trim();
    if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("//")) return s;
    if (s.startsWith("/")) return `https://server2.vais.co.in${s}`;
    return null;
  }
  if (typeof item === "object") {
    const u = item.url || item.secure_url || item.src || item.path || item.imageUrl;
    if (typeof u === "string" && u.trim().length > 0) return extractImageUrl(u);
  }
  return null;
};

export const FALLBACK_PACKAGE_IMAGE =
  "https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1000&auto=format&fit=crop";

/**
 * Format currency into readable INR format.
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(Number(amount))) {
    return "₹45,000";
  }
  const num = Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Detect and filter out offensive / crude placeholder text from test datasets.
 */
function sanitizeDescription(desc, title, destination) {
  if (!desc || typeof desc !== "string") {
    return getDefaultDescription(title, destination);
  }

  const trimmed = desc.trim();
  const lower = trimmed.toLowerCase();

  // Junk markers commonly found in manual test entries
  const slopMarkers = [
    ">_<",
    "f88k",
    "fuck",
    "what your need",
    "do your self",
    "what you want",
    "tytytrytr",
    "hfghthyfgh",
    "asdf",
    "testing",
    "test",
    "make your own decision",
  ];

  const hasSlop = slopMarkers.some((marker) => lower.includes(marker));
  if (hasSlop || trimmed.length < 10) {
    return getDefaultDescription(title, destination);
  }

  return trimmed;
}

function getDefaultDescription(title, destination) {
  const dest = (destination || "").toLowerCase();
  if (dest.includes("madin") || dest.includes("makkah") || dest.includes("caba")) {
    return "Complete spiritual pilgrimage journey featuring verified hotel accommodations, guided transfers, and dedicated support.";
  }
  if (dest.includes("turkey") || dest.includes("istanbul")) {
    return "Immersive cultural journey through historic landmarks, premium boutique stays, and curated sightseeing tours.";
  }
  if (dest.includes("dubai") || dest.includes("dxb")) {
    return "Luxury desert and city escape with premium hotel stays, desert excursions, and seamless transfers.";
  }
  return "Expertly curated package with verified accommodations, logistics, and 24/7 dedicated traveler support.";
}

/**
 * Format ISO dates into "DD Mon YYYY" or date ranges.
 */
function formatDateRange(from, to) {
  if (!from && !to) return null;
  try {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    const options = { day: "numeric", month: "short", year: "numeric" };

    if (fromDate && toDate && !isNaN(fromDate) && !isNaN(toDate)) {
      const fromStr = fromDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const toStr = toDate.toLocaleDateString("en-IN", options);
      return `${fromStr} – ${toStr}`;
    }
    if (fromDate && !isNaN(fromDate)) {
      return `From ${fromDate.toLocaleDateString("en-IN", options)}`;
    }
    if (toDate && !isNaN(toDate)) {
      return `Valid until ${toDate.toLocaleDateString("en-IN", options)}`;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Main parser: transforms a raw package from API into structured presentation data.
 */
export function parsePackageData(pkg) {
  if (!pkg) return null;

  const id = pkg._id || pkg.id || "";
  const title = (pkg.title || "Pilgrimage Journey").trim();
  const destination = (pkg.destination || pkg.location || "Makkah & Madinah").trim();

  // Price calculations
  const sellPrice =
    pkg.sellPrice != null
      ? Number(pkg.sellPrice)
      : pkg.price != null
      ? Number(String(pkg.price).replace(/[^\d.]/g, "")) || null
      : null;
  const bundleDiscount = Number(pkg.bundleDiscountPercentage) || 0;
  let originalPrice = null;
  if (bundleDiscount > 0 && sellPrice != null) {
    originalPrice = Math.round(sellPrice / (1 - bundleDiscount / 100));
  }

  // Price Breakdown extraction: Flight & Hotel
  const breakdown = Array.isArray(pkg.priceBreakdown) ? pkg.priceBreakdown : [];

  let flightInfo = null;
  let hotelInfo = null;

  for (const item of breakdown) {
    if (item.itemType === "flight" || item.details?.flightDetails) {
      const f = item.details?.flightDetails || {};
      flightInfo = {
        title: item.title || "Scheduled Flight",
        airline: f.airline || "Airline Partner",
        flightNumber: f.flightNumber || "",
        route: f.origin && f.destination ? `${f.origin} → ${f.destination}` : f.destination || "Direct Flight",
        retailPrice: item.retailPrice,
      };
    } else if (item.itemType === "hotel" || item.details?.hotelDetails) {
      const h = item.details?.hotelDetails || {};
      const hotelName = h.hotelId?.name || item.title || "Selected Premium Hotel";
      hotelInfo = {
        title: item.title,
        name: hotelName,
        roomType: h.roomType || "Standard Room",
        totalNights: h.totalNights || 1,
        destination: item.details?.destination || "",
        retailPrice: item.retailPrice,
      };
    }
  }

  // Duration derivation
  let durationDays = 0;
  if (pkg.validity?.from && pkg.validity?.to) {
    const fromTime = new Date(pkg.validity.from).getTime();
    const toTime = new Date(pkg.validity.to).getTime();
    if (toTime > fromTime) {
      durationDays = Math.max(1, Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24)));
    }
  }

  let durationText = pkg.duration;
  if (!durationText) {
    if (durationDays > 0) {
      durationText = `${durationDays} Days / ${Math.max(1, durationDays - 1)} Nights`;
    } else if (Array.isArray(pkg.itinerary) && pkg.itinerary.length > 0) {
      durationText = `${pkg.itinerary.length} Days Itinerary`;
    } else if (hotelInfo?.totalNights) {
      durationText = `${hotelInfo.totalNights + 1} Days / ${hotelInfo.totalNights} Nights`;
    } else {
      durationText = "Flexible Tour";
    }
  }

  // Validity Date Range
  const travelDates = formatDateRange(pkg.validity?.from, pkg.validity?.to);

  // Inclusions sanitization & synthesis
  const rawInclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
  const normalizedInclusions = [];

  rawInclusions.forEach((inc) => {
    if (typeof inc === "string") {
      inc.split(",").forEach((sub) => {
        const clean = sub.trim();
        if (clean && !normalizedInclusions.includes(clean)) {
          normalizedInclusions.push(clean);
        }
      });
    }
  });

  // Supplement missing inclusions with extracted details
  if (flightInfo && !normalizedInclusions.some((i) => i.toLowerCase().includes("flight"))) {
    normalizedInclusions.push(`${flightInfo.airline} Flights`);
  }
  if (hotelInfo && !normalizedInclusions.some((i) => i.toLowerCase().includes("hotel") || i.toLowerCase().includes("stay"))) {
    normalizedInclusions.push(hotelInfo.name);
  }
  if (normalizedInclusions.length === 0) {
    normalizedInclusions.push("Verified Stay", "Logistics Support");
  }

  // Images compilation
  const imageList = [];
  const pushImg = (candidate) => {
    const url = extractImageUrl(candidate);
    if (url && !imageList.includes(url)) {
      imageList.push(url);
    }
  };

  if (Array.isArray(pkg.images)) {
    pkg.images.forEach(pushImg);
  }
  if (pkg.image) pushImg(pkg.image);
  if (pkg.coverImage) pushImg(pkg.coverImage);
  if (pkg.thumbnail) pushImg(pkg.thumbnail);

  // Collect from priceBreakdown (items, hotelDetails, flightDetails)
  breakdown.forEach((item) => {
    if (Array.isArray(item.images)) item.images.forEach(pushImg);
    if (Array.isArray(item.details?.images)) item.details.images.forEach(pushImg);
    if (Array.isArray(item.details?.hotelDetails?.images)) item.details.hotelDetails.images.forEach(pushImg);
    if (item.image) pushImg(item.image);
  });

  // Collect from offerRefs
  if (Array.isArray(pkg.offerRefs)) {
    pkg.offerRefs.forEach((ref) => {
      if (Array.isArray(ref.offer?.images)) ref.offer.images.forEach(pushImg);
      if (ref.offer?.image) pushImg(ref.offer.image);
    });
  }

  const primaryImage =
    imageList.length > 0 ? imageList[0] : getPackageFallbackImage(destination, title);

  // Slots urgency
  const availableSlots = typeof pkg.availableSlots === "number" ? pkg.availableSlots : null;
  const isUrgentSlots = availableSlots !== null && availableSlots > 0 && availableSlots <= 5;

  // Clean description
  const cleanDescription = sanitizeDescription(pkg.description, title, destination);

  return {
    id,
    title,
    destination,
    description: cleanDescription,
    sellPrice,
    formattedPrice: formatCurrency(sellPrice),
    originalPrice,
    formattedOriginalPrice: originalPrice ? formatCurrency(originalPrice) : null,
    bundleDiscount,
    availableSlots,
    isUrgentSlots,
    durationText,
    durationDays,
    travelDates,
    flightInfo,
    hotelInfo,
    inclusions: normalizedInclusions,
    images: imageList.length > 0 ? imageList : [primaryImage],
    primaryImage,
    rating: pkg.rating || 4.9,
    itineraryCount: Array.isArray(pkg.itinerary) ? pkg.itinerary.length : 0,
  };
}

const { body, param, query, header } = require("express-validator");

// ─── Shared room-level field validators (used in full rooms[] format) ─────────
const roomFields = [
  body("rooms.*.adults")
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage("Each room needs 1 to 8 adults."),
  body("rooms.*.children").optional().isInt({ min: 0, max: 6 }),
  body("rooms.*.childAges").optional().isArray({ max: 6 }),
  body("rooms.*.childAges.*").optional().isInt({ min: 0, max: 17 }),
];

const validateSearch = () => [
  // ── Destination ──────────────────────────────────────────────────────────────
  // Either cityId (numeric SRDV code) or cityName (human-readable) must be supplied.
  // countryCode is OPTIONAL — auto-derived from the city map when cityName is used.
  body("cityId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("cityId must not be empty when provided."),
  body("cityName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("cityName must not be empty when provided."),
  body("cityId").custom((cityId, { req }) => {
    if (!cityId && !req.body.cityName) {
      throw new Error(
        "Either cityId or cityName is required. Use GET /api/v1/hotels/cities to search.",
      );
    }
    return true;
  }),
  body("countryCode")
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .toUpperCase(),

  // ── Dates ────────────────────────────────────────────────────────────────────
  body("checkIn")
    .isISO8601()
    .toDate()
    .custom((checkIn) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (checkIn < today) throw new Error("Check-in must be today or later.");
      return true;
    }),
  body("checkOut")
    .isISO8601()
    .toDate()
    .custom((checkOut, { req }) => {
      if (checkOut <= req.body.checkIn)
        throw new Error("Check-out must be after check-in.");
      return true;
    }),

  // ── Guest defaults (all optional — server applies smart defaults)
  // guestNationality defaults to "IN", currency defaults to "INR"
  body("guestNationality")
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .toUpperCase(),
  body("currency")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .toUpperCase(),

  // ── Simplified room inputs (top-level shorthand)
  // Users can pass:  adults, children, childAges, numRooms
  // OR the full:     rooms: [{ adults, children, childAges }]
  // At least one of these must be present.
  body("adults")
    .optional()
    .isInt({ min: 1, max: 32 })
    .withMessage("adults must be between 1 and 32."),
  body("children").optional().isInt({ min: 0, max: 24 }),
  body("childAges").optional().isArray({ max: 24 }),
  body("childAges.*").optional().isInt({ min: 0, max: 17 }),
  body("numRooms")
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage("numRooms must be between 1 and 8."),

  // Full rooms[] array (optional — only needed for multi-room with different occupancy per room)
  body("rooms")
    .optional()
    .isArray({ min: 1, max: 8 })
    .withMessage("rooms must be an array of 1–8 entries."),
  ...roomFields,

  // Cross-field: need either rooms[] or adults shorthand
  body("adults").custom((adults, { req }) => {
    const hasRooms = Array.isArray(req.body.rooms) && req.body.rooms.length > 0;
    if (!adults && !hasRooms) {
      throw new Error(
        'Provide either "adults" (e.g. adults: 2) or a full "rooms" array.',
      );
    }
    return true;
  }),

  // ── Rating filters (optional) ─────────────────────────────────────────────────
  body("minRating").optional().isInt({ min: 1, max: 5 }),
  body("maxRating").optional().isInt({ min: 1, max: 5 }),
];

const validateHotelId = () => [
  param("hotelId").trim().notEmpty(),
  query("searchId").isUUID().withMessage("Valid searchId is required."),
];
const validateRecheck = () => [
  body("searchId").isUUID(),
  body("hotelId").trim().notEmpty(),
  body("selectedRooms").isArray({ min: 1, max: 8 }),
  body("selectedRooms.*.roomId").trim().notEmpty(),
  body("selectedRooms.*.quantity").optional().isInt({ min: 1, max: 8 }),
  body("guests").optional().isArray({ min: 1, max: 32 }),
];
const validateCreateBooking = () => [
  header("Idempotency-Key")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Idempotency-Key header must be a non-empty string when provided.",
    ),
  body("recheckId").isUUID(),
  body("acceptChanges").optional().isBoolean(),
  body("guests").isArray({ min: 1, max: 32 }),
  body("guests.*.title").trim().notEmpty(),
  body("guests.*.firstName").trim().notEmpty(),
  body("guests.*.lastName").trim().notEmpty(),
  body("guests.*.type").isIn(["adult", "child"]),
  body("guests.*.email").optional().isEmail(),
  body("guests.*.phone").optional().trim().notEmpty(),
  body("guests.*.age")
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage("Age must be a valid integer between 0 and 120."),
];
const validateBookingId = () => [param("id").isMongoId()];
const validateListBookings = () => [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

module.exports = {
  validateSearch,
  validateHotelId,
  validateRecheck,
  validateCreateBooking,
  validateBookingId,
  validateListBookings,
};

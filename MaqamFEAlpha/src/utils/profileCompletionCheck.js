import { authService } from "../services/authService";
import travellerService from "../services/travellerService";
import { tokenService } from "../admin/services/tokenService";
import { authSession, normalizeUser } from "../services/authSession";
import { updateUserProfile } from "../components/reducer/AuthSlice";

/**
 * Checks if a string is a generic placeholder name created automatically by backend OTP/phone auth.
 */
export const isGenericPlaceholder = (val) => {
  if (!val || typeof val !== "string") return true;
  const lower = val.trim().toLowerCase();
  return (
    lower === "" ||
    lower === "user" ||
    lower === "authorized user" ||
    lower === "maqam user" ||
    lower === "customer" ||
    lower === "null" ||
    lower === "undefined" ||
    lower === "traveler" ||
    lower === "passenger" ||
    /^\+?\d+$/.test(lower)
  );
};

/**
 * Determines whether a logged-in user authenticated with phone number only
 * and has not yet edited/completed their profile.
 *
 * Criteria:
 * 1. User is logged in.
 * 2. User has phone number.
 * 3. User's firstName is empty, "User", or matches generic placeholders,
 *    OR user has no valid email registered,
 *    OR user has explicit incomplete flags.
 *
 * @param {Object} user
 * @returns {boolean}
 */
export const isPhoneOnlyIncompleteUser = (user) => {
  if (!user || typeof user !== "object") return false;

  const rawFirst = String(user.firstName || user.name?.split(" ")?.[0] || "").trim();
  const rawEmail = String(user.email || "").trim();
  const rawPhone = String(user.phone || "").trim();

  // If user does not even have a phone number, they are not a phone-only login
  if (!rawPhone) return false;

  // If firstName is missing or is generic placeholder ("User", etc.)
  if (!rawFirst || isGenericPlaceholder(rawFirst)) {
    return true;
  }

  // If email is missing or dummy placeholder
  if (!rawEmail || !rawEmail.includes("@") || rawEmail.endsWith("@placeholder.com") || rawEmail.endsWith("@maqam.internal")) {
    return true;
  }

  return false;
};

/**
 * Persists user profile updates to /api/v1/auth/me and creates/updates
 * a default primary traveler profile in /api/v1/account/traveller/create.
 * Synchronizes Redux, authSession, and tokenService.
 *
 * @param {Object} params
 * @param {Object} params.user - Current user object
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {string} params.email
 * @param {string} params.phone
 * @param {string} [params.gender]
 * @param {string} [params.title]
 * @param {string} [params.pan]
 * @param {number} [params.age]
 * @param {Function} [params.dispatch] - Redux dispatch function
 * @returns {Promise<{ user: Object, traveller: Object }>}
 */
export const syncProfileAndDefaultTraveller = async ({
  user,
  firstName,
  lastName,
  email,
  phone,
  gender = "Male",
  title = "Mr",
  pan = "",
  age = 30,
  dispatch,
}) => {
  const cleanFirst = String(firstName || "").trim();
  const cleanLast = String(lastName || "").trim() || cleanFirst;
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPhone = String(phone || user?.phone || "").replace(/\D/g, "").slice(-10);

  if (!cleanFirst) {
    throw new Error("First name is required to complete your profile.");
  }
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error("A valid email address is required for your booking confirmation.");
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error("A valid 10-digit mobile number is required.");
  }

  // 1. Update Account Profile (/api/v1/auth/me)
  const profilePayload = {
    firstName: cleanFirst,
    lastName: cleanLast,
    email: cleanEmail,
    phone: cleanPhone,
    avatar: user?.avatar,
  };

  const updatedServerUser = await authService.updateProfile(profilePayload);

  // 2. Create/Save Primary Default Traveller (/api/v1/account/traveller/create)
  let createdTraveller = null;
  try {
    const travellerPayload = {
      title: title || (gender === "Female" ? "Ms" : "Mr"),
      firstName: cleanFirst,
      lastName: cleanLast,
      gender: gender === "Female" ? "Female" : "Male",
      passengerType: "Adult",
      cellCountryCode: "+91",
      phone: cleanPhone,
      email: cleanEmail,
      isDefault: true,
    };
    if (pan) {
      travellerPayload.pan = String(pan).trim().toUpperCase();
      travellerPayload.panNumber = travellerPayload.pan;
    }
    if (age) {
      const approxBirthYear = new Date().getFullYear() - Number(age);
      travellerPayload.dateOfBirth = new Date(approxBirthYear, 0, 1).toISOString();
    }

    createdTraveller = await travellerService.createTraveller(travellerPayload);
  } catch (travErr) {
    console.warn("Could not auto-create primary traveler during profile sync:", travErr?.message);
  }

  // 3. Sync State Across Stores
  const resolvedUser = {
    ...(user || {}),
    ...(updatedServerUser || {}),
    firstName: cleanFirst,
    lastName: cleanLast,
    name: `${cleanFirst} ${cleanLast}`.trim(),
    email: cleanEmail,
    phone: cleanPhone,
    isProfileComplete: true,
  };

  if (createdTraveller?._id || createdTraveller?.id) {
    resolvedUser.travellerId = createdTraveller._id || createdTraveller.id;
  }

  const activeToken = tokenService.getAccessToken();
  tokenService.setUserProfile(resolvedUser);
  authSession.setStoredUser(normalizeUser(resolvedUser, activeToken));

  if (dispatch) {
    dispatch(updateUserProfile(resolvedUser));
  }

  return {
    user: resolvedUser,
    traveller: createdTraveller,
  };
};

export default {
  isGenericPlaceholder,
  isPhoneOnlyIncompleteUser,
  syncProfileAndDefaultTraveller,
};

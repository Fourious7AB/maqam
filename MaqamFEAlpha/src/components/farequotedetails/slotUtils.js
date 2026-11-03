/**
 * slotUtils.js
 * Utility functions for passenger slots in flight booking.
 */

/**
 * Re-indexes an array of passenger slots so that:
 * - If there is only 1 passenger of a type (e.g. 1 adult), title is "Adult"
 * - If there are multiple passengers of a type (e.g. 2 adults), titles are "Adult 1", "Adult 2", etc.
 * Same rules apply for Child ("Child" or "Child 1", "Child 2") and Infant ("Infant" or "Infant 1", "Infant 2").
 *
 * @param {Array} slots - Array of passenger slot objects
 * @returns {Array} New array of passenger slots with correctly re-indexed slotTitles
 */
export const reindexSlots = (slots) => {
  if (!Array.isArray(slots)) return [];

  const adultCount = slots.filter(
    (s) => (s.type || "ADULT").toUpperCase() === "ADULT"
  ).length;
  const childCount = slots.filter(
    (s) => (s.type || "").toUpperCase() === "CHILD"
  ).length;
  const infantCount = slots.filter(
    (s) => (s.type || "").toUpperCase() === "INFANT"
  ).length;

  let adultIdx = 0;
  let childIdx = 0;
  let infantIdx = 0;

  return slots.map((slot) => {
    const pType = (slot.type || "ADULT").toUpperCase();
    let slotTitle = slot.slotTitle;

    if (pType === "ADULT") {
      adultIdx += 1;
      slotTitle = adultCount === 1 ? "Adult" : `Adult ${adultIdx}`;
    } else if (pType === "CHILD") {
      childIdx += 1;
      slotTitle = childCount === 1 ? "Child" : `Child ${childIdx}`;
    } else if (pType === "INFANT") {
      infantIdx += 1;
      slotTitle = infantCount === 1 ? "Infant" : `Infant ${infantIdx}`;
    }

    return {
      ...slot,
      slotTitle,
    };
  });
};

/**
 * Dynamically computes the display name for a passenger slot in the UI:
 * - If completed and has a first name: returns formatted full name (e.g. "Mr John Doe")
 * - If not completed: dynamically calculates "Adult" (if 1 adult) or "Adult X" (if multiple)
 *
 * @param {Object} slot - The current passenger slot
 * @param {Array} allSlots - The list of all active passenger slots
 * @returns {string} The computed display label
 */
export const getSlotDisplayName = (slot, allSlots = []) => {
  if (!slot) return "";

  if (slot.isCompleted && slot.firstName?.trim()) {
    const titlePart = slot.title ? `${slot.title} ` : "";
    const lastPart = slot.lastName?.trim() ? ` ${slot.lastName.trim()}` : "";
    return `${titlePart}${slot.firstName.trim()}${lastPart}`.trim();
  }

  const pType = (slot.type || "ADULT").toUpperCase();
  const sameTypeSlots = (allSlots || []).filter(
    (s) => (s.type || "ADULT").toUpperCase() === pType
  );
  const typeLabel =
    pType === "CHILD" ? "Child" : pType === "INFANT" ? "Infant" : "Adult";

  if (sameTypeSlots.length <= 1) {
    return typeLabel;
  }

  const typeIndex = sameTypeSlots.findIndex((s) => s.id === slot.id);
  const num = typeIndex >= 0 ? typeIndex + 1 : 1;
  return `${typeLabel} ${num}`;
};

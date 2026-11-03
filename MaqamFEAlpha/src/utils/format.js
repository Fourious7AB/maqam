// Shared currency / number formatting helpers for the admin panel.

export function inr(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

// Compact Indian currency: renders anything >= 1 crore as "₹1cr", "₹2.5cr",
// otherwise falls back to full ₹ grouping. Used for revenue / big stat numbers.
export function crore(amount) {
  const n = Number(amount || 0);
  const CR = 10000000; // 1,00,00,000
  if (Math.abs(n) >= CR) {
    const v = n / CR;
    const s = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
    return `₹${s}cr`;
  }
  return inr(n);
}

// Final price after a percentage discount (0–100). Never below zero.
export function afterDiscount(price, discountPct) {
  const p = Number(price || 0);
  const d = Math.min(100, Math.max(0, Number(discountPct || 0)));
  return Math.max(0, Math.round(p * (1 - d / 100)));
}

export function money(amount, currency = "INR") {
  const symbol =
    currency === "SAR" ? "SAR " : currency === "USD" ? "$" : "₹";
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return `${symbol}${Number(amount || 0).toLocaleString(locale)}`;
}

// Next sequential id from a list, e.g. "BK-10001" -> "BK-10009".
export function nextId(rows, prefix, pad = 0) {
  let max = 0;
  rows.forEach((r) => {
    const match = String(r.id || "").match(/(\d+)\s*$/);
    if (match) max = Math.max(max, Number(match[1]));
  });
  const next = max + 1;
  return `${prefix}${pad ? String(next).padStart(pad, "0") : next}`;
}

import { crore, inr, money, afterDiscount } from "../../utils/format";

/**
 * PriceDisplay - Smart currency display component
 * Automatically uses crore notation for large amounts (>= 1 crore)
 *
 * Props:
 * - amount: number - The price to display
 * - currency: string - Currency code (INR, SAR, USD)
 * - showDiscount: boolean - Whether to show discounted price
 * - discount: number - Discount percentage (0-100)
 * - className: string - Additional CSS classes
 * - useCrore: boolean - Force crore notation for qualifying amounts (default: true)
 */
export default function PriceDisplay({
  amount,
  currency = "INR",
  showDiscount = false,
  discount = 0,
  className = "",
  useCrore = true
}) {
  const originalPrice = Number(amount || 0);
  const finalPrice = showDiscount && discount > 0
    ? afterDiscount(originalPrice, discount)
    : originalPrice;

  const formatPrice = (price) => {
    if (currency === "INR" && useCrore) {
      return crore(price);
    }
    return money(price, currency);
  };

  if (showDiscount && discount > 0) {
    return (
      <div className={`flex items-baseline gap-2 ${className}`}>
        <span className="text-lg font-bold text-slate-900">
          {formatPrice(finalPrice)}
        </span>
        <span className="text-sm text-slate-400 line-through">
          {formatPrice(originalPrice)}
        </span>
      </div>
    );
  }

  return (
    <span className={`font-bold text-slate-900 ${className}`}>
      {formatPrice(finalPrice)}
    </span>
  );
}

/**
 * CompactPrice - Smaller price display for cards
 */
export function CompactPrice({ amount, currency = "INR", className = "" }) {
  const formatPrice = () => {
    if (currency === "INR") {
      return crore(amount);
    }
    return money(amount, currency);
  };

  return (
    <span className={`text-sm font-semibold text-slate-700 ${className}`}>
      {formatPrice()}
    </span>
  );
}

/**
 * PriceFromBadge - "From ₹X" badge for packages
 */
export function PriceFromBadge({ amount, currency = "INR", className = "" }) {
  const formatPrice = () => {
    if (currency === "INR") {
      return crore(amount);
    }
    return money(amount, currency);
  };

  return (
    <div className={`inline-flex items-baseline gap-1 ${className}`}>
      <span className="text-xs text-slate-500">From</span>
      <span className="text-lg font-bold text-blue-600">
        {formatPrice()}
      </span>
    </div>
  );
}

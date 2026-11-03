import { Tag } from "lucide-react";

/**
 * DiscountBadge - Displays discount percentage with an icon
 *
 * Props:
 * - discount: number - Discount percentage (0-100)
 * - size: 'sm' | 'md' | 'lg' - Badge size
 * - className: string - Additional CSS classes
 */
export default function DiscountBadge({ discount, size = "md", className = "" }) {
  if (!discount || discount <= 0) return null;

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-2.5 py-1.5"
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14
  };

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md bg-green-50 font-semibold text-green-600 ring-1 ring-inset ring-green-600/20 ${sizeClasses[size]} ${className}`}
    >
      <Tag size={iconSizes[size]} />
      <span>{discount}% OFF</span>
    </div>
  );
}

/**
 * DiscountLabel - Simple text-only discount display
 */
export function DiscountLabel({ discount, className = "" }) {
  if (!discount || discount <= 0) return null;

  return (
    <span className={`text-xs font-semibold text-green-600 ${className}`}>
      {discount}% OFF
    </span>
  );
}

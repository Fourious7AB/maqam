import { useState } from "react";
import { ImageIcon } from "lucide-react";

/**
 * An <img> that quietly falls back to a green placeholder if the URL is missing
 * or fails to load — so hard-coded / sample image links never leave a broken
 * icon on a card.
 */
export default function SmartImage({ src, alt = "", className = "", Icon = ImageIcon }) {
  const [failed, setFailed] = useState(false);
  const Fallback = Icon || ImageIcon;

  if (!src || failed) {
    return (
      <div
        className={`grid place-items-center bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-500 ${className}`}
        aria-label={alt}
      >
        <Fallback size={30} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

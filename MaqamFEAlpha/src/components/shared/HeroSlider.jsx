import React, { useState, useEffect, useMemo } from "react";
import { useHeroBanner } from "../../hooks/useHeroBanner";
import slide1 from "../../assets/hero-slider/slide1-makkah-kaaba-tawaf.jpg";
import slide2 from "../../assets/hero-slider/slide2-madinah-prophet-mosque.jpg";
import slide3 from "../../assets/hero-slider/slide3-madinah-green-dome.jpg";
import slide4 from "../../assets/hero-slider/slide4-haramain-highspeed-rail.jpg";
import slide5 from "../../assets/hero-slider/slide5-quba-mosque-madinah.jpg";

const DEFAULT_HERO_SLIDES = [
  {
    src: slide1,
    alt: "Holy Kaaba and Mataf Courtyard at Masjid al-Haram in Makkah",
  },
  {
    src: slide2,
    alt: "Al-Masjid an-Nabawi Bird's Eye View with Shading Umbrellas in Madinah",
  },
  {
    src: slide3,
    alt: "The Iconic Green Dome and Minarets of Al-Masjid an-Nabawi",
  },
  {
    src: slide4,
    alt: "Haramain High-Speed Rail Pilgrimage Travel Between Makkah and Madinah",
  },
  {
    src: slide5,
    alt: "Historic Quba Mosque in Madinah, First Mosque in Islam",
  },
];

const HeroSlider = ({
  slides: initialSlides,
  heightClass = "h-[440px] sm:h-[480px] md:h-[520px] lg:h-[540px]",
  curved = true,
  interval = 4500,
  offsetHeader = true,
  className = "",
  children,
}) => {
  const { heroBanner } = useHeroBanner();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Compute active slides list, prepending dynamic active hero banner if published
  const activeSlides = useMemo(() => {
    const base = initialSlides || DEFAULT_HERO_SLIDES;

    if (
      heroBanner &&
      heroBanner.isPublished !== false &&
      typeof heroBanner.imageUrl === "string" &&
      heroBanner.imageUrl.trim().length > 0
    ) {
      const dynamicSlide = {
        src: heroBanner.imageUrl.trim(),
        alt: heroBanner.title || "Maqam Travels Hero Banner",
        isDynamic: true,
        fallback: slide1,
      };

      // Put dynamic banner first, followed by default slides
      return [dynamicSlide, ...base];
    }

    return base;
  }, [initialSlides, heroBanner]);

  useEffect(() => {
    if (activeSlides.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [activeSlides.length, isHovered, interval]);

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#045C45] ${
        offsetHeader ? "mt-16 sm:mt-18" : ""
      } ${heightClass} ${
        curved ? "rounded-b-[2rem] sm:rounded-b-[2.5rem] md:rounded-b-none" : ""
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Image Hero Showcase"
    >
      {/* Background Slides with Ken Burns zoom and Crossfade */}
      {activeSlides.map((slide, index) => {
        const isActive = index === currentSlide;
        return (
          <div
            key={slide.src || index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <img
              src={slide.src}
              alt={slide.alt || `Slide ${index + 1}`}
              fetchPriority={index === 0 ? "high" : "auto"}
              loading={index === 0 ? "eager" : "lazy"}
              className={`w-full h-full object-cover transition-transform duration-7000 ease-out ${
                isActive ? "scale-105" : "scale-100"
              }`}
              onError={(e) => {
                if (slide.fallback && e.currentTarget.src !== slide.fallback) {
                  e.currentTarget.src = slide.fallback;
                }
              }}
            />
          </div>
        );
      })}

      {/* Gentle base gradient for smooth transition with overlapping search box */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 via-black/10 to-transparent pointer-events-none z-15" />

      {/* Optional Children overlay */}
      {children && (
        <div className="relative z-20 w-full h-full flex flex-col justify-center pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
};

export default HeroSlider;

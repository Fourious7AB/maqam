import React, { useEffect } from "react";
import { BiSolidUpArrow } from "react-icons/bi";

const ScrollToTop = () => {
    const [showScrollTop, setShowScrollTop] = React.useState(false);
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  return (
    <>
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-teal-600 hover:bg-teal-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-40 cursor-pointer"
          aria-label="Scroll to top"
        >
          <BiSolidUpArrow size={24} />
        </button>
      )}
    </>
  );
};

export default ScrollToTop;

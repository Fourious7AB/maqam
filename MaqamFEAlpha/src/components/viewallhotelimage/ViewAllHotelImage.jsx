import React, { useState } from "react";
import ScrollToTop from "../ScrollToTop";
import { Star, MapPin, ChevronRight, ChevronLeft, X } from "lucide-react";
const ViewAllHotelImage = ({ hotelDetailsData }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const hotelImages = hotelDetailsData?.data?.imageUrls;

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? hotelImages.length - 1 : prev - 1,
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === hotelImages.length - 1 ? 0 : prev + 1,
    );
  };

  const handleThumbnailClick = (index) => {
    setCurrentImageIndex(index);
  };

  const handleZoomToggle = () => {
    setIsZoomed(!isZoomed);
  };

  console.log("hotelDetailsData", hotelDetailsData);

  return (
    <>
      <div className="max-w-7xl mx-auto bg-white rounded-lg px-2 py-2 mt-4">
        <h2 className="text-2xl font-bold mb-3">Dormitory Beds</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-auto">
          {(showAllImages ? hotelImages : hotelImages?.slice(0, 9)).map(
            (img, index) => (
              <div
                key={index}
                className="relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer group"
                onClick={() => {
                  setCurrentImageIndex(index);
                  setIsZoomed(true);
                }}
              >
                <img
                  src={img}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />

                {!showAllImages && index === 8 && hotelImages.length > 9 && (
                  <div
                    className="absolute inset-0 bg-black/45 flex items-center justify-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent zoom
                      setShowAllImages(true);
                    }}
                  >
                    <span className="text-white text-4xl font-bold">
                      +{hotelImages.length - 9} Photos
                    </span>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      </div>
      {isZoomed && (
        <div
          className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center"
          onClick={handleZoomToggle}
        >
          <button
            onClick={handleZoomToggle}
            className="absolute top-6 right-6 flex items-center justify-center w-12 h-12 rounded-full bg-[#2C2C3A]/80 hover:bg-[#2C2C3A] transition cursor-pointer"
          >
            <X size={28} className="text-white" strokeWidth={2.5} />
          </button>

          <button
            className="absolute left-8  rounded-full p-3 bg-[#2C2C3A]/80 hover:bg-[#2C2C3A] transition cursor-pointer "
            onClick={(e) => {
              e.stopPropagation();
              handlePrevImage();
            }}
          >
            <ChevronLeft className="text-white" siz={20} />
          </button>

          <img
            src={hotelImages[currentImageIndex]}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            className="absolute right-8  rounded-full p-3 bg-[#2C2C3A]/80 hover:bg-[#2C2C3A] transition cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleNextImage();
            }}
          >
            <ChevronRight  className="text-white" size={20} />
          </button>

          <div className="absolute bottom-8 text-white text-lg font-semibold">
            {currentImageIndex + 1} / {hotelImages.length}
          </div>
        </div>
      )}
      <ScrollToTop />
    </>
  );
};

export default ViewAllHotelImage;

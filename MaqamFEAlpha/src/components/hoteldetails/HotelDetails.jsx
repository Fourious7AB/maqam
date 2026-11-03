import { useState } from "react";
import { ArrowLeft } from "lucide-react";

const HotelDetails = ({setShowAllImages}) => {
  const [activePhotoTab, setActivePhotoTab] = useState("property");
  const [activeTab, setActiveTab] = useState("room");
  return (
    <div className="min-h-20 bg-white">
      {/* Main Header Container */}
      <div className="max-w-[1200px] mx-auto px-4">
        {/* Top Header */}
        <div className="flex items-center justify-between pt-6">
          {/* Left: Back + Hotel Name */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center justify-center text-gray-700 hover:text-black transition cursor-pointer"
              onClick={()=>setShowAllImages(false)}
            >
              <ArrowLeft size={22} strokeWidth={2}/>
            </button>

            <h1 className="text-[24px] font-bold text-gray-900 leading-none">
              Hotel Anand International
            </h1>
          </div>

          {/* Select Room Button */}
          <button
            type="button"
            className="
              bg-blue-600
              hover:bg-blue-700
              text-white
              font-bold
              text-[14px]
              px-6
              py-3
              rounded-lg
              shadow-md
              transition
              cursor-pointer
            "
          >
            SELECT ROOM
          </button>
        </div>

        {/* Photo Buttons */}
        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            onClick={() => setActivePhotoTab("property")}
            className={`
              px-3
              py-2
              rounded-lg
              text-[14px]
              border
              transition
              ${
                activePhotoTab === "property"
                  ? "border-blue-500 bg-blue-50 text-blue-700 cursor-pointer"
                  : "border-gray-300 bg-white text-gray-800 cursor-pointer"
              }
            `}
          >
            Property Photos
          </button>

          <button
            type="button"
            onClick={() => setActivePhotoTab("traveller")}
            className={`
              px-3
              py-2
              rounded-lg
              text-[14px]
              border
              transition
              ${
                activePhotoTab === "traveller"
                  ? "border-blue-500 bg-blue-50 text-blue-700 cursor-pointer"
                  : "border-gray-300 bg-white text-gray-800 cursor-pointer"
              }
            `}
          >
            Traveller Photos
          </button>
        </div>

        {/* Bottom Tabs */}
        <div className="flex items-end gap-7 mt-2 border-b border-gray-300">

          {/* Room */}
          <button
            type="button"
            onClick={() => setActiveTab("room")}
            className={`
              relative
              pb-2
              text-[15px]
              font-semibold
              transition
              ${
                activeTab === "room"
                  ? "text-gray-800 cursor-pointer"
                  : "text-gray-500 hover:text-gray-700 cursor-pointer"
              }
            `}
          >
            Room
            {activeTab === "room" && (
              <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-blue-500 rounded-t cursor-pointer"/>
            )}
          </button>

          {/* Others */}
          <button
            type="button"
            onClick={() => setActiveTab("others")}
            className={`
              relative
              pb-2
              text-[15px]
              font-semibold
              transition
              ${
                activeTab === "others"
                  ? "text-gray-800 cursor-pointer"
                  : "text-gray-500 hover:text-gray-700 cursor-pointer"
              }
            `}
          >
            Others
            {activeTab === "others" && (
              <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-blue-500 rounded-t" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotelDetails;
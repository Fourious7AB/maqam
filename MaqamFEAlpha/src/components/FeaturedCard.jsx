import { useNavigate } from "react-router-dom";
import { Star, Clock, MapPin, ArrowRight, Heart, BadgeCheck } from "lucide-react";

const FeaturedCard = ({ item }) => {
  console.log("FeaturedCard item=======", item);
  console.log("item.id:", item?.id);
  console.log("item._id:", item?._id);
  console.log("item.hotelId:", item?.hotelId);
  console.log("item.slug:", item?.slug);

  const navigation = useNavigate();

  const detailId = item?.id || item?._id || item?.hotelId || item?.slug || "default";
  console.log("Final detailId:", detailId);
  const cardTitle =
    item?.title || item?.name || item?.hotelName || "Featured Destination";
  const cardSubtitle =
    item?.duration || item?.stay || item?.durationText || "Flexible itinerary";
  const cardPrice =
    item?.price ||
    item?.priceRange ||
    item?.startingPrice ||
    item?.amount ||
    "Contact us";
  const cardLocation = item?.location || item?.city || item?.country || "";
  const cardImage =
    item?.image ||
    item?.imageUrl ||
    item?.thumbnail ||
    item?.photo ||
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800";
  const discount = item?.discount || item?.offer || null;

  const handleViewDetails = (event) => {
    event?.stopPropagation();
    if (detailId) {
      navigation(`/details/${detailId}`, {
        state: {
          hotel: item,
          item: item,
        },
      });
    }
  };

  const handleBookNow = (event) => {
    console.log("Book now clicked", event);
    console.log("detailId:", detailId);
    console.log("item:", item);
    event?.stopPropagation();
    console.log("Navigating to:", `/booking-details/${detailId}`);
    navigation(`/booking-details/${detailId}`, { state: { item } });
  };

  return (
    <div
      className="min-w-[280px] max-w-[300px] bg-white rounded-3xl flex flex-col cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden border border-gray-100 relative group"
      onClick={handleViewDetails}
    >
      {/* Discount Badge */}
      {discount && (
        <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
          {discount} OFF
        </div>
      )}

      {/* Heart Icon */}
      <button
        className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white transition group-hover:scale-110"
        onClick={(e) => {
          e.stopPropagation();
          // Add to favorites logic here
        }}
      >
        <Heart size={16} className="text-gray-400 hover:text-red-500 transition"/>
      </button>

      {/* Image with Overlay */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={cardImage}
          alt={cardTitle}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
        
        {/* Rating Badge */}
       <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-md">
          <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
          <span className="text-xs font-bold text-gray-800">4.8</span>
          <span className="text-[10px] text-gray-500">(120)</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Title */}
        <h2 className="text-[#00aa6c] text-[17px] font-bold line-clamp-2 leading-snug mb-2">
          {cardTitle}
        </h2>

        {/* Verified Badge */}
        <div className="flex items-center gap-1.5 mb-3">
          <BadgeCheck size={14} className="text-blue-500" />
          <span className="text-[11px] text-gray-500 font-medium">Verified Partner</span>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-gray-600 text-xs">
            <Clock size={14} className="text-teal-600" />
            <span className="font-medium">{cardSubtitle}</span>
          </div>

          {cardLocation && (
            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <MapPin size={14} className="text-teal-600" />
              <span className="font-medium">{cardLocation}</span>
            </div>
          )}
        </div>

        {/* Price Section */}
        <div className="mt-auto">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Starting from <span className="text-black text-lg font-bold truncate">
                 Rs. 15000-20000
                </span>
              </span>
              <div className="text-[22px] font-bold text-gray-900 leading-none mt-1">
                {cardPrice}
              </div>
            </div>
            <button  onClick={(e)=>handleBookNow(e)} className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1 hover:from-teal-700 hover:to-cyan-700 transition shadow-md cursor-pointer">
              <span className="truncate">Book Now</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedCard;

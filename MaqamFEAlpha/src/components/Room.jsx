import {
  Bed,
  Calendar,
  Crown,
  Eye,
  Gift,
  Image,
  Plus,
  Ruler,
  Users,
} from "lucide-react";

const Room = ({ hotel, getBedIcon, getAmenityIcon , openImageModal}) => {
  return (
    <>
      <div className="bg-[#F1F6FD] font-poppins">
        <div className="max-w-7xl mx-auto px-6 pb-12 ">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 ">
            {hotel.rooms?.map((room, index) => (
              <div
                key={room.id || index}
                className="group   rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl "
              >
                {/* Room Image with Gradient Overlay */}
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={
                      room.photos?.[0]?.url 
                    }
                    alt={room.roomName}
                    className="w-full h-full object-cover "
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

                  {/* Room Type Badge */}
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2">
                    <Crown size={14} />
                    {room.roomName}
                  </div>

                  {/* View Badge */}
                  {room.views?.length > 0 && (
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                      <Eye size={12} />
                      {room.views[0].view}
                    </div>
                  )}

                  {/* Size Badge */}
                  <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                    <Ruler size={12} />
                    {room.roomSizeSquare} {room.roomSizeUnit}
                  </div>
                </div>

                {/* Room Content */}
                <div className="p-6">
                  {/* Room Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {room.roomName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full">
                          <Users size={14} className="text-teal-500" />
                          <span>Max {room.maxOccupancy} guests</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full">
                          <Bed size={14} className="text-teal-500" />
                          <span>
                            {room.maxAdults} Adults + {room.maxChildren}{" "}
                            Children
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1 rounded-full">
                      <span className="text-amber-700 text-xs font-semibold">
                        Popular Choice
                      </span>
                    </div>
                  </div>

                  {/* Bed Types */}
                  {room.bedTypes && room.bedTypes.length > 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Bed size={16} className="text-teal-500" />
                        <span className="font-semibold text-gray-700 text-sm">
                          Bed Configuration
                        </span>
                        <span className="text-xs text-gray-400">
                          ({room.bedRelation})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {room.bedTypes.map((bed, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm"
                          >
                            {getBedIcon(bed.bedType)}
                            <span className="text-sm font-medium text-gray-700">
                              {bed.bedType}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({bed.bedSize})
                            </span>
                            {bed.quantity > 1 && (
                              <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                x{bed.quantity}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 "
                    dangerouslySetInnerHTML={{ __html:room.description}}>
                  </p>

                  {/* Room Amenities */}
                  {room.roomAmenities && room.roomAmenities.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Gift size={16} className="text-teal-500" />
                        <span className="font-semibold text-gray-700 text-sm">
                          In-Room Amenities
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {room.roomAmenities.map((amenity, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-teal-50 transition-colors"
                          >
                            {getAmenityIcon(amenity.name)}
                            <span>{amenity.name}</span>
                          </div>
                        ))}
                        
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-2">
                    {/* <button
                      onClick={() => {
                        setSelectedRoom(room);
                        setIsReservationModalOpen(true);
                      }}
                      className="cursor-pointer flex justify-center items-center gap-2 mt-3 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white text-base font-semibold rounded-md"
                    >
                      <Calendar size={18} />
                      Select Room
                    </button> */}
                    <button
                      onClick={() =>
                        openImageModal(
                          room.photos?.[0]?.hd_url || room.photos?.[0]?.url,
                          0,
                        )
                      }
                      className="cursor-pointer flex justify-center items-center gap-2 mt-3 px-6 py-2 border border-gray-300 text-gray-700 text-base font-semibold rounded-md"
                    >
                      <Image size={18} />
                      Photos
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Room;

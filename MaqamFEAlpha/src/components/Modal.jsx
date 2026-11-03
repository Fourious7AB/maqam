import { Star, MapPin, ChevronRight, ChevronLeft, X, ZoomIn } from "lucide-react";
import hotelimages01 from "../assets/hotelimages01.jpg";
import hotelimages02 from "../assets/hotelimages02.jpg";
import hotelimages03 from "../assets/hotelimages03.jpg";
import hotelimages04 from "../assets/hotelimages04.jpg";
import hotelimages05 from "../assets/hotelimages05.jpg";
import { useState } from "react";

   const hotelImages = [

                          {
                              image:hotelimages01,
                              label:"Hotel Main01"
                          },
                          {
                            image:hotelimages02,
                            label:"Hotel Main02"
                          },
                          {
                            image:hotelimages03,
                            label:"Hotel Main03"

                          },
                          {
                            image:hotelimages04,
                            label:"Hotel Main04"
                          },
                          {
                            image:hotelimages05,
                            label:"Hotel Main05"
                          }
      ]

const Modal = ({ isModalOpen, setModalOpen , hotelDetailsData }) => {

    const [currentImageIndex,setCurrentImageIndex] = useState(0);

    const handleNextImage = ()=>{
        if(currentImageIndex < hotelImages.length - 1){
            setCurrentImageIndex(currentImageIndex + 1);
        }
    }

    const handlePrevImage = ()=>{
        if(currentImageIndex > 0){
            setCurrentImageIndex(currentImageIndex - 1);
        }
    }

    return (
        <>
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setModalOpen(false)}
                    ></div>

                    {/* Modal */}
                    <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full z-50">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Modal Title</h2>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 transition"
                            >
                            </button>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 transition bg-gray-300 w-10 h-10 rounded-full flex items-center justify-center"
                            >
                            X
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-6">
                              <div>
                                 <img src={hotelDetailsData?.data?.imageUrls[currentImageIndex]} alt={hotelImages[currentImageIndex]}  className="w-6/6 h-1/2 rounded-lg object-cover"/>
                                    <div className={`absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-800 text-white p-2 rounded-full cursor-pointer ${
                                      currentImageIndex === hotelDetailsData?.data?.imageUrls?.length - 1
                                      ? "opacity-50 cursor-not-allowed"
                                      : "opacity-100 hover:bg-gray-900 transition"
                                    }`}>
                                      <ChevronRight size={24}  onClick={()=>handleNextImage()} />
                                  </div>
                                  <div className={`absolute top-1/2 left-0 transform -translate-y-1/2 bg-gray-800 text-white p-2 rounded-full cursor-pointer ${currentImageIndex === 0 ? "opacity-50 cursor-not-allowed" : "opacity-100 hover:bg-gray-900 transition"}`}>
                                    <ChevronLeft size={24}  onClick={()=>handlePrevImage()}/>
                                  </div>
                              </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-medium text-gray-900">Item 1</h3>
                                    <p className="text-sm text-gray-600">Description 1</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-medium text-gray-900">Item 2</h3>
                                    <p className="text-sm text-gray-600">Description 2</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )

}

export default Modal

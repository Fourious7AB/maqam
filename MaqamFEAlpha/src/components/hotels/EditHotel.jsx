import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import HotelForm from "../../components/hotels/HotelForm";
import { getHotelById, updateHotel } from "../../services/hotelService";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

export default function EditHotel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [saved, setSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getHotelById(id).then(setHotel);
  }, [id]);

  const handleSubmit = async (data) => {
    const updated = await updateHotel(id, data);
    setHotel(updated);
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  if (!hotel) {
    return <div className="p-8 text-center">Loading hotel...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="min-w-0 flex-1">
          <Header onMenu={() => setSidebarOpen(true)} />

          <main className="bg-slate-50 p-4 md:p-6 lg:p-8">
            <div className="mb-6">
              <button
                onClick={() => navigate(`/hotels/${id}`)}
                className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft size={16} />
                Back to Hotel
              </button>

              <h1 className="text-2xl font-bold text-slate-800">Edit Hotel</h1>
              <p className="mt-1 text-sm text-slate-500">
                Update hotel information, settings and room pricing.
              </p>
            </div>

            {saved && (
              <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle2 size={18} />
                Hotel information updated successfully.
              </div>
            )}

            <HotelForm
              initialData={hotel}
              onSubmit={handleSubmit}
              submitText="Save Changes"
            />
          </main>
        </div>
      </div>
    </div>
  );
}
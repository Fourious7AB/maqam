import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import HotelForm from "../../components/hotels/HotelForm";
import { createHotel } from "../../services/hotelService";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

export default function AddHotel() {
  const navigate = useNavigate();
  const [createdHotel, setCreatedHotel] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSubmit = async (data) => {
    const hotel = await createHotel(data);
    setCreatedHotel(hotel);
  };

  if (createdHotel) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
        <div className="flex min-h-screen">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="min-w-0 flex-1">
            <Header onMenu={() => setSidebarOpen(true)} />

            <main className="bg-slate-50 p-4 md:p-6 lg:p-8">
              <div className="mx-auto max-w-3xl">
                <div className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm md:p-8">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <CheckCircle2 size={30} />
                  </div>

                  <div className="mt-4 text-center">
                    <h1 className="text-xl font-bold text-slate-800">
                      Hotel Created Successfully
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      The hotel account has been created.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <Credential label="Hotel ID" value={createdHotel.id} />
                    <Credential label="Username" value={createdHotel.username} />
                    <Credential
                      label="Temporary Password"
                      value={createdHotel.temporaryPassword}
                    />
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                      onClick={() => navigate("/hotels")}
                      className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium"
                    >
                      Hotel List
                    </button>

                    <button
                      onClick={() => navigate(`/hotels/${createdHotel.id}`)}
                      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      View Hotel
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
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
                onClick={() => navigate(-1)}
                className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <h1 className="text-2xl font-bold text-slate-800">Add New Hotel</h1>
              <p className="mt-1 text-sm text-slate-500">
                Create a new hotel account and inventory.
              </p>
            </div>

            <HotelForm onSubmit={handleSubmit} submitText="Create Hotel" />
          </main>
        </div>
      </div>
    </div>
  );
}

function Credential({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 break-all font-semibold text-slate-800">{value}</p>
    </div>
  );
}
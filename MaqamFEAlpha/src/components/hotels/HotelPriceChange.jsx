import { useEffect, useState } from "react";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { getHotelById } from "../../services/hotelService";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

export default function HotelPriceChange() {
  const { id } = useParams();
  const [hotel, setHotel] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getHotelById(id).then((data) => {
      setHotel(data);

      if (data?.rooms?.length) {
        setRoomId(String(data.rooms[0].id));
      }
    });
  }, [id]);

  if (!hotel) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const selectedRoom = hotel.rooms.find(
    (room) => String(room.id) === String(roomId)
  );

  const difference =
    selectedRoom && newPrice
      ? Number(newPrice) - Number(selectedRoom.price)
      : 0;

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="min-w-0 flex-1">
          <Header onMenu={() => setSidebarOpen(true)} />

          <main className="bg-slate-50 p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-5xl">
              <Link
                to={`/hotels/${id}`}
                className="mb-5 flex items-center gap-2 text-sm text-slate-500"
              >
                <ArrowLeft size={16} />
                Back to Hotel
              </Link>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Form */}
                <div className="lg:col-span-2">
                  <div className="rounded-xl border bg-white shadow-sm">
                    <div className="border-b p-5">
                      <h1 className="text-xl font-bold text-slate-800">
                        Change Hotel Price
                      </h1>
                      <p className="mt-1 text-sm text-slate-500">{hotel.hotelName}</p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        alert("Price change saved successfully.");
                      }}
                      className="space-y-5 p-5"
                    >
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                          Room
                        </label>

                        <select
                          value={roomId}
                          onChange={(e) => setRoomId(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          {hotel.rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">
                            Current Price
                          </label>

                          <div className="rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700">
                            {selectedRoom?.currency}{" "}
                            {Number(selectedRoom?.price || 0).toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">
                            New Price
                          </label>

                          <input
                            type="number"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            placeholder="Enter new price"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                          Effective Date
                        </label>

                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                          Reason
                        </label>

                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          rows={4}
                          placeholder="Why is the price changing?"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Save Price Change
                      </button>
                    </form>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <div className="rounded-xl border bg-white shadow-sm">
                    <div className="border-b p-5">
                      <h2 className="font-semibold text-slate-800">Price Preview</h2>
                    </div>

                    <div className="p-5">
                      <p className="text-sm text-slate-500">{selectedRoom?.name}</p>

                      <div className="mt-5">
                        <p className="text-xs text-slate-400">Current</p>
                        <p className="mt-1 text-xl font-bold">
                          {selectedRoom?.currency}{" "}
                          {Number(selectedRoom?.price || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="my-5 border-t" />

                      <div>
                        <p className="text-xs text-slate-400">New Price</p>
                        <p className="mt-1 text-xl font-bold text-blue-600">
                          {selectedRoom?.currency}{" "}
                          {Number(newPrice || 0).toLocaleString()}
                        </p>
                      </div>

                      {newPrice && (
                        <div
                          className={`mt-5 flex items-center gap-2 rounded-lg p-3 text-sm ${
                            difference > 0
                              ? "bg-red-50 text-red-600"
                              : "bg-green-50 text-green-600"
                          }`}
                        >
                          {difference > 0 ? (
                            <TrendingUp size={18} />
                          ) : (
                            <TrendingDown size={18} />
                          )}

                          {difference > 0 ? "Price increase" : "Price decrease"}

                          <strong className="ml-auto">
                            {Math.abs(difference).toLocaleString()}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
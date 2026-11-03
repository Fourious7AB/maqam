import { useEffect, useState } from "react";
import { Building2, Eye, Pencil, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { getHotels } from "../../services/hotelService";
import StatusBadge from "../../components/StatusBadge";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

export default function HotelList() {
  const [hotels, setHotels] = useState([]);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getHotels().then(setHotels);
  }, []);

  const filteredHotels = hotels.filter((hotel) => {
    const query = search.toLowerCase();

    return (
      hotel.hotelName.toLowerCase().includes(query) ||
      hotel.city.toLowerCase().includes(query) ||
      hotel.id.toLowerCase().includes(query) ||
      hotel.userName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="min-w-0 flex-1">
          <Header onMenu={() => setSidebarOpen(true)} />

          <main className="bg-slate-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                    <Building2 size={20} />
                  </div>

                  <h1 className="text-2xl font-bold text-slate-800">Hotels</h1>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Manage all hotel partners and their inventory.
                </p>
              </div>

              <Link
                to="/hotels/add"
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={17} />
                Add Hotel
              </Link>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total Hotels" value={hotels.length} />
              <Stat
                label="Active"
                value={hotels.filter((hotel) => hotel.status === "Active").length}
              />
              <Stat
                label="Makkah"
                value={hotels.filter((hotel) => hotel.city === "Makkah").length}
              />
              <Stat
                label="Madinah"
                value={hotels.filter((hotel) => hotel.city === "Madinah").length}
              />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <div className="relative w-full md:max-w-sm">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search hotel..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left">
                      <th className="px-5 py-3 text-xs text-slate-500">Hotel</th>
                      <th className="px-5 py-3 text-xs text-slate-500">Hotel ID</th>
                      <th className="px-5 py-3 text-xs text-slate-500">User</th>
                      <th className="px-5 py-3 text-xs text-slate-500">City</th>
                      <th className="px-5 py-3 text-xs text-slate-500">Rooms</th>
                      <th className="px-5 py-3 text-xs text-slate-500">Status</th>
                      <th className="px-5 py-3 text-xs text-slate-500">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredHotels.map((hotel) => (
                      <tr
                        key={hotel.id}
                        className="border-b last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {hotel.hotelName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {hotel.starRating} Star
                          </p>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-slate-500">
                          {hotel.id}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {hotel.userName}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {hotel.city}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {hotel.rooms.length}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={hotel.status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex gap-1">
                            <Action to={`/hotels/${hotel.id}`} icon={Eye} />
                            <Action to={`/hotels/${hotel.id}/edit`} icon={Pencil} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="space-y-3 p-4 md:hidden">
                {filteredHotels.map((hotel) => (
                  <div key={hotel.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{hotel.hotelName}</p>
                        <p className="mt-1 font-mono text-xs text-slate-400">{hotel.id}</p>
                      </div>

                      <StatusBadge status={hotel.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Info label="User" value={hotel.userName} />
                      <Info label="City" value={hotel.city} />
                      <Info label="Rooms" value={hotel.rooms.length} />
                      <Info label="Rating" value={`${hotel.starRating} Star`} />
                    </div>

                    <div className="mt-4 flex gap-2 border-t pt-3">
                      <Link
                        to={`/hotels/${hotel.id}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 py-2 text-xs font-medium"
                      >
                        <Eye size={14} />
                        View
                      </Link>

                      <Link
                        to={`/hotels/${hotel.id}/edit`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 py-2 text-xs font-medium text-blue-600"
                      >
                        <Pencil size={14} />
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-700">{value}</p>
    </div>
  );
}

function Action({ to, icon: Icon }) {
  return (
    <Link to={to} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
      <Icon size={16} />
    </Link>
  );
}
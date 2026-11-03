import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Edit,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { getHotelById } from "../../services/hotelService";

import StatusBadge from "../StatusBadge";

export default function HotelDetails() {
  const { id } = useParams();

  const [hotel, setHotel] =
    useState(null);

  useEffect(() => {
    getHotelById(id).then(setHotel);
  }, [id]);

  if (!hotel) {
    return (
      <div className="p-8 text-center text-slate-500">
        Hotel not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/hotels"
          className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to Hotels
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                <Building2 size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {hotel.hotelName}
                </h1>

                <p className="font-mono text-xs text-slate-400">
                  {hotel.id}
                </p>
              </div>

              <StatusBadge
                status={hotel.status}
              />
            </div>
          </div>

          <Link
            to={`/hotels/${hotel.id}/edit`}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Edit size={16} />
            Edit Hotel
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 xl:col-span-2">
          {/* Hotel Information */}
          <section className="rounded-xl border bg-white shadow-sm">
            <SectionTitle title="Hotel Information" />

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
              <Info
                icon={Building2}
                label="Hotel Name"
                value={hotel.hotelName}
              />

              <Info
                icon={User}
                label="Account Holder"
                value={hotel.userName}
              />

              <Info
                icon={MapPin}
                label="City"
                value={hotel.city}
              />

              <Info
                icon={MapPin}
                label="Country"
                value={hotel.country}
              />

              <Info
                icon={Phone}
                label="Phone"
                value={hotel.phone}
              />

              <Info
                icon={Mail}
                label="Email"
                value={hotel.email}
              />

              <div className="sm:col-span-2">
                <Info
                  icon={MapPin}
                  label="Address"
                  value={hotel.address}
                />
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs text-slate-400">
                  Description
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {hotel.description}
                </p>
              </div>
            </div>
          </section>

          {/* Rooms */}
          <section className="rounded-xl border bg-white shadow-sm">
            <SectionTitle title="Rooms & Pricing" />

            <div className="divide-y">
              {hotel.rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {room.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Capacity: {room.capacity} guests
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-blue-600">
                      {room.currency}{" "}
                      {Number(
                        room.price
                      ).toLocaleString()}
                    </p>

                    <Link
                      to={`/hotels/${hotel.id}/price-change`}
                      className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100"
                    >
                      Change Price
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Settings */}
          <section className="rounded-xl border bg-white shadow-sm">
            <SectionTitle title="Hotel Settings" />

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
              <Info
                icon={Clock}
                label="Check In"
                value={hotel.checkIn}
              />

              <Info
                icon={Clock}
                label="Check Out"
                value={hotel.checkOut}
              />

              <Info
                icon={Building2}
                label="Star Rating"
                value={`${hotel.starRating} Star`}
              />

              <Info
                icon={Calendar}
                label="Created"
                value={hotel.createdAt}
              />
            </div>
          </section>
        </div>

        {/* Right */}
        <div className="space-y-6">
          {/* Credentials */}
          <section className="rounded-xl border bg-white shadow-sm">
            <SectionTitle title="Login Credentials" />

            <div className="space-y-4 p-5">
              <Credential
                icon={KeyRound}
                label="Hotel ID"
                value={hotel.id}
              />

              <Credential
                icon={User}
                label="Username"
                value={hotel.username}
              />

              <Credential
                icon={KeyRound}
                label="Password"
                value="••••••••"
              />

              <p className="rounded-lg bg-yellow-50 p-3 text-xs leading-5 text-yellow-700">
                For security, the current password
                is not displayed.
              </p>
            </div>
          </section>

          {/* Quick actions */}
          <section className="rounded-xl border bg-white shadow-sm">
            <SectionTitle title="Quick Actions" />

            <div className="space-y-2 p-4">
              <Link
                to={`/hotels/${hotel.id}/edit`}
                className="flex items-center gap-3 rounded-lg p-3 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Edit size={17} />
                Edit Hotel
              </Link>

              <Link
                to={`/hotels/${hotel.id}/price-change`}
                className="flex items-center gap-3 rounded-lg p-3 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Clock size={17} />
                Change Hotel Price
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <div className="border-b p-5">
      <h2 className="font-semibold text-slate-800">
        {title}
      </h2>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-slate-400">
        <Icon size={16} />
      </div>

      <div>
        <p className="text-xs text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

function Credential({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icon size={14} />
        {label}
      </div>

      <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}
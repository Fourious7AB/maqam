import { ArrowLeft, Plane, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import StatusBadge from "../../components/flights/StatusBadge";
import { initialFlights } from "../../data/flights";
import { useState } from "react";

export default function FlightDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const flight = initialFlights.find(
    (item) => item.id === Number(id)
  );

  if (!flight) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="p-8">
          <h1 className="text-xl font-bold">
            Flight not found
          </h1>

          <button
            onClick={() => navigate("/flights")}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Back to Flights
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="min-w-0 flex-1">
          <Header onMenu={() => setSidebarOpen(true)} />

          <main className="p-4 md:p-6 lg:p-8">

            {/* Top */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <button
                  onClick={() => navigate("/flights")}
                  className="mb-3 flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
                >
                  <ArrowLeft size={16} />
                  Back to Flights
                </button>

                <h1 className="text-2xl font-bold text-slate-800">
                  Flight Details
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Complete information for {flight.flightNumber}
                </p>
              </div>

              <button
                onClick={() => navigate(`/flights/${flight.id}/edit`)}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Pencil size={16} />
                Edit Flight
              </button>
            </div>

            {/* Main Flight Card */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

              {/* Airline Header */}
              <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Airline
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-800">
                    {flight.airline}
                  </h2>

                  <p className="mt-1 text-sm font-medium text-blue-600">
                    {flight.flightNumber}
                  </p>
                </div>

                <StatusBadge status={flight.status} />
              </div>

              {/* Route */}
              <div className="p-5 md:p-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-center">

                  <Airport
                    code={flight.from}
                    name={flight.departureAirport}
                    date={flight.departureDate}
                    time={`${flight.departureTime} ${flight.departurePeriod}`}
                    label="Departure"
                  />

                  <div className="flex flex-col items-center">
                    <Plane
                      size={28}
                      className="rotate-90 text-blue-500 md:rotate-0"
                    />

                    <div className="mt-2 h-px w-full bg-slate-200" />

                    <span className="mt-2 text-xs text-slate-400">
                      {flight.duration}
                    </span>
                  </div>

                  <Airport
                    code={flight.to}
                    name={flight.arrivalAirport}
                    date={flight.arrivalDate}
                    time={`${flight.arrivalTime} ${flight.arrivalPeriod}`}
                    label="Arrival"
                    align="right"
                  />

                </div>
              </div>
            </div>

            {/* Information */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

              <InfoCard title="Flight Information">
                <InfoRow
                  label="Flight Number"
                  value={flight.flightNumber}
                />

                <InfoRow
                  label="Airline"
                  value={flight.airline}
                />

                <InfoRow
                  label="Aircraft"
                  value={flight.aircraft}
                />

                <InfoRow
                  label="Duration"
                  value={flight.duration}
                />

                <InfoRow
                  label="Status"
                  value={flight.status}
                />
              </InfoCard>

              <InfoCard title="Airport Information">
                <InfoRow
                  label="Departure Airport"
                  value={`${flight.from} - ${flight.departureAirport}`}
                />

                <InfoRow
                  label="Arrival Airport"
                  value={`${flight.to} - ${flight.arrivalAirport}`}
                />

                <InfoRow
                  label="Terminal"
                  value={flight.terminal}
                />

                <InfoRow
                  label="Gate"
                  value={flight.gate}
                />
              </InfoCard>

              <InfoCard title="Baggage Information">
                <InfoRow
                  label="Checked Baggage"
                  value={flight.baggage}
                />

                <InfoRow
                  label="Cabin Baggage"
                  value={flight.cabinBaggage}
                />

                <InfoRow
                  label="Refundable"
                  value={flight.refundable ? "Yes" : "No"}
                />
              </InfoCard>

              <InfoCard title="Schedule">
                <InfoRow
                  label="Departure Date"
                  value={flight.departureDate}
                />

                <InfoRow
                  label="Departure Time"
                  value={`${flight.departureTime} ${flight.departurePeriod}`}
                />

                <InfoRow
                  label="Arrival Date"
                  value={flight.arrivalDate}
                />

                <InfoRow
                  label="Arrival Time"
                  value={`${flight.arrivalTime} ${flight.arrivalPeriod}`}
                />
              </InfoCard>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Airport({
  code,
  name,
  date,
  time,
  label,
  align = "left",
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-3xl font-bold text-slate-800">
        {code}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {name}
      </p>

      <p className="mt-3 text-lg font-semibold text-slate-700">
        {time}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {date}
      </p>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-slate-800">
        {title}
      </h3>

      <div className="divide-y divide-slate-100">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-medium text-slate-800">
        {value || "-"}
      </span>
    </div>
  );
}
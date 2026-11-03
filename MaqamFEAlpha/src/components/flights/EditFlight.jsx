import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import Input from "../../components/flights/Input";

import { initialFlights } from "../../data/flights";

export default function EditFlight() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const flight = initialFlights.find(
    (item) => item.id === Number(id)
  );

  const [formData, setFormData] = useState(null);

  const [sameDateArrival, setSameDateArrival] = useState(
    flight?.sameDateArrival ?? true
  );

  useEffect(() => {
    if (flight) {
      setFormData({
        ...flight,
      });
    }
  }, [id]);

  if (!flight) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
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
    );
  }

  if (!formData) {
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDepartureDateChange = (e) => {
    const date = e.target.value;

    setFormData((prev) => ({
      ...prev,
      departureDate: date,
      ...(sameDateArrival
        ? {
            arrivalDate: date,
          }
        : {}),
    }));
  };

  const handleSameDateChange = (e) => {
    const checked = e.target.checked;

    setSameDateArrival(checked);

    if (checked) {
      setFormData((prev) => ({
        ...prev,
        arrivalDate: prev.departureDate,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const updatedFlight = {
      ...formData,
      sameDateArrival,
    };

    console.log("UPDATED FLIGHT:", updatedFlight);

    /*
      IMPORTANT:

      For now this only logs the updated information.

      When you connect your backend, replace this section
      with your API request, for example:

      await fetch(`/api/flights/${flight.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedFlight),
      });
    */

    alert("Flight updated successfully!");

    navigate("/flights");
  };

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

            {/* Header */}
            <div className="mb-6">
              <button
                onClick={() =>
                  navigate(`/flights/${flight.id}`)
                }
                className="mb-3 flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
              >
                <ArrowLeft size={16} />
                Back to Flight Details
              </button>

              <h1 className="text-2xl font-bold text-slate-800">
                Edit Flight
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Update information for {flight.flightNumber}
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >

              {/* Form Header */}
              <div className="border-b border-slate-200 p-5">
                <h2 className="font-semibold text-slate-800">
                  Flight Information
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Change any information below and save your changes.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">

                {/* Airline */}
                <Input
                  label="Airline"
                  name="airline"
                  value={formData.airline}
                  onChange={handleChange}
                  required
                />

                {/* Flight */}
                <Input
                  label="Flight Number"
                  name="flightNumber"
                  value={formData.flightNumber}
                  onChange={handleChange}
                  required
                />

                {/* From */}
                <Input
                  label="Departure Airport Code"
                  name="from"
                  value={formData.from}
                  onChange={handleChange}
                  required
                />

                {/* To */}
                <Input
                  label="Arrival Airport Code"
                  name="to"
                  value={formData.to}
                  onChange={handleChange}
                  required
                />

                {/* Departure Airport */}
                <Input
                  label="Departure Airport"
                  name="departureAirport"
                  value={formData.departureAirport}
                  onChange={handleChange}
                  required
                />

                {/* Arrival Airport */}
                <Input
                  label="Arrival Airport"
                  name="arrivalAirport"
                  value={formData.arrivalAirport}
                  onChange={handleChange}
                  required
                />

                {/* Departure Date */}
                <Input
                  label="Starting Date"
                  name="departureDate"
                  type="date"
                  value={formData.departureDate}
                  onChange={handleDepartureDateChange}
                  required
                />

                {/* Arrival Date */}
                <div>
                  <Input
                    label="Ending Date"
                    name="arrivalDate"
                    type="date"
                    value={formData.arrivalDate}
                    onChange={handleChange}
                    disabled={sameDateArrival}
                    required
                  />

                  <label className="mt-2 flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sameDateArrival}
                      onChange={handleSameDateChange}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />

                    <span className="text-xs font-medium text-slate-600">
                      Same date arrival
                    </span>
                  </label>
                </div>

                {/* Departure Time */}
                <TimeInput
                  label="Departure Time"
                  timeName="departureTime"
                  periodName="departurePeriod"
                  time={formData.departureTime}
                  period={formData.departurePeriod}
                  onChange={handleChange}
                />

                {/* Arrival Time */}
                <TimeInput
                  label="Arrival Time"
                  timeName="arrivalTime"
                  periodName="arrivalPeriod"
                  time={formData.arrivalTime}
                  period={formData.arrivalPeriod}
                  onChange={handleChange}
                />

                {/* Aircraft */}
                <Input
                  label="Aircraft"
                  name="aircraft"
                  value={formData.aircraft}
                  onChange={handleChange}
                />

                {/* Duration */}
                <Input
                  label="Duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                />

                {/* Terminal */}
                <Input
                  label="Terminal"
                  name="terminal"
                  value={formData.terminal}
                  onChange={handleChange}
                />

                {/* Gate */}
                <Input
                  label="Gate"
                  name="gate"
                  value={formData.gate}
                  onChange={handleChange}
                />

                {/* Baggage */}
                <Input
                  label="Checked Baggage"
                  name="baggage"
                  value={formData.baggage}
                  onChange={handleChange}
                />

                {/* Cabin Baggage */}
                <Input
                  label="Cabin Baggage"
                  name="cabinBaggage"
                  value={formData.cabinBaggage}
                  onChange={handleChange}
                />

                {/* Status */}
                <div>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600">
                      Status
                    </span>

                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="Active">
                        Active
                      </option>

                      <option value="Inactive">
                        Inactive
                      </option>
                    </select>
                  </label>
                </div>

                {/* Refundable */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-2">
                    <input
                      type="checkbox"
                      checked={formData.refundable}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          refundable: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />

                    <span className="text-sm text-slate-600">
                      Refundable ticket
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/flights/${flight.id}`)
                  }
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Save size={16} />
                  Update Flight
                </button>

              </div>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}

function TimeInput({
  label,
  timeName,
  periodName,
  time,
  period,
  onChange,
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </span>

      <div className="flex gap-2">
        <input
          type="time"
          name={timeName}
          value={time}
          onChange={onChange}
          required
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <select
          name={periodName}
          value={period}
          onChange={onChange}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}
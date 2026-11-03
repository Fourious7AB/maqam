import { useState } from "react";
import Input from "./Input";

export default function AddFlightModal({ onClose, onAdd }) {
  const [sameDateArrival, setSameDateArrival] = useState(true);

  const [formData, setFormData] = useState({
    airline: "",
    flightNumber: "",
    from: "",
    to: "",

    departureAirport: "",
    arrivalAirport: "",

    departureDate: "",
    arrivalDate: "",

    departureTime: "",
    departurePeriod: "AM",

    arrivalTime: "",
    arrivalPeriod: "PM",

    status: "Active",

    aircraft: "",
    terminal: "",
    gate: "",

    baggage: "",
    cabinBaggage: "",
    duration: "",
    refundable: true,
  });

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
      ...(sameDateArrival ? { arrivalDate: date } : {}),
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

    onAdd({
      ...formData,
      id: Date.now(),
      sameDateArrival,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-800">
              Add Flight
            </h2>

            <p className="text-xs text-slate-500">
              Add a new flight to inventory.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2"
        >
          <Input
            label="Airline"
            name="airline"
            placeholder="Saudi Airlines"
            value={formData.airline}
            onChange={handleChange}
            required
          />

          <Input
            label="Flight Number"
            name="flightNumber"
            placeholder="SV123"
            value={formData.flightNumber}
            onChange={handleChange}
            required
          />

          <Input
            label="Departure Airport Code"
            name="from"
            placeholder="DEL"
            value={formData.from}
            onChange={handleChange}
            required
          />

          <Input
            label="Arrival Airport Code"
            name="to"
            placeholder="JED"
            value={formData.to}
            onChange={handleChange}
            required
          />

          <Input
            label="Departure Airport"
            name="departureAirport"
            placeholder="Indira Gandhi International Airport"
            value={formData.departureAirport}
            onChange={handleChange}
            required
          />

          <Input
            label="Arrival Airport"
            name="arrivalAirport"
            placeholder="King Abdulaziz International Airport"
            value={formData.arrivalAirport}
            onChange={handleChange}
            required
          />

          <Input
            label="Starting Date"
            name="departureDate"
            type="date"
            value={formData.departureDate}
            onChange={handleDepartureDateChange}
            required
          />

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

            <label className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={sameDateArrival}
                onChange={handleSameDateChange}
                className="h-4 w-4"
              />

              <span className="text-xs font-medium text-slate-600">
                Same date arrival
              </span>
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Departure Time
            </span>

            <div className="flex gap-2">
              <input
                type="time"
                name="departureTime"
                value={formData.departureTime}
                onChange={handleChange}
                required
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />

              <select
                name="departurePeriod"
                value={formData.departurePeriod}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Arrival Time
            </span>

            <div className="flex gap-2">
              <input
                type="time"
                name="arrivalTime"
                value={formData.arrivalTime}
                onChange={handleChange}
                required
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />

              <select
                name="arrivalPeriod"
                value={formData.arrivalPeriod}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>

          <Input
            label="Aircraft"
            name="aircraft"
            placeholder="Boeing 777"
            value={formData.aircraft}
            onChange={handleChange}
          />

          <Input
            label="Duration"
            name="duration"
            placeholder="6h 45m"
            value={formData.duration}
            onChange={handleChange}
          />

          <Input
            label="Terminal"
            name="terminal"
            placeholder="Terminal 3"
            value={formData.terminal}
            onChange={handleChange}
          />

          <Input
            label="Gate"
            name="gate"
            placeholder="G12"
            value={formData.gate}
            onChange={handleChange}
          />

          <Input
            label="Baggage"
            name="baggage"
            placeholder="30 KG"
            value={formData.baggage}
            onChange={handleChange}
          />

          <Input
            label="Cabin Baggage"
            name="cabinBaggage"
            placeholder="7 KG"
            value={formData.cabinBaggage}
            onChange={handleChange}
          />

          <div className="sm:col-span-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Status
              </span>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="refundable"
                checked={formData.refundable}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    refundable: e.target.checked,
                  }))
                }
              />

              <span className="text-sm text-slate-600">
                Refundable ticket
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save Flight
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
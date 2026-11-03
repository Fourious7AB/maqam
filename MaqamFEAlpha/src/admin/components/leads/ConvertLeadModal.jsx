import { useState } from "react";
import { UserCheck, MapPin, Users, Wallet, Phone, Mail } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import formatCurrency from "../../utils/formatCurrency";

export default function ConvertLeadModal({ open, lead, onClose, onConvert, loading = false }) {
  const [customerType, setCustomerType] = useState("new");
  const [createBooking, setCreateBooking] = useState(true);

  if (!open || !lead) return null;

  const leadName = lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Lead";

  return (
    <Modal open={open} title={`Convert Lead — ${leadName}`} onClose={onClose} size="md">
      <div className="space-y-4">
        {/* Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3.5 text-xs text-emerald-900">
          <UserCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div className="space-y-1">
            <p className="font-semibold text-emerald-950">Advance lead to Won & Booked</p>
            <p className="text-emerald-800/90 leading-relaxed">
              Converting will close this sales opportunity as Won, verify or create the customer record, and link travel requirements to an operations booking record.
            </p>
          </div>
        </div>

        {/* Lead Dossier Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">{leadName}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
              {lead.status || "Qualified"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            {lead.phone && (
              <span className="flex items-center gap-1.5 truncate">
                <Phone size={13} className="text-slate-400 shrink-0" />
                {lead.phone}
              </span>
            )}
            {lead.email && (
              <span className="flex items-center gap-1.5 truncate">
                <Mail size={13} className="text-slate-400 shrink-0" />
                {lead.email}
              </span>
            )}
            {lead.destination && (
              <span className="flex items-center gap-1.5 truncate">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                {lead.destination}
              </span>
            )}
            {(lead.travelers || lead.numberOfPeople) && (
              <span className="flex items-center gap-1.5 truncate">
                <Users size={13} className="text-slate-400 shrink-0" />
                {lead.travelers || lead.numberOfPeople} Travelers
              </span>
            )}
          </div>

          {(lead.quotedPrice || lead.budget) ? (
            <div className="mt-1 flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs">
              <span className="text-slate-500 font-medium">
                {lead.quotedPrice > 0 ? "Final Quoted Deal Value" : "Estimated Budget"}
              </span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Wallet size={12} className="text-emerald-600" />
                {formatCurrency(lead.quotedPrice || lead.budget)}
              </span>
            </div>
          ) : null}
        </div>

        {/* Account Provisioning Option */}
        <div className="space-y-1.5">
          <label htmlFor="customer-type-select" className="block text-xs font-bold text-slate-700">
            Customer Account Allocation
          </label>
          <select
            id="customer-type-select"
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="new">Create new customer profile from lead details</option>
            <option value="existing">Link to existing customer account (by phone/email)</option>
          </select>
        </div>

        {/* Booking toggle */}
        <label className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 p-3 hover:bg-slate-50 cursor-pointer transition">
          <input
            type="checkbox"
            checked={createBooking}
            onChange={(e) => setCreateBooking(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-800 block">Initialize booking dossier</span>
            <span className="text-slate-500 text-[11px]">Generate a confirmed package booking in the operations queue</span>
          </div>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={() => onConvert({ customerType, createBooking })}
            className="!bg-emerald-700 hover:!bg-emerald-800"
          >
            Confirm & Convert Deal
          </Button>
        </div>
      </div>
    </Modal>
  );
}

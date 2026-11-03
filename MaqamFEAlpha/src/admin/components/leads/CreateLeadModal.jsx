import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Input from "../common/Input";
import { leadsApi } from "../../features/leads/leadsApi";

const emptyForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  destination: "",
  travelFrom: "",
  travelTo: "",
  numberOfPeople: "2",
  budget: "",
  priority: "medium",
  source: "Website",
  assignedTo: "",
  specialRequests: "",
};

export default function CreateLeadModal({ open, onClose, onCreated, agents = [] }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [agentList, setAgentList] = useState(agents);

  useEffect(() => {
    if (!agents.length && open) {
      leadsApi.listAgents().then((res) => {
        if (Array.isArray(res) && res.length) setAgentList(res);
      }).catch(() => {});
    } else {
      setAgentList(agents);
    }
  }, [open, agents]);

  const updateField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      toast.error("First name, last name and phone number are required");
      return;
    }

    const travelDates = form.travelFrom || form.travelTo
      ? { from: form.travelFrom || form.travelTo, to: form.travelTo || form.travelFrom }
      : undefined;

    try {
      setSaving(true);
      await leadsApi.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        destination: form.destination.trim() || undefined,
        travelDates,
        numberOfPeople: Number(form.numberOfPeople || 1),
        budget: form.budget === "" ? undefined : Number(form.budget),
        priority: form.priority,
        source: form.source,
        assignedTo: form.assignedTo || undefined,
        specialRequests: form.specialRequests.trim() || undefined,
      });
      toast.success("Lead captured successfully");
      setForm(emptyForm);
      onClose?.();
      onCreated?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to create lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Add New Lead / Enquiry" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Contact Info */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="First Name *"
            required
            placeholder="e.g. Ahmed"
            value={form.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
          />
          <Input
            label="Last Name *"
            required
            placeholder="e.g. Khan"
            value={form.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
          />
          <Input
            label="Phone Number *"
            required
            placeholder="e.g. +91 9876543210"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. ahmed.khan@example.com"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
        </div>

        {/* Travel Specs */}
        <div className="grid gap-3 sm:grid-cols-3 border-t border-slate-100 pt-3">
          <Input
            label="Destination"
            placeholder="e.g. Makkah & Madinah"
            value={form.destination}
            onChange={(event) => updateField("destination", event.target.value)}
          />
          <Input
            label="Number of Travelers"
            type="number"
            min={1}
            value={form.numberOfPeople}
            onChange={(event) => updateField("numberOfPeople", event.target.value)}
          />
          <Input
            label="Target Budget (₹)"
            type="number"
            min={0}
            placeholder="e.g. 250000"
            value={form.budget}
            onChange={(event) => updateField("budget", event.target.value)}
          />
        </div>

        {/* Dates */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Travel Start Date"
            type="date"
            value={form.travelFrom}
            onChange={(event) => updateField("travelFrom", event.target.value)}
          />
          <Input
            label="Travel Return Date"
            type="date"
            value={form.travelTo}
            onChange={(event) => updateField("travelTo", event.target.value)}
          />
        </div>

        {/* Metadata & Attribution */}
        <div className="grid gap-3 sm:grid-cols-3 border-t border-slate-100 pt-3">
          <label className="block text-xs font-semibold text-slate-700">
            Priority
            <select
              value={form.priority}
              onChange={(e) => updateField("priority", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Lead Source
            <select
              value={form.source}
              onChange={(e) => updateField("source", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
            >
              <option value="Website">Website Form</option>
              <option value="WhatsApp">WhatsApp Inbound</option>
              <option value="Referral">Client Referral</option>
              <option value="Direct Call">Direct Phone Call</option>
              <option value="Sales Agent">Sales Agent</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Assign Sales Agent
            <select
              value={form.assignedTo}
              onChange={(e) => updateField("assignedTo", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
            >
              <option value="">Unassigned</option>
              {agentList.map((a) => (
                <option key={a._id || a.name} value={a.name || a._id}>
                  {a.name || [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Special Requests */}
        <div className="border-t border-slate-100 pt-3">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Special Requests & Client Notes
          </label>
          <textarea
            rows={2}
            placeholder="e.g. 5-star hotel near Haram, elder wheelchair assistance, executive transport"
            value={form.specialRequests}
            onChange={(event) => updateField("specialRequests", event.target.value)}
            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} className="!bg-emerald-700 hover:!bg-emerald-800 font-bold">
            Create Lead
          </Button>
        </div>
      </form>
    </Modal>
  );
}

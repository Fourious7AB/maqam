import { useState, useEffect } from "react";
import { UserRound, UserCheck, ShieldAlert } from "lucide-react";
import { toast } from "react-toastify";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import { quotesApi } from "../quotesApi";
import { leadsApi } from "../../leads/leadsApi";

export default function AssignQuoteModal({
  open,
  quote,
  onClose,
  onAssigned,
  agents = [],
}) {
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [agentList, setAgentList] = useState(agents);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && quote) {
      const currentId =
        typeof quote.assignedTo === "object"
          ? quote.assignedTo?._id
          : quote.assignedTo || quote.assignedAgent?._id || "";
      setSelectedAgentId(currentId);
    }
  }, [open, quote]);

  useEffect(() => {
    if (!agents.length && open) {
      leadsApi
        .listAgents()
        .then((res) => {
          if (Array.isArray(res) && res.length) setAgentList(res);
        })
        .catch(() => {});
    } else {
      setAgentList(agents);
    }
  }, [open, agents]);

  if (!open || !quote) return null;

  const quoteId = quote._id || quote.id;
  const quoteRef = quote.quoteReference || "Quote";
  const customerName = quote.customerName || "Customer";

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedAgentId) {
      toast.warning("Please choose a travel specialist to assign");
      return;
    }

    const selectedAgent = agentList.find(
      (a) => (a._id || a.id) === selectedAgentId
    );
    const agentName =
      selectedAgent?.name ||
      [selectedAgent?.firstName, selectedAgent?.lastName].filter(Boolean).join(" ") ||
      "Travel Specialist";
    const agentEmail = selectedAgent?.email || "";

    try {
      setLoading(true);
      const res = await quotesApi.assign(quoteId, {
        agentId: selectedAgentId,
        agentName,
        agentEmail,
      });
      toast.success(`Assigned quotation ${quoteRef} to ${agentName}`);
      onAssigned?.(res.quotation);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to assign specialist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Assign Specialist — ${quoteRef}`}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={handleAssign} className="space-y-4">
        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3.5 text-xs text-emerald-950">
          <UserCheck size={18} className="mt-0.5 shrink-0 text-emerald-700" />
          <div className="space-y-1">
            <p className="font-bold">Assign Quotation Lead</p>
            <p className="text-emerald-900 leading-relaxed">
              Designate a travel specialist to own client relationship, draft itinerary proposals, and follow up directly with <strong>{customerName}</strong>.
            </p>
          </div>
        </div>

        {/* Lead Dossier Pill */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">{customerName}</span>
            <span className="font-mono text-[11px] text-slate-500">{quoteRef}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <span>Destination: <strong>{quote.destination || "Umrah"}</strong></span>
            <span>Pax: <strong>{quote.numberOfPeople || 2}</strong></span>
          </div>
        </div>

        {/* Agent Select */}
        <div className="space-y-1.5">
          <label
            htmlFor="quote-assign-agent-select"
            className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"
          >
            <UserRound size={13} /> Select Travel Specialist
          </label>
          <select
            id="quote-assign-agent-select"
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">Select a specialist...</option>
            {agentList.map((agent) => {
              const id = agent._id || agent.id;
              const name =
                agent.name ||
                [agent.firstName, agent.lastName].filter(Boolean).join(" ") ||
                agent.email;
              return (
                <option key={id} value={id}>
                  {name} ({agent.email || "Specialist"})
                </option>
              );
            })}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="!h-9 !px-3.5 !text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!selectedAgentId || loading}
            className="!h-9 !px-4 !text-xs !bg-emerald-700 hover:!bg-emerald-800"
          >
            Confirm Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

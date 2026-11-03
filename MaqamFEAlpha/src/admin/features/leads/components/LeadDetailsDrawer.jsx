import { useEffect, useState } from "react";
import {
  X, Phone, Mail, MapPin, Users, Calendar, Wallet,
  UserRound, MessageSquare, Plus, CheckCircle, ExternalLink,
  MessageCircle, Send, FileText, MessageSquareQuote, Tag, Sparkles, AlertCircle, RotateCcw
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button";
import formatCurrency from "../../../utils/formatCurrency";
import { leadsApi } from "../leadsApi";

const STAGES = [
  { key: "new", label: "New", tone: "bg-amber-500 text-white" },
  { key: "contacted", label: "Contacted", tone: "bg-blue-500 text-white" },
  { key: "qualified", label: "Qualified", tone: "bg-indigo-500 text-white" },
  { key: "proposal", label: "Proposal", tone: "bg-purple-500 text-white" },
  { key: "negotiation", label: "Negotiation", tone: "bg-rose-500 text-white" },
  { key: "won", label: "Won", tone: "bg-emerald-600 text-white" },
  { key: "lost", label: "Lost", tone: "bg-slate-500 text-white" },
];

export default function LeadDetailsDrawer({
  lead,
  open,
  onClose,
  onUpdateLead,
  onOpenConvert,
  agents = [],
}) {
  const [activeLead, setActiveLead] = useState(lead);
  const [noteText, setNoteText] = useState("");
  const [channel, setChannel] = useState("Call");
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  useEffect(() => {
    setActiveLead(lead);
  }, [lead]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !activeLead) return null;

  const leadId = activeLead.id || activeLead._id;
  const leadName = activeLead.name || [activeLead.firstName, activeLead.lastName].filter(Boolean).join(" ") || "Lead";
  const currentStatus = activeLead.status || "new";
  const isWebsite = String(activeLead.source || "").toLowerCase().includes("website");

  const handleStageChange = async (newStage) => {
    if (newStage === currentStatus) return;
    try {
      setUpdatingStage(true);
      const updated = await leadsApi.updateStatus(leadId, newStage);
      setActiveLead(updated);
      onUpdateLead?.(updated);
      toast.success(`Lead moved to ${newStage.toUpperCase()}`);
    } catch {
      toast.error("Failed to update lead stage");
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      setAddingNote(true);
      const updated = await leadsApi.addNote(leadId, {
        note: noteText.trim(),
        channel,
        author: activeLead.assignedTo || "Sales Agent",
      });
      setActiveLead(updated);
      onUpdateLead?.(updated);
      setNoteText("");
      toast.success("Customer conversation note logged");
    } catch {
      toast.error("Failed to add conversation note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleAgentAssign = async (agentName) => {
    try {
      const updated = await leadsApi.update(leadId, { assignedTo: agentName });
      setActiveLead(updated);
      onUpdateLead?.(updated);
      toast.success(`Assigned to ${agentName}`);
    } catch {
      toast.error("Failed to assign agent");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Blurred Backdrop click target */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 pointer-events-none">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-screen max-w-xl bg-white shadow-2xl flex flex-col pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-base font-black text-emerald-800 border border-emerald-100">
                {leadName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 leading-none">{leadName}</h2>
                  <Link
                    to={`/admin/leads/${leadId}`}
                    title="Open full page"
                    className="text-slate-400 hover:text-emerald-700 transition"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-slate-500 font-medium">ID: {leadId}</p>
                  {isWebsite && (
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-100">
                      🌐 Website Lead
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Contact & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-3">
            {activeLead.phone && (
              <a
                href={`tel:${activeLead.phone}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <Phone size={13} className="text-slate-500" />
                <span>Call</span>
              </a>
            )}
            {activeLead.phone && (
              <a
                href={`https://wa.me/${activeLead.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition"
              >
                <MessageCircle size={13} className="text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            )}
            {activeLead.email && (
              <a
                href={`mailto:${activeLead.email}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <Mail size={13} className="text-slate-500" />
                <span>Email</span>
              </a>
            )}

            <Link
              to={`/admin/quotes?id=${leadId}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition"
              title="Issue official proposal via Quotations Desk"
            >
              <FileText size={13} className="text-emerald-700" />
              <span>Quotations Desk</span>
            </Link>

            {!["won", "converted"].includes(currentStatus) && onOpenConvert && (
              <Button
                onClick={() => onOpenConvert(activeLead)}
                className="!ml-auto !h-8 !px-3 !text-xs !font-bold !bg-emerald-700 hover:!bg-emerald-800"
              >
                <CheckCircle size={13} />
                <span>Convert to Booking</span>
              </Button>
            )}
          </div>

          {/* Body Content (scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Stage Stepper */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Deal Stage
                </span>
                <span className="text-xs font-semibold text-slate-500 capitalize">
                  Current: {currentStatus.replace("_", " ")}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((s) => {
                  const isActive = currentStatus === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => handleStageChange(s.key)}
                      disabled={updatingStage}
                      className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                        isActive
                          ? `${s.tone} shadow-xs ring-2 ring-emerald-500/20`
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Travel Requirements & Specs */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Travel Requirements
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                    <MapPin size={13} className="text-slate-500" /> Destination
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{activeLead.destination || "Not specified"}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                    <Users size={13} className="text-slate-500" /> Travelers
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {activeLead.travelers || activeLead.numberOfPeople || 1} Pax
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                    <Wallet size={13} className="text-emerald-600" /> Quoted Budget
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {activeLead.budget ? formatCurrency(activeLead.budget) : "Open"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                    <Calendar size={13} className="text-slate-500" /> Travel Dates
                  </span>
                  <p className="font-bold text-slate-900 text-xs truncate">
                    {activeLead.travelDates?.from
                      ? `${activeLead.travelDates.from} → ${activeLead.travelDates.to || ""}`
                      : activeLead.travelFrom
                        ? `${activeLead.travelFrom} → ${activeLead.travelTo || ""}`
                        : "Flexible"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quotations Desk Handshake (Centralizes proposal creation to Quotations Desk) */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Tag size={13} className="text-emerald-700" />
                  <span>Quotation Desk Workflow</span>
                </span>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {activeLead.quotedPrice > 0 ? "Quoted Proposal Active" : "Quoting Desk Integration"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Current Quoted Deal Value</span>
                  <span className="font-extrabold text-emerald-900 text-sm">
                    {activeLead.quotedPrice > 0 ? formatCurrency(activeLead.quotedPrice) : "Not Quoted Yet"}
                  </span>
                </div>
                <Link
                  to={`/admin/quotes?id=${leadId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 transition"
                >
                  <FileText size={13} />
                  <span>Open in Quotations Desk</span>
                </Link>
              </div>
            </div>

            {/* Customer Direct Response / Feedback (if available) */}
            {activeLead.customerResponse?.action && (
              <div className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                activeLead.customerResponse.action === "accepted"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : activeLead.customerResponse.action === "changes_requested"
                  ? "border-sky-200 bg-sky-50 text-sky-950"
                  : "border-rose-200 bg-rose-50 text-rose-950"
              }`}>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1.5">
                    {activeLead.customerResponse.action === "accepted" ? (
                      <><Sparkles size={13} className="text-emerald-700" /> Customer Accepted Proposal</>
                    ) : activeLead.customerResponse.action === "changes_requested" ? (
                      <><AlertCircle size={13} className="text-sky-700" /> Customer Revision Requested</>
                    ) : (
                      <><RotateCcw size={13} className="text-rose-700" /> Proposal Declined</>
                    )}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">
                    {activeLead.customerResponse.respondedAt ? new Date(activeLead.customerResponse.respondedAt).toLocaleDateString() : ""}
                  </span>
                </div>
                {activeLead.customerResponse.note && (
                  <p className="italic bg-white/70 p-2 rounded-lg border border-black/5 text-slate-800 leading-relaxed">
                    &ldquo;{activeLead.customerResponse.note}&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* Customer Conversation & Dialogue Notes */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-emerald-600" />
                  <span>Customer Conversation & Dialogue Notes</span>
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-100">
                  {activeLead.timeline?.length || 0} dialogue entries
                </span>
              </div>

              {/* Active Customer Conversation / Follow-up Note */}
              {(activeLead.conversationNote || activeLead.contactNotes) && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-emerald-700" />
                      <span>Active Customer Conversation Note</span>
                    </span>
                    {activeLead.conversationChannel && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        {activeLead.conversationChannel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-950 italic bg-white/80 p-2.5 rounded-lg border border-emerald-100 font-medium">
                    &ldquo;{activeLead.conversationNote || activeLead.contactNotes}&rdquo;
                  </p>
                </div>
              )}

              {/* Customer Initial Enquiry Note */}
              {(activeLead.query || activeLead.specialRequests) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquareQuote size={13} className="text-slate-600" />
                      <span>Customer Inbound Enquiry Note</span>
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">Initial Request</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 italic bg-white/70 p-2.5 rounded-lg border border-slate-200/60">
                    &ldquo;{activeLead.query || activeLead.specialRequests}&rdquo;
                  </p>
                </div>
              )}

              {/* Log Dialogue Note Form */}
              <form onSubmit={handleAddNote} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Log Dialogue Note with Customer
                  </label>
                  {/* Channel selection */}
                  <div className="flex items-center gap-1 text-[10px]">
                    {["Call", "WhatsApp", "Email", "Note"].map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setChannel(ch)}
                        className={`rounded-lg px-2 py-0.5 font-bold transition ${
                          channel === ch
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200"
                        }`}
                      >
                        {ch === "Call" ? "📞 Call" : ch === "WhatsApp" ? "💬 WhatsApp" : ch === "Email" ? "✉️ Email" : "📝 Note"}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={`Log customer conversation details via ${channel.toLowerCase()} (e.g. itinerary adjustment, hotel preference, budget commitment)...`}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50"
                />

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] text-slate-400">
                    Logged as {channel} note in CRM timeline
                  </span>
                  <Button
                    type="submit"
                    disabled={!noteText.trim() || addingNote}
                    loading={addingNote}
                    className="!h-7 !px-3 !text-[11px] !bg-emerald-700 hover:!bg-emerald-800 font-bold"
                  >
                    <Send size={11} />
                    <span>Save Note</span>
                  </Button>
                </div>
              </form>

              {/* Timeline conversation feed */}
              <div className="space-y-2.5 pt-1">
                {activeLead.timeline?.length ? (
                  activeLead.timeline.slice().reverse().map((item, idx) => {
                    const isCall = item.channel === "Call" || String(item.title || "").toLowerCase().includes("call");
                    const isWa = item.channel === "WhatsApp" || String(item.title || "").toLowerCase().includes("whatsapp");
                    const isEmail = item.channel === "Email" || String(item.title || "").toLowerCase().includes("email");

                    return (
                      <div
                        key={item.id || idx}
                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            {isCall ? "📞" : isWa ? "💬" : isEmail ? "✉️" : "📝"}
                            <span>{item.title || "Dialogue Note"}</span>
                          </span>
                          <span className="text-slate-400 font-medium">{item.time || item.createdAt}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{item.detail || item.notes || item.text}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    No follow-up notes logged yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Created {new Date(activeLead.createdAt || Date.now()).toLocaleDateString()}
            </span>
            <Button variant="secondary" onClick={onClose} className="!h-8 !px-3 !text-xs">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

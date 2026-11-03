import { useEffect, useState } from "react";
import {
  ArrowLeft, Mail, Phone, UserRound, MapPin, Users,
  Calendar, Wallet, CheckCircle, MessageCircle, Send,
  Share2, Flame, ExternalLink, Clock, MessageSquare,
  MessageSquareQuote, Tag, Sparkles, AlertCircle, RotateCcw, FileText
} from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import LeadStatus from "../../../components/leads/LeadStatus";
import LeadTimeline from "../../../components/leads/LeadTimeline";
import ConvertLeadModal from "../../../components/leads/ConvertLeadModal";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import formatCurrency from "../../../utils/formatCurrency";
import { formatDate } from "../../../utils/formatDate";
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

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState("Call");
  const [addingNote, setAddingNote] = useState(false);
  const [agents, setAgents] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const [leadData, agentsList] = await Promise.all([
        leadsApi.getById(id),
        leadsApi.listAgents().catch(() => []),
      ]);
      setLead(leadData);
      if (Array.isArray(agentsList)) setAgents(agentsList);
    } catch {
      setLead(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!lead) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-3">
        <h2 className="text-base font-bold text-red-800">Lead Record Not Found</h2>
        <p className="text-xs text-red-600">The requested lead enquiry could not be located.</p>
        <div>
          <Button variant="secondary" onClick={() => navigate("/admin/leads")}>
            <ArrowLeft size={16} /> Return to Leads Directory
          </Button>
        </div>
      </div>
    );
  }

  const leadName = lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Lead";
  const currentStatus = lead.status || "new";
  const isWon = ["won", "converted"].includes(currentStatus);

  const updateStatus = async (status) => {
    if (status === currentStatus) return;
    setSaving(true);
    try {
      const updated = await leadsApi.updateStatus(id, status);
      setLead(updated);
      toast.success(`Lead moved to ${status.toUpperCase()}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleAgentChange = async (agentName) => {
    setSaving(true);
    try {
      const updated = await leadsApi.update(id, { assignedTo: agentName });
      setLead(updated);
      toast.success(`Assigned to ${agentName}`);
    } catch {
      toast.error("Failed to update assigned agent");
    } finally {
      setSaving(false);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setAddingNote(true);
    try {
      const updated = await leadsApi.addNote(id, {
        note: note.trim(),
        channel,
        author: typeof lead?.assignedTo === "object" ? [lead.assignedTo.firstName, lead.assignedTo.lastName].filter(Boolean).join(" ") : lead?.assignedTo || "Sales Agent",
      });
      setLead(updated);
      setNote("");
      toast.success("Customer conversation note saved");
    } catch {
      toast.error("Failed to add conversation note");
    } finally {
      setAddingNote(false);
    }
  };

  const convert = async (payload) => {
    setSaving(true);
    try {
      const updated = await leadsApi.convertToCustomer(id, payload);
      setLead(updated);
      setShowConvert(false);
      toast.success("Lead converted to customer & booking record!");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to convert lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Navigation Breadcrumb & PageHeader */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link to="/admin/leads" className="hover:text-emerald-700 transition">
          Leads & Sales
        </Link>
        <span>/</span>
        <Link to="/admin/leads" className="hover:text-emerald-700 transition">
          All Leads
        </Link>
        <span>/</span>
        <span className="text-slate-900 truncate max-w-[200px]">{leadName}</span>
      </div>

      <PageHeader
        title={leadName}
        subtitle={`ID: ${lead.id || lead._id} · ${lead.destination || "Destination Flexible"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate("/admin/leads")} className="!h-9 !text-xs">
              <ArrowLeft size={15} />
              <span>Back to Leads</span>
            </Button>
            {!isWon && (
              <Button
                onClick={() => setShowConvert(true)}
                className="!h-9 !text-xs !bg-emerald-700 hover:!bg-emerald-800 font-bold"
              >
                <CheckCircle size={15} />
                <span>Convert to Booking</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Stage Progression Stepper Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pipeline Stage Progression
          </span>
          <span className="text-xs font-semibold text-slate-600 capitalize">
            Current Stage: <span className="font-bold text-slate-900">{currentStatus.replace("_", " ")}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {STAGES.map((s) => {
            const isActive = currentStatus === s.key;
            return (
              <button
                key={s.key}
                onClick={() => updateStatus(s.key)}
                disabled={saving}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition text-center ${
                  isActive
                    ? `${s.tone} shadow-xs ring-2 ring-emerald-500/20`
                    : "border border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: 2-column layout */}
      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <section className="space-y-5">
          {/* Key Specs Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-lg font-black text-emerald-800 border border-emerald-100">
                  {leadName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{leadName}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <LeadStatus status={currentStatus} />
                    {lead.priority && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          lead.priority === "high"
                            ? "bg-rose-50 text-rose-700"
                            : lead.priority === "medium"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {lead.priority} priority
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Communication Links */}
              <div className="flex items-center gap-2">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                  >
                    <Phone size={13} className="text-slate-500" />
                    <span>Call</span>
                  </a>
                )}
                {lead.phone && (
                  <a
                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 shadow-2xs transition"
                  >
                    <MessageCircle size={13} className="text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                )}
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                  >
                    <Mail size={13} className="text-slate-500" />
                    <span>Email</span>
                  </a>
                )}
              </div>
            </div>

            {/* Travel Specs Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-100 pt-4">
              <InfoBox
                label="Destination"
                value={lead.destination || "Open"}
                icon={MapPin}
              />
              <InfoBox
                label="Travelers"
                value={`${lead.travelers || lead.numberOfPeople || 1} Pax`}
                icon={Users}
              />
              <InfoBox
                label="Target Budget"
                value={lead.budget ? formatCurrency(lead.budget) : "Open"}
                icon={Wallet}
                highlight
              />
              <InfoBox
                label="Lead Source"
                value={lead.source || "Website"}
                icon={Share2}
              />
            </div>

            {/* Dates & Assigned Agent */}
            <div className="grid gap-3 sm:grid-cols-2 border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">Travel Window:</span>
                <span>
                  {lead.travelDates?.from
                    ? `${lead.travelDates.from} → ${lead.travelDates.to || ""}`
                    : lead.travelFrom
                      ? `${lead.travelFrom} → ${lead.travelTo || ""}`
                      : "Flexible Dates"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <UserRound size={14} className="text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">Assigned Agent:</span>
                <select
                  value={typeof lead.assignedTo === "object" ? lead.assignedTo?._id : lead.assignedTo || ""}
                  onChange={(e) => handleAgentChange(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a._id || a.name} value={a.name || a._id}>
                      {a.name || [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quotations Desk Handshake (Centralizes proposal creation to Quotations Desk) */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Tag size={13} className="text-emerald-700" />
                <span>Quotation Desk Workflow</span>
              </span>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {lead.quotedPrice > 0 ? "Quoted Proposal Active" : "Quoting Desk Integration"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Current Quoted Deal Value</span>
                <span className="font-extrabold text-emerald-900 text-lg">
                  {lead.quotedPrice > 0 ? formatCurrency(lead.quotedPrice) : "Not Quoted Yet"}
                </span>
              </div>
              <Link
                to={`/admin/quotes?id=${id}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 transition"
              >
                <FileText size={14} />
                <span>Open in Quotations Desk</span>
              </Link>
            </div>
          </div>

          {/* Customer Direct Response / Feedback (if available) */}
          {lead.customerResponse?.action && (
            <div className={`rounded-2xl border p-5 text-xs space-y-2 ${
              lead.customerResponse.action === "accepted"
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : lead.customerResponse.action === "changes_requested"
                ? "border-sky-200 bg-sky-50 text-sky-950"
                : "border-rose-200 bg-rose-50 text-rose-950"
            }`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  {lead.customerResponse.action === "accepted" ? (
                    <><Sparkles size={14} className="text-emerald-700" /> Customer Accepted Proposal</>
                  ) : lead.customerResponse.action === "changes_requested" ? (
                    <><AlertCircle size={14} className="text-sky-700" /> Customer Revision Requested</>
                  ) : (
                    <><RotateCcw size={14} className="text-rose-700" /> Proposal Declined</>
                  )}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {lead.customerResponse.respondedAt ? new Date(lead.customerResponse.respondedAt).toLocaleDateString() : ""}
                </span>
              </div>
              {lead.customerResponse.note && (
                <p className="italic bg-white/70 p-3 rounded-xl border border-black/5 text-slate-800 leading-relaxed text-xs">
                  &ldquo;{lead.customerResponse.note}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Active Conversation & Inbound Enquiry Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-2xs space-y-2">
              <h3 className="font-bold text-emerald-950 text-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-emerald-700" />
                  <span>Active Customer Conversation Note</span>
                </span>
                {lead.conversationChannel && (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {lead.conversationChannel}
                  </span>
                )}
              </h3>
              <p className="text-xs leading-relaxed text-emerald-950 italic bg-white/80 p-3 rounded-xl border border-emerald-100 font-medium">
                &ldquo;{lead.conversationNote || lead.contactNotes || "No conversation notes logged yet. Use logger below."}&rdquo;
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <MessageSquareQuote size={14} className="text-slate-600" />
                <span>Customer Inbound Enquiry Note</span>
              </h3>
              <p className="text-xs leading-relaxed text-slate-700 italic bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                &ldquo;{lead.query || lead.specialRequests || "No special requirements entered for this enquiry."}&rdquo;
              </p>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Customer Contact Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <p className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-900">{lead.phone || "No phone provided"}</span>
              </p>
              <p className="flex items-center gap-2 break-all">
                <Mail size={14} className="text-slate-400 shrink-0" />
                <span>{lead.email || "No email provided"}</span>
              </p>
              <p className="flex items-center gap-2 text-slate-500">
                <Clock size={14} className="text-slate-400 shrink-0" />
                <span>Created {lead.createdAt ? formatDate(lead.createdAt) : "Recently"}</span>
              </p>
            </div>
          </div>

          {/* Customer Dialogue & Follow-up Note Logger */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <MessageSquare size={14} className="text-emerald-700" />
                <span>Customer Dialogue & Conversation Logger</span>
              </h3>
              {/* Channel Selector */}
              <div className="flex items-center gap-1 text-[11px]">
                {["Call", "WhatsApp", "Email", "Note"].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`rounded-lg px-2.5 py-1 font-bold transition ${
                      channel === ch
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-200/80 border border-slate-200"
                    }`}
                  >
                    {ch === "Call" ? "📞 Call" : ch === "WhatsApp" ? "💬 WhatsApp" : ch === "Email" ? "✉️ Email" : "📝 Note"}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={addNote} className="space-y-2.5">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={`Document conversation details with client via ${channel.toLowerCase()} (e.g. call summary, agreed hotel standard, budget confirmation)...`}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Will be recorded under {channel} channel in timeline
                </span>
                <Button
                  type="submit"
                  loading={addingNote}
                  disabled={!note.trim() || addingNote}
                  className="!h-8 !px-3.5 !text-xs !bg-emerald-700 hover:!bg-emerald-800 font-bold"
                >
                  <Send size={12} />
                  <span>Save Note</span>
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* Aside: Activity Timeline */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Activity & Audit Timeline</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              {lead.timeline?.length || 0} events
            </span>
          </div>

          <div>
            <LeadTimeline events={lead.timeline} />
          </div>
        </aside>
      </div>

      {/* Convert Lead Modal */}
      <ConvertLeadModal
        open={showConvert}
        lead={lead}
        loading={saving}
        onClose={() => setShowConvert(false)}
        onConvert={convert}
      />
    </div>
  );
}

function InfoBox({ label, value, icon: Icon, highlight = false }) {
  return (
    <div className="rounded-xl bg-slate-50/70 border border-slate-100 p-3 space-y-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
        <Icon size={12} className={highlight ? "text-emerald-600" : "text-slate-400"} />
        {label}
      </span>
      <p className={`text-xs font-bold truncate ${highlight ? "text-emerald-900" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}

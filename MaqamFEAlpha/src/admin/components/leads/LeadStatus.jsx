import StatusBadge from "../common/StatusBadge";

const labels = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const variants = {
  new: "info",
  contacted: "info",
  qualified: "success",
  proposal: "warning",
  negotiation: "warning",
  won: "success",
  lost: "danger",
};

export default function LeadStatus({ status }) {
  return <StatusBadge status={labels[status] || status} variant={variants[status] || "default"} />;
}

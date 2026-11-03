import StatusBadge from "../common/StatusBadge";

export default function PackageStatus({ status }) {
  const map = {
    active: { text: "Active", variant: "success" },
    inactive: { text: "Inactive", variant: "default" },
  };
  const value = map[status] || { text: status, variant: "default" };
  return <StatusBadge status={value.text} variant={value.variant} />;
}

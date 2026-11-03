import StatusBadge from "../common/StatusBadge";
export default function PaymentStatus({status}){
  const map={paid:["Paid","success"],pending:["Pending","warning"],failed:["Failed","danger"],created:["Created","info"]};
  const [label,variant]=map[status]||[status||"Unknown","default"];
  return <StatusBadge status={label} variant={variant}/>;
}

import StatusBadge from "../common/StatusBadge";
const labels={draft:"Draft",pending:"Pending",confirmed:"Confirmed",cancelled:"Cancelled",payment_pending:"Payment Pending"};
const variants={draft:"default",pending:"warning",confirmed:"success",cancelled:"danger",payment_pending:"warning"};
export default function BookingStatus({status}){return <StatusBadge status={labels[status]||status} variant={variants[status]||"default"}/>;}

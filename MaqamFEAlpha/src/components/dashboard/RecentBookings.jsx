import { bookings } from "../../data/dashboardData";

const statusClass = {
  Confirmed: "bg-emerald-50 text-emerald-600",
  Pending: "bg-orange-50 text-orange-600",
  Cancelled: "bg-red-50 text-red-500",
};

export default function RecentBookings() {
  return (
    <div className="dashboard-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-[14px] font-bold text-slate-900">Recent Bookings</h2>
        <button className="text-[11px] font-semibold text-blue-600">View All</button>
      </div>

      <div className="table-scroll">
        <table className="w-full min-w-[470px] text-[10px]">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-[9px] text-slate-500">
              <th className="px-4 py-2 font-medium">Booking ID</th>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>

          <tbody>
            {bookings.map(([id, customer, type, amount, status]) => (
              <tr key={id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5 font-semibold text-slate-700">{id}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[8px] font-bold text-slate-500">
                      {customer.split(" ").map((name) => name[0]).join("")}
                    </div>
                    {customer}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{type}</td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{amount}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-2 py-1 text-[9px] font-semibold ${statusClass[status]}`}>
                    {status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

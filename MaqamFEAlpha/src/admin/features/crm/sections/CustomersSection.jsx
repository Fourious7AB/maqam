import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Users, Phone, Mail, Check, ArrowRight } from "lucide-react";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import CustomerTravellersModal from "../../../components/customers/CustomerTravellersModal";
import { customersApi } from "../../customers/customersApi";
import formatCurrency from "../../../utils/formatCurrency";
import { formatDate } from "../../../utils/formatDate";
import {
  PanelBar,
  SearchInput,
  ChipGroup,
  Pill,
  TableWrap,
  EmptyState,
} from "../crmUi";

const statusFilterOptions = [
  { value: "", label: "All Customers" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export default function CustomersSection() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [page, setPage] = useState(1);

  // Selected customer for quick travellers modal
  const [travellersModalCustomer, setTravellersModalCustomer] = useState(null);

  const load = async (pageToLoad = 1) => {
    try {
      setLoading(true);
      let isActiveParam;
      if (isActiveFilter === "true") isActiveParam = true;
      if (isActiveFilter === "false") isActiveParam = false;

      const res = await customersApi.list({
        page: pageToLoad,
        limit: 20,
        search,
        isActive: isActiveParam,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      setCustomers(res.data || []);
      setMeta(res.meta);
      setPage(pageToLoad);
    } catch (err) {
      console.error("Failed to load CRM customers:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, isActiveFilter]);

  return (
    <div className="space-y-3">
      {/* Panel Top Bar */}
      <PanelBar
        title="Customers"
        count={meta?.total ?? customers.length}
        onRefresh={() => load(page)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, email, phone…"
          />
          <ChipGroup
            options={statusFilterOptions}
            value={isActiveFilter}
            onChange={(val) => {
              setIsActiveFilter(val);
              setPage(1);
            }}
          />
        </div>
      </PanelBar>

      {/* Main Table */}
      {loading ? (
        <div className="py-16 text-center">
          <LoadingSpinner />
          <p className="mt-2 text-xs text-slate-400">Loading customer accounts…</p>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState message={search ? `No customers matching "${search}".` : "No customers found."} />
      ) : (
        <TableWrap>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3.5 py-2.5">Customer</th>
                <th className="px-3.5 py-2.5">Contact</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-center">Travellers</th>
                <th className="px-3 py-2.5 text-center">Offers</th>
                <th className="px-3.5 py-2.5 text-right">Lifetime Spend</th>
                <th className="px-3.5 py-2.5">Registered</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => {
                const id = c._id || c.id;
                const isActive = c.isActive !== false;
                const initials = (c.firstName?.[0] || c.name?.[0] || "C").toUpperCase();

                return (
                  <tr key={id} className="hover:bg-slate-50/60">
                    {/* Customer */}
                    <td className="px-3.5 py-2.5 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-slate-100 font-semibold text-slate-700">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                            <span
                              onClick={() => navigate(`/admin/customers/${id}`)}
                              className="cursor-pointer hover:text-emerald-700 transition"
                            >
                              {c.name}
                            </span>
                            {c.isVerified && (
                              <Check size={12} className="text-emerald-600 stroke-[3]" />
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">{id.slice(-8)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-3.5 py-2.5 align-middle text-slate-600">
                      <div className="space-y-0.5">
                        {c.phone && (
                          <p className="flex items-center gap-1">
                            <Phone size={10} className="text-slate-400" />
                            <span>{c.phone}</span>
                          </p>
                        )}
                        {c.email && (
                          <p className="flex items-center gap-1 truncate max-w-[170px]">
                            <Mail size={10} className="text-slate-400" />
                            <span className="truncate">{c.email}</span>
                          </p>
                        )}
                        {!c.phone && !c.email && <span className="text-slate-400">—</span>}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 align-middle text-center">
                      <Pill tone={isActive ? "green" : "slate"}>
                        {isActive ? "Active" : "Inactive"}
                      </Pill>
                    </td>

                    {/* Travellers */}
                    <td className="px-3 py-2.5 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => setTravellersModalCustomer(c)}
                        title="View travellers"
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold tabular-nums text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Users size={11} className="text-slate-400" />
                        <span>{c.totalTravellers}</span>
                      </button>
                    </td>

                    {/* Offers */}
                    <td className="px-3 py-2.5 align-middle text-center font-semibold tabular-nums text-slate-700">
                      {c.bookedOffersCount}
                    </td>

                    {/* Lifetime Spend */}
                    <td className="px-3.5 py-2.5 align-middle text-right font-semibold tabular-nums text-slate-900">
                      {formatCurrency(c.totalMoneySpent || 0)}
                    </td>

                    {/* Joined */}
                    <td className="px-3.5 py-2.5 align-middle text-slate-500 tabular-nums">
                      {c.createdAt ? formatDate(c.createdAt) : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-2.5 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="secondary"
                          className="!py-1 !px-2 !text-xs"
                          onClick={() => setTravellersModalCustomer(c)}
                        >
                          <Users size={11} />
                          Travellers
                        </Button>
                        <Button
                          className="!py-1 !px-2 !text-xs"
                          onClick={() => navigate(`/admin/customers/${id}`)}
                        >
                          Profile
                          <ArrowRight size={11} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-3.5 py-2.5 bg-slate-50/50 text-xs text-slate-500">
              <span>
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  className="!py-0.5 !px-2 !text-xs"
                  disabled={page <= 1 || loading}
                  onClick={() => load(page - 1)}
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  className="!py-0.5 !px-2 !text-xs"
                  disabled={page >= meta.totalPages || loading}
                  onClick={() => load(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TableWrap>
      )}

      {/* Travellers Modal */}
      {travellersModalCustomer && (
        <CustomerTravellersModal
          customerId={travellersModalCustomer._id || travellersModalCustomer.id}
          customerName={travellersModalCustomer.name}
          onClose={() => setTravellersModalCustomer(null)}
        />
      )}
    </div>
  );
}

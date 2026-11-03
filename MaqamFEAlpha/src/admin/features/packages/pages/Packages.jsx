import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import PackageCard from "../../../components/packages/PackageCard";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { packagesApi } from "../packagesApi";

const initialFilters = { search: "", status: "all", destination: "all", stock: "all" };

export default function Packages() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await packagesApi.list({ page: 1, pageSize: 100 });
      setPackages(result.data ?? []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(load, 180);
    return () => clearTimeout(id);
  }, []);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return packages.filter((pkg) => {
      const haystack = `${pkg.title ?? ""} ${pkg.destination ?? ""} ${pkg.description ?? ""}`.toLowerCase();
      const lowStock = pkg.availableSlots > 0 && pkg.availableSlots <= 3;
      const sold = pkg.availableSlots === 0;
      return (
        (!q || haystack.includes(q)) &&
        (filters.status === "all" ||
          (filters.status === "active" ? pkg.isActive !== false : pkg.isActive === false)) &&
        (filters.stock === "all" || (filters.stock === "low" ? lowStock : sold))
      );
    });
  }, [packages, filters]);

  const handleToggle = async (pkg) => {
    if (togglingId) return;
    setTogglingId(pkg.id);
    try {
      const willActivate = pkg.isActive === false;
      const updated = willActivate
        ? await packagesApi.activate(pkg.id)
        : await packagesApi.deactivate(pkg.id);
      setPackages((prev) =>
        prev.map((item) =>
          item.id === pkg.id
            ? { ...item, isActive: updated?.isActive ?? (willActivate ? true : false) }
            : item,
        ),
      );
      toast.success(updated?.isActive === false ? "Package deactivated" : "Package activated");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to update package status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title="Packages"
        subtitle="Manage reusable travel packages, pricing and availability."
        actions={
          <>
            <Button
              variant="secondary"
              loading={loading && refreshing}
              onClick={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }}
            >
              <RefreshCw size={16} />Refresh
            </Button>
            <Button onClick={() => navigate("/admin/packages/create")}><Plus size={16} />Create Package</Button>
          </>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search packages..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm" /></div>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          <select value={filters.stock} onChange={(e) => setFilters({ ...filters, stock: e.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">All stock</option><option value="low">Low stock</option><option value="sold">Sold out</option></select>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <PackageCard
              key={item.id}
              packageItem={item}
              toggling={togglingId === item.id}
              onToggle={handleToggle}
              onOpen={(pkg) => navigate(`/admin/packages/${pkg.id}`)}
            />
          ))}
        </div>
      )}

      {!loading && !filtered.length && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No packages found.
        </div>
      )}
    </div>
  );
}

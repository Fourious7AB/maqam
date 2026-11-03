import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../components/layout/PageHeader";
import PackageWizard from "../../../components/packages/PackageWizard";

export default function CreatePackage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader title="Create Package" subtitle="Configure details, offers, pricing and itinerary." actions={<button onClick={() => navigate("/admin/packages")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><ArrowLeft size={16} />Back</button>} />
      <PackageWizard onCancel={() => navigate("/admin/packages")} onSaved={(pkg) => navigate(`/admin/packages/${pkg.id}`)} />
    </div>
  );
}

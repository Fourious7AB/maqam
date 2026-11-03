import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../../components/layout/PageHeader";
import PackageWizard from "../../../components/packages/PackageWizard";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { packagesApi } from "../packagesApi";

export default function EditPackage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);

  useEffect(() => {
    packagesApi.getById(id).then(setPkg).catch(() => setPkg(null));
  }, [id]);

  if (!pkg) return <LoadingSpinner />;

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader title={`Edit ${pkg.title}`} subtitle="Update package details, offers, pricing and itinerary." />
      <PackageWizard mode="edit" initialData={pkg} onCancel={() => navigate(`/admin/packages/${id}`)} onSaved={(updated) => navigate(`/admin/packages/${updated?.id || updated?._id || id}`)} />
    </div>
  );
}

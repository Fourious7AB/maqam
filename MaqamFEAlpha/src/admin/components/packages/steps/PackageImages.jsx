import CrmImageUploadSection from "../../common/CrmImageUploadSection";

// Multi-image gallery for the package wizard. Selected or dropped files
// are uploaded through the backend (POST /api/v1/crm/packages/upload-images)
// which handles Cloudinary and returns hosted URLs. Only URL strings are
// stored in form.images — matching the POST /api/v1/crm/packages body.
const MAX_IMAGES = 10;

export default function PackageImages({ images = [], onChange, disabled = false }) {
  return (
    <CrmImageUploadSection
      images={images}
      onChange={onChange}
      section="packages"
      maxImages={MAX_IMAGES}
      title="Package Images & Gallery"
      subtitle="Selected files are uploaded to Cloudinary and stored as hosted URLs. First image serves as the primary cover."
      disabled={disabled}
      showCustomerNotice={true}
    />
  );
}

import { useRef, useState } from "react";
import { Upload, X, Loader2, Images } from "lucide-react";

import { uploadImages, isCloudinaryEnabled } from "../../services/upload";

// Accept either objects ({url,name,uploaded}) or bare URL strings (edit mode).
function normalize(value) {
  return (value || []).map((item) =>
    typeof item === "string"
      ? { url: item, name: "", uploaded: true }
      : item
  );
}

/**
 * Multi-image uploader shown at the top of the room / car forms.
 *
 * Today it stores local previews; the moment Cloudinary env vars are set (see
 * services/upload.js) the very same component uploads to the cloud instead —
 * no changes here.
 *
 * Props: value (array), onChange(array), max (default 8), label.
 */
export default function ImageUploader({ value, onChange, max = 8, label = "Hotel images" }) {
  const images = normalize(value);
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const atMax = images.length >= max;

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const room = Math.max(0, max - images.length);
    const slice = files.slice(0, room);

    setUploading(true);
    try {
      const added = await uploadImages(slice);
      onChange([...images, ...added]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (index) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm font-semibold text-emerald-950">
          <Images size={15} className="text-emerald-600" />
          {label}
        </label>
        <span className="text-[11px] text-slate-400">
          {images.length}/{max}
        </span>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !atMax && !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !atMax && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!atMax) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!atMax) handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          dragging
            ? "border-emerald-500 bg-emerald-50"
            : atMax
            ? "cursor-not-allowed border-slate-200 bg-slate-50"
            : "border-emerald-300 bg-emerald-50/40 hover:border-emerald-500 hover:bg-emerald-50"
        }`}
      >
        {uploading ? (
          <Loader2 size={22} className="mb-1 animate-spin text-emerald-600" />
        ) : (
          <Upload size={22} className="mb-1 text-emerald-600" />
        )}
        <p className="text-sm font-medium text-emerald-900">
          {uploading
            ? "Uploading…"
            : atMax
            ? "Maximum images added"
            : "Click or drop images to upload"}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          PNG or JPG · you can add several ·{" "}
          {isCloudinaryEnabled() ? "uploads to Cloudinary" : "stored locally for now"}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={`${img.url}-${i}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg ring-1 ring-slate-200"
            >
              <img src={img.url} alt={img.name || `Image ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                aria-label="Remove image"
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

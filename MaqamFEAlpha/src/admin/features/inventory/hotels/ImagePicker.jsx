import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { uploadImages } from "../../../../services/upload";

// Compact image picker for the hotel stock form. Files upload immediately
// through the backend (Cloudinary handled server-side) and only hosted URL
// strings are kept. Single mode keeps exactly one image (main hotel image);
// multi mode appends up to `max` images (room type galleries).
export default function ImagePicker({ images = [], onChange, multiple = false, max = 4, label, hint }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const limit = multiple ? max : 1;
  const atMax = images.length >= limit;

  const addUrls = (urls) => {
    const clean = urls.filter(Boolean).slice(0, limit - images.length);
    if (!clean.length) return;
    onChange(multiple ? [...images, ...clean] : [clean[0]]);
  };

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, limit - images.length));
    if (!files.length) {
      setError(atMax ? `Maximum ${limit} image${limit === 1 ? "" : "s"} reached.` : "No images found in the selection.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const results = await uploadImages(files, "hotels");
      addUrls(results.map((result) => result.url));
    } catch (err) {
      setError(err?.response?.data?.message || "Upload failed. Try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (index) => onChange(images.filter((_, position) => position !== index));

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="block text-sm font-semibold text-slate-700">{label}</span>
          {multiple && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${atMax ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
              {images.length} / {limit}
            </span>
          )}
        </div>
      )}
      {hint && !atMax && <p className="text-xs text-slate-400">{hint}</p>}

      <div className="flex flex-wrap gap-2">
        {images.map((url, index) => (
          <div key={`${url}-${index}`} className="group relative h-20 w-28 overflow-hidden rounded-xl border border-slate-200">
            <img src={url} alt={`Image ${index + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute inset-0 grid place-items-center bg-slate-900/60 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Remove image"
            >
              <Trash2 size={16} />
            </button>
            {index === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-slate-900/70 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">
                {multiple ? "Cover" : "Main"}
              </span>
            )}
          </div>
        ))}

        {!atMax && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => !busy && inputRef.current?.click()}
            onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && !busy && inputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) handleFiles(event.dataTransfer.files); }}
            className={`grid h-20 w-28 shrink-0 cursor-pointer place-items-center rounded-xl border-2 border-dashed transition ${
              dragging ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/40"
            } ${busy ? "pointer-events-none opacity-70" : ""}`}
            aria-label="Add image"
          >
            {busy ? <Loader2 size={18} className="animate-spin text-emerald-600" /> : <ImagePlus size={18} className="text-slate-400" />}
          </div>
        )}
      </div>

      {error && <p className="text-xs font-medium text-amber-700">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}

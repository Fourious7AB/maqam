import { useRef, useState } from "react";
import {
  Camera,
  Check,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Trash2,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  ACCEPTED_EXTENSIONS_STRING,
  uploadImages,
  validateImageFiles,
} from "../../../services/upload";

/**
 * Enterprise-grade Avatar Upload & URL field for Maqam CRM.
 * Supports:
 *   1. Direct image file upload (auto-uploaded to Cloudinary, <5MB, JPG/PNG/WEBP/GIF)
 *   2. Image URL input (paste direct CDN / hosted image link)
 *
 * @param {Object} props
 * @param {string} props.value - Current avatar image URL
 * @param {(url: string) => void} props.onChange - Callback with new avatar URL
 * @param {string} [props.fallbackInitials="U"] - Fallback initials to show when empty
 * @param {string} [props.label="Profile Avatar"] - Label for the section
 * @param {string} [props.helperText] - Subtitle or instructions
 * @param {boolean} [props.disabled=false] - Whether inputs are disabled
 * @param {"compact"|"standard"} [props.variant="standard"] - Display layout style
 */
export default function AvatarUploadField({
  value = "",
  onChange,
  fallbackInitials = "U",
  label = "Profile Avatar",
  helperText = "Upload a photo or paste a hosted image link. Max 5 MB.",
  disabled = false,
  variant = "standard",
}) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "url"
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value || "");
  const [imgLoadError, setImgLoadError] = useState(false);

  // Sync draft when external value changes
  const handleValueChange = (newUrl) => {
    setImgLoadError(false);
    setUrlDraft(newUrl);
    onChange(newUrl);
  };

  // Upload handler for file selection
  const handleFileSelect = async (files) => {
    if (disabled || isUploading) return;
    const file = files?.[0];
    if (!file) return;

    // Validate size (5MB) and mime types
    const { validFiles, rejectedFiles } = validateImageFiles([file]);

    if (rejectedFiles.length > 0) {
      toast.error(rejectedFiles[0].reason);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const results = await uploadImages([validFiles[0]], "packages");
      const hostedUrl = results[0]?.url;

      if (hostedUrl) {
        handleValueChange(hostedUrl);
        toast.success("Avatar uploaded successfully!");
      } else {
        toast.error("Upload returned no image URL. Please try again.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to upload image. Please try again or paste a link.";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Direct URL submission
  const handleApplyUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      handleValueChange("");
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error("Image link must start with http:// or https://");
      return;
    }
    handleValueChange(trimmed);
    toast.success("Avatar image link applied");
  };

  const handleClear = () => {
    handleValueChange("");
  };

  const isCloudinary = typeof value === "string" && value.includes("cloudinary.com");
  const hasAvatar = typeof value === "string" && value.trim().length > 0 && !imgLoadError;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            {label}
          </label>
          {helperText && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {helperText}
            </p>
          )}
        </div>

        {/* Mode Tabs */}
        <div className="flex rounded-xl bg-slate-200/70 p-0.5 text-xs font-semibold dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
              activeTab === "upload"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <UploadCloud size={13} />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
              activeTab === "url"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <LinkIcon size={13} />
            <span>Image Link</span>
          </button>
        </div>
      </div>

      {/* Main Avatar Controls Row */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Avatar Preview Box */}
        <div className="relative group shrink-0">
          <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-800">
            {hasAvatar ? (
              <img
                src={value}
                alt="Avatar preview"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImgLoadError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-800 dark:from-emerald-950/40 dark:to-slate-800 dark:text-emerald-300">
                {fallbackInitials ? (
                  <span className="text-xl font-bold tracking-tight">
                    {fallbackInitials.slice(0, 2).toUpperCase()}
                  </span>
                ) : (
                  <User size={30} />
                )}
              </div>
            )}

            {/* Uploading Overlay */}
            {isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-xs">
                <Loader2 size={20} className="animate-spin text-emerald-400" />
                <span className="mt-1 text-[9px] font-semibold">Uploading...</span>
              </div>
            )}
          </div>

          {/* Quick upload click overlay icon */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
            title="Choose image file"
            aria-label="Upload photo"
          >
            <Camera size={14} />
          </button>
        </div>

        {/* Input Controls */}
        <div className="flex-1 w-full space-y-2">
          {activeTab === "upload" ? (
            /* Upload Zone */
            <div
              role="button"
              tabIndex={0}
              onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!disabled && !isUploading) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (!disabled && !isUploading) {
                  handleFileSelect(e.dataTransfer.files);
                }
              }}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-3 text-center transition ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20"
                  : "border-slate-300/80 bg-white hover:border-emerald-400 hover:bg-emerald-50/20 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-emerald-500"
              } ${isUploading ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS_STRING}
                hidden
                disabled={disabled || isUploading}
                onChange={(e) => handleFileSelect(e.target.files)}
              />

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <UploadCloud size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <span className="text-emerald-700 underline underline-offset-2 dark:text-emerald-400">Click to browse</span> or drop photo here
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                JPG, PNG, WEBP, GIF · Max 5 MB
              </p>
            </div>
          ) : (
            /* Image Link URL Input */
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={urlDraft}
                    disabled={disabled || isUploading}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyUrl();
                      }
                    }}
                    placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  disabled={disabled || !urlDraft.trim()}
                  className="inline-flex h-9 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check size={13} />
                  <span>Apply</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Direct public link to image (starts with http:// or https://)
              </p>
            </div>
          )}

          {/* Current Avatar Status & Clear Action */}
          {hasAvatar && (
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {isCloudinary ? "Hosted on Cloudinary CDN" : "External Image Link"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled || isUploading}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <Trash2 size={12} />
                <span>Remove Avatar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

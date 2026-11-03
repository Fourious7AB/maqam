import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Eye,
  FileImage,
  Image as ImageIcon,
  ImagePlus,
  Info,
  Link as LinkIcon,
  Loader2,
  Plus,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  ACCEPTED_EXTENSIONS_STRING,
  MAX_FILES_PER_UPLOAD,
  addEntityImages,
  deleteEntityImage,
  uploadImages,
  validateImageFiles,
} from "../../../services/upload";

/**
 * Enterprise-grade Image Upload, Gallery & Photos Management component for Maqam CRM.
 *
 * Implements the complete Frontend Migration Guide specifications:
 *
 * Path 1: Zero Refactor (Instant Upload - Recommended)
 *   Uploads files directly to:
 *     - POST /api/v1/crm/packages/upload-images  (for packages)
 *     - POST /api/v1/crm/offers/upload-images    (for offers)
 *   Key in FormData: "images"
 *   Emits hosted Cloudinary URLs (string[]) to keep existing JSON submit 100% untouched.
 *
 * Path 2: Direct FormData (Staged Files)
 *   If onFilesChange is provided, holds raw File objects and exposes object previews
 *   so the parent form can submit everything in a single multipart/form-data request.
 *
 * Photos Management on Existing Items:
 *   If itemId is provided:
 *     - POST   /api/v1/crm/:section/:id/images  (appends new photos directly)
 *     - DELETE /api/v1/crm/:section/:id/images  (deletes photo with { imageUrl })
 *
 * Constraints:
 *   - Field name: "images"
 *   - Accepted formats: JPG, JPEG, PNG, WEBP, GIF
 *   - Max file size: 5 MB per image (strictly enforced with toast + banner alerts)
 *   - Max files: up to 10 images at once
 *   - Customer Fallback Notice: shown when no images are present
 *
 * @param {Object} props
 * @param {string[]} [props.images=[]] - Array of hosted image URLs
 * @param {(urls: string[]) => void} props.onChange - Callback with new array of URLs
 * @param {File[]} [props.files=[]] - Optional raw File[] for Path 2 staged files
 * @param {(files: File[]) => void} [props.onFilesChange] - Callback with raw File[] for Path 2
 * @param {"offers"|"packages"|string} [props.section="packages"] - CRM entity section
 * @param {string} [props.itemId] - Entity ID for direct photos management (POST/DELETE :id/images)
 * @param {number} [props.maxImages=10] - Maximum number of allowed images
 * @param {string} [props.title="Media & Gallery"] - Section title
 * @param {string} [props.subtitle] - Helper subtitle
 * @param {boolean} [props.disabled=false] - Whether uploads are disabled
 * @param {boolean} [props.showCustomerNotice=true] - Whether to show the customer fallback banner
 */
export default function CrmImageUploadSection({
  images = [],
  onChange,
  files = [],
  onFilesChange,
  section = "packages",
  itemId,
  maxImages = MAX_FILES_PER_UPLOAD,
  title = "Media & Gallery",
  subtitle = "Upload high-resolution images. The first image serves as the primary cover.",
  disabled = false,
  showCustomerNotice = true,
}) {
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Staged local file previews for Path 2 (Blob URLs)
  const [stagedPreviews, setStagedPreviews] = useState([]);

  // Generate and cleanup object URLs for staged files (Path 2)
  useEffect(() => {
    if (!onFilesChange || !files || files.length === 0) {
      setStagedPreviews([]);
      return;
    }
    const previews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2),
    }));
    setStagedPreviews(previews);

    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [files, onFilesChange]);

  const safeImages = Array.isArray(images)
    ? images.filter((u) => typeof u === "string" && u.trim().length > 0)
    : [];

  const totalCurrentCount = safeImages.length + (onFilesChange ? (files?.length || 0) : 0);
  const slotsAvailable = Math.max(0, maxImages - totalCurrentCount);
  const isFull = slotsAvailable === 0;

  // Append new URLs while respecting max limit
  const appendUrls = (newUrls) => {
    const valid = newUrls
      .map((u) => (typeof u === "string" ? u.trim() : ""))
      .filter((u) => u && !safeImages.includes(u))
      .slice(0, slotsAvailable);

    if (valid.length > 0 && onChange) {
      onChange([...safeImages, ...valid]);
    }
  };

  // Upload handler for files (file dialog or drag-and-drop)
  const handleFiles = async (fileList) => {
    if (disabled || isUploading || isFull) return;

    const rawList = Array.from(fileList || []);
    if (!rawList.length) return;

    // Validate size (5MB) and mime types
    const { validFiles, rejectedFiles } = validateImageFiles(rawList);

    if (rejectedFiles.length > 0) {
      const reasonMsg = rejectedFiles.map((r) => `${r.file.name}: ${r.reason}`).join(" ");
      setErrorMessage(reasonMsg);
      toast.error(`Some files were rejected: ${reasonMsg}`);
      if (validFiles.length === 0) return;
    }

    const filesToProcess = validFiles.slice(0, slotsAvailable);
    if (validFiles.length > slotsAvailable) {
      toast.info(`Only ${slotsAvailable} image slot(s) available. Extra files were omitted.`);
    }

    if (filesToProcess.length === 0) return;

    // PATH 2: If onFilesChange is provided and no itemId, stage files locally
    if (onFilesChange && !itemId) {
      const existingFiles = Array.isArray(files) ? files : [];
      const updatedFiles = [...existingFiles, ...filesToProcess].slice(0, maxImages);
      onFilesChange(updatedFiles);
      setErrorMessage("");
      toast.success(`Attached ${filesToProcess.length} image(s) for submission.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // PATH 1: Instant upload (or direct entity photos management if itemId provided)
    setIsUploading(true);
    setUploadCount(filesToProcess.length);
    setErrorMessage("");

    try {
      if (itemId) {
        // Direct addition to existing entity (POST /api/v1/crm/:section/:id/images)
        const response = await addEntityImages(section, itemId, filesToProcess);
        const newUrls =
          response?.data?.images ??
          response?.images ??
          response?.data?.urls ??
          response?.urls ??
          [];

        if (Array.isArray(newUrls) && newUrls.length > 0) {
          if (onChange) onChange(newUrls);
          toast.success(`Photos added to ${section === "offers" ? "offer" : "package"} successfully!`);
        } else {
          // If response does not return the full array, upload normally and append
          const uploadRes = await uploadImages(filesToProcess, section);
          const urls = uploadRes.map((r) => r.url).filter(Boolean);
          appendUrls(urls);
          toast.success(`Uploaded ${urls.length} photo(s) to ${section === "offers" ? "offer" : "package"}!`);
        }
      } else {
        // Instant Cloudinary upload (POST /api/v1/crm/:section/upload-images)
        const results = await uploadImages(filesToProcess, section);
        const urls = results.map((r) => r.url).filter(Boolean);

        if (urls.length > 0) {
          appendUrls(urls);
          toast.success(`Successfully uploaded ${urls.length} image${urls.length > 1 ? "s" : ""}`);
        } else {
          setErrorMessage("Upload returned no image URLs. Please try again.");
        }
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Image upload failed. Check your network or try pasting an image URL.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setUploadCount(0);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  // Remove an image by index or URL
  const handleRemove = async (indexToRemove) => {
    if (disabled || isDeleting) return;

    const urlToRemove = safeImages[indexToRemove];

    // If itemId exists, call the backend delete route: DELETE /api/v1/crm/:section/:id/images
    if (itemId && urlToRemove) {
      setIsDeleting(true);
      try {
        await deleteEntityImage(section, itemId, urlToRemove);
        const updated = safeImages.filter((_, idx) => idx !== indexToRemove);
        if (onChange) onChange(updated);
        toast.success("Image removed from cloud storage");
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || "Failed to remove photo.";
        toast.error(msg);
      } finally {
        setIsDeleting(false);
      }
      return;
    }

    // Standard client removal
    const updated = safeImages.filter((_, idx) => idx !== indexToRemove);
    if (onChange) onChange(updated);
  };

  // Remove a staged raw File (Path 2)
  const handleRemoveStagedFile = (fileIndex) => {
    if (!onFilesChange || disabled) return;
    const nextFiles = (files || []).filter((_, idx) => idx !== fileIndex);
    onFilesChange(nextFiles);
  };

  // Set an image as primary cover (move to index 0)
  const handleSetPrimary = (indexToPromote) => {
    if (disabled || indexToPromote === 0) return;
    const item = safeImages[indexToPromote];
    const rest = safeImages.filter((_, idx) => idx !== indexToPromote);
    if (onChange) onChange([item, ...rest]);
    toast.info("Cover image updated");
  };

  // Reorder images
  const handleMove = (currentIndex, direction) => {
    if (disabled) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= safeImages.length) return;

    const next = [...safeImages];
    const temp = next[currentIndex];
    next[currentIndex] = next[targetIndex];
    next[targetIndex] = temp;
    if (onChange) onChange(next);
  };

  // Add URL directly
  const handleAddDirectUrl = () => {
    const raw = urlDraft.trim();
    if (!raw) return;

    if (isFull) {
      setErrorMessage(`Maximum limit of ${maxImages} images reached. Remove an image to add more.`);
      return;
    }

    if (!/^https?:\/\//i.test(raw)) {
      setErrorMessage("Image URL must start with http:// or https://");
      return;
    }

    if (safeImages.includes(raw)) {
      setErrorMessage("This image URL has already been added.");
      return;
    }

    setErrorMessage("");
    appendUrls([raw]);
    setUrlDraft("");
    toast.success("Image URL added");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h4>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isFull
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  : totalCurrentCount > 0
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {totalCurrentCount} / {maxImages} {totalCurrentCount === 1 ? "image" : "images"}
            </span>
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>

        {totalCurrentCount > 0 && (
          <button
            type="button"
            onClick={() => !disabled && !isFull && inputRef.current?.click()}
            disabled={disabled || isFull || isUploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-emerald-500 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500"
          >
            <Plus size={14} />
            <span>Add More</span>
          </button>
        )}
      </div>

      {/* Customer Fallback Notice Banner (When no images uploaded) */}
      {showCustomerNotice && safeImages.length === 0 && stagedPreviews.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
          <div className="rounded-lg bg-sky-100 p-1.5 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
            <Sparkles size={16} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sky-900 dark:text-sky-200">Customer Fallback Feature Active</p>
            <p className="mt-0.5 leading-relaxed text-sky-700/90 dark:text-sky-300/80">
              If left empty, images will be automatically pulled from bundled hotel and flight offers!
              You can still upload custom curated photos or paste hosted image URLs below.
            </p>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && !isUploading && !isFull && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !isUploading && !isFull) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isFull) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled && !isUploading && !isFull) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-900/30"
            : isFull
              ? "cursor-not-allowed border-slate-200 bg-slate-50/80 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40"
              : isDragging
                ? "cursor-pointer border-emerald-500 bg-emerald-50/70 shadow-md ring-4 ring-emerald-500/10 dark:border-emerald-500 dark:bg-emerald-950/20"
                : "cursor-pointer border-slate-200 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/30 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/20"
        } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS_STRING}
          multiple
          hidden
          disabled={disabled || isUploading || isFull}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2.5 py-2">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <Loader2 size={24} className="animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Uploading {uploadCount} image{uploadCount > 1 ? "s" : ""} to Cloudinary...
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Processing media and generating high-speed CDN URLs</p>
            </div>
          </div>
        ) : isFull ? (
          <div className="flex flex-col items-center gap-1.5 py-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <ImageIcon size={20} />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Maximum {maxImages} images reached
            </p>
            <p className="text-[11px] text-slate-400">
              Remove one of your existing images to upload a different one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${
                isDragging
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:group-hover:bg-emerald-900/50"
              }`}
            >
              <UploadCloud size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 sm:text-sm dark:text-slate-200">
                <span className="text-emerald-700 underline underline-offset-2 dark:text-emerald-400">Click to browse</span> or drag & drop files here
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                JPG, JPEG, PNG, WEBP, GIF · Max 5 MB per image · Up to {slotsAvailable} more slot{slotsAvailable === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error alert message */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-600 dark:text-red-400" />
            <span className="break-all">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="rounded-md p-1 text-red-500 hover:bg-red-100 hover:text-red-800 dark:hover:bg-red-900/50"
            aria-label="Dismiss error"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Direct URL input bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="url"
            value={urlDraft}
            disabled={disabled || isFull || isUploading}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddDirectUrl();
              }
            }}
            placeholder={isFull ? "Maximum image limit reached" : "Paste hosted image URL (https://...) and press Enter"}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-900"
          />
        </div>
        <button
          type="button"
          onClick={handleAddDirectUrl}
          disabled={disabled || isFull || !urlDraft.trim() || isUploading}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
        >
          <ImagePlus size={14} />
          <span>Add URL</span>
        </button>
      </div>

      {/* Staged Local Files Grid (Path 2: Direct FormData staging) */}
      {stagedPreviews.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attached Files for FormData Submission ({stagedPreviews.length})
            </p>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Path 2 (Direct Upload on Save)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {stagedPreviews.map((staged, index) => (
              <div
                key={`${staged.name}-${index}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs transition hover:shadow-md dark:border-emerald-900/40 dark:bg-slate-900"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={staged.url}
                    alt={staged.name}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-700/90 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                    <FileImage size={10} />
                    {staged.size} MB
                  </span>
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleRemoveStagedFile(index)}
                      className="rounded-md bg-white/90 p-1 text-slate-600 shadow-xs backdrop-blur-xs transition hover:bg-red-600 hover:text-white dark:bg-slate-800 dark:text-slate-300"
                      title="Remove file"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="border-t border-slate-100 bg-slate-50/80 px-2 py-1 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    {staged.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cloud Hosted Image Gallery Grid (Path 1 / Cloudinary URLs) */}
      {safeImages.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Cloud Media Gallery ({safeImages.length})
            </p>
            {itemId && (
              <span className="text-[11px] font-medium text-slate-400">
                Auto-syncs to cloud
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {safeImages.map((url, index) => {
              const isPrimary = index === 0;
              return (
                <div
                  key={`${url}-${index}`}
                  className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-xs transition hover:shadow-md dark:bg-slate-900 ${
                    isPrimary
                      ? "border-emerald-500 ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {/* Image container */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={url}
                      alt={`Upload ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Primary badge */}
                    {isPrimary ? (
                      <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-700/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                        <Star size={10} className="fill-amber-300 text-amber-300" />
                        Cover
                      </span>
                    ) : (
                      <span className="absolute left-1.5 top-1.5 inline-flex items-center rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-xs">
                        #{index + 1}
                      </span>
                    )}

                    {/* Floating action buttons on top right */}
                    <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url, index })}
                        className="rounded-md bg-white/90 p-1 text-slate-600 shadow-xs backdrop-blur-xs transition hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:text-slate-300"
                        title="View Full Image"
                        aria-label="View Full Image"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        disabled={disabled || isDeleting}
                        className="rounded-md bg-white/90 p-1 text-slate-600 shadow-xs backdrop-blur-xs transition hover:bg-red-600 hover:text-white disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300"
                        title={itemId ? "Delete permanently from item" : "Remove Image"}
                        aria-label="Delete Image"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Footer controls on card */}
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900/80">
                    {/* Promote to cover button */}
                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(index)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400"
                        title="Make this the primary cover image"
                      >
                        <Star size={11} className="text-slate-400" />
                        <span>Set Cover</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Primary</span>
                    )}

                    {/* Left / Right arrows to reorder */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMove(index, -1)}
                        disabled={disabled || index === 0}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title="Move left"
                        aria-label="Move left"
                      >
                        <ArrowLeft size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 1)}
                        disabled={disabled || index === safeImages.length - 1}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title="Move right"
                        aria-label="Move right"
                      >
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex max-h-[90vh] max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Image Preview #{previewImage.index + 1}
                </span>
                {previewImage.index === 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                    Cover Image
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(previewImage.url)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Copy direct URL"
                >
                  {copiedUrl ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedUrl ? "Copied" : "Copy URL"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="flex max-h-[70vh] items-center justify-center overflow-auto bg-slate-950 p-2">
              <img
                src={previewImage.url}
                alt={`Preview ${previewImage.index + 1}`}
                className="max-h-[65vh] w-auto max-w-full rounded-md object-contain"
              />
            </div>

            {/* Modal Footer with URL */}
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400">
              <p className="truncate font-mono">{previewImage.url}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

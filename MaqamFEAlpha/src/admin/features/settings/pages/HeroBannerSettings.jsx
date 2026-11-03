import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  Trash2,
  RefreshCw,
  Eye,
  AlertTriangle,
  Sparkles,
  Info,
  Calendar,
  Cloud,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  fetchHeroPic,
  changeHeroPic,
  editHeroPic,
  deleteHeroPic,
} from "../../../../services/cmsService";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB (per CMS spec)
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ACCEPTED_EXTENSIONS_STRING = ".jpg,.jpeg,.png,.webp,.gif";

export default function HeroBannerSettings() {
  const fileInputRef = useRef(null);

  // Server state
  const [serverBanner, setServerBanner] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form / Draft state
  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "url"
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [subTitleDraft, setSubTitleDraft] = useState("");
  const [isPublishedDraft, setIsPublishedDraft] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [previewViewport, setPreviewViewport] = useState("desktop"); // "desktop" | "mobile"

  // Load existing hero banner
  const loadBanner = async () => {
    setIsLoading(true);
    try {
      const data = await fetchHeroPic();
      setServerBanner(data);
      if (data) {
        setTitleDraft(data.title || "");
        setSubTitleDraft(data.subTitle || "");
        setUrlDraft(data.imageUrl || "");
        setIsPublishedDraft(data.isPublished !== false);
        if (data.imageUrl) {
          setActiveTab("url");
        }
      } else {
        // Defaults if no banner exists
        setTitleDraft("Begin Your Sacred Journey with Maqam Travels");
        setSubTitleDraft(
          "Tailored Umrah & Hajj Packages, Premium Hotels & Seamless Flights"
        );
        setUrlDraft("");
        setIsPublishedDraft(true);
      }
    } catch {
      toast.error("Failed to load current hero banner settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      try {
        const data = await fetchHeroPic();
        if (!ignore) {
          setServerBanner(data);
          if (data) {
            setTitleDraft(data.title || "");
            setSubTitleDraft(data.subTitle || "");
            setUrlDraft(data.imageUrl || "");
            setIsPublishedDraft(data.isPublished !== false);
            if (data.imageUrl) {
              setActiveTab("url");
            }
          }
          setIsLoading(false);
        }
      } catch {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };
    init();
    return () => {
      ignore = true;
    };
  }, []);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (filePreviewUrl && filePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Handle local file selection
  const handleFileSelect = (files) => {
    const file = files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      toast.error("Invalid file format. Please upload JPG, PNG, WEBP, or GIF.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`File size (${sizeMB} MB) exceeds maximum 10 MB limit.`);
      return;
    }

    if (filePreviewUrl && filePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
    setActiveTab("upload");
  };

  // Compute the live display image for the preview card
  const effectiveImageUrl =
    activeTab === "upload" && filePreviewUrl
      ? filePreviewUrl
      : urlDraft.trim() || serverBanner?.imageUrl || "";

  // Save / Publish handler
  const handleSave = async () => {
    if (activeTab === "upload" && !selectedFile && !serverBanner?.imageUrl) {
      toast.error("Please choose an image file to upload.");
      return;
    }

    if (activeTab === "url" && !urlDraft.trim()) {
      toast.error("Please enter a valid image URL.");
      return;
    }

    setIsSaving(true);
    try {
      let result;
      if (selectedFile) {
        // Upload binary file
        result = await changeHeroPic({
          file: selectedFile,
          title: titleDraft.trim(),
          subTitle: subTitleDraft.trim(),
        });
        toast.success("Hero banner picture uploaded and published successfully!");
      } else if (serverBanner) {
        // Edit existing metadata / URL
        result = await editHeroPic({
          imageUrl: urlDraft.trim(),
          title: titleDraft.trim(),
          subTitle: subTitleDraft.trim(),
          isPublished: isPublishedDraft,
        });
        toast.success("Hero banner properties updated successfully!");
      } else {
        // Create new via URL
        result = await changeHeroPic({
          imageUrl: urlDraft.trim(),
          title: titleDraft.trim(),
          subTitle: subTitleDraft.trim(),
        });
        toast.success("Hero banner created and published successfully!");
      }

      setServerBanner(result);
      setSelectedFile(null);
      if (filePreviewUrl && filePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl("");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save hero banner. Please check inputs and try again.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset / Delete handler
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteHeroPic();
      toast.success("Hero banner removed. System restored to default slides.");
      setServerBanner(null);
      setSelectedFile(null);
      if (filePreviewUrl && filePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl("");
      }
      setUrlDraft("");
      setTitleDraft("Begin Your Sacred Journey with Maqam Travels");
      setSubTitleDraft(
        "Tailored Umrah & Hajj Packages, Premium Hotels & Seamless Flights"
      );
      setShowDeleteModal(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete hero banner.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Discard draft changes
  const handleDiscard = () => {
    if (filePreviewUrl && filePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl("");
    }
    setSelectedFile(null);
    if (serverBanner) {
      setTitleDraft(serverBanner.title || "");
      setSubTitleDraft(serverBanner.subTitle || "");
      setUrlDraft(serverBanner.imageUrl || "");
      setIsPublishedDraft(serverBanner.isPublished !== false);
    } else {
      setTitleDraft("Begin Your Sacred Journey with Maqam Travels");
      setSubTitleDraft(
        "Tailored Umrah & Hajj Packages, Premium Hotels & Seamless Flights"
      );
      setUrlDraft("");
      setIsPublishedDraft(true);
    }
    toast.info("Draft discarded");
  };

  const isLive = Boolean(serverBanner?.imageUrl && serverBanner?.isPublished !== false);

  return (
    <div className="space-y-6">
      {/* Top Banner / Status Overview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <ImageIcon size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Frontend Hero Banner Management
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Manage the main homepage showcase picture, headline text, and Cloudinary media synchronization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Active Banner
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Info size={12} />
                Default System Slides
              </span>
            )}

            <button
              type="button"
              onClick={loadBanner}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title="Refresh banner status from server"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls + Interactive Live Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Editor Controls (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Media Selector Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Banner Media Asset
              </h3>

              {/* Upload vs URL Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
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
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
                    activeTab === "url"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <LinkIcon size={13} />
                  <span>Image URL</span>
                </button>
              </div>
            </div>

            <div className="mt-4">
              {activeTab === "upload" ? (
                /* Drag and Drop Zone */
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileSelect(e.dataTransfer.files);
                  }}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30"
                      : "border-slate-300 bg-slate-50/50 hover:border-emerald-500 hover:bg-emerald-50/20 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-emerald-500"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS_STRING}
                    hidden
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <UploadCloud size={24} />
                  </div>

                  <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                    Click to choose a banner image or drag & drop here
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Supports JPG, JPEG, PNG, WEBP, GIF · Max 10 MB per file
                  </p>

                  {selectedFile && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-100/80 px-3 py-1.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                      <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <span>{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Direct Image URL Input */
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Direct Image URL
                  </label>
                  <div className="relative">
                    <LinkIcon
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="url"
                      value={urlDraft}
                      onChange={(e) => setUrlDraft(e.target.value)}
                      placeholder="https://res.cloudinary.com/... or https://images.unsplash.com/..."
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Paste a publicly accessible CDN or hosted HTTPS image link.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Headline & Metadata Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-2 dark:border-slate-800">
              Banner Headlines & Visibility
            </h3>

            {/* Headline Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Main Headline (Title)
                </label>
                <span className="text-[11px] text-slate-400">
                  {titleDraft.length} / 200
                </span>
              </div>
              <input
                type="text"
                maxLength={200}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="e.g. Begin Your Sacred Journey with Maqam Travels"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Subtitle / Tagline */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Sub-Headline (Tagline)
                </label>
                <span className="text-[11px] text-slate-400">
                  {subTitleDraft.length} / 500
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                value={subTitleDraft}
                onChange={(e) => setSubTitleDraft(e.target.value)}
                placeholder="e.g. Tailored Umrah & Hajj Packages, Premium Hotels & Seamless Flights"
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Publication Status Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Publish on Website
                </label>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  When enabled, this banner replaces default slides on the public homepage.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublishedDraft}
                onClick={() => setIsPublishedDraft(!isPublishedDraft)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isPublishedDraft ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isPublishedDraft ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>{serverBanner ? "Save & Update Banner" : "Publish Hero Banner"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDiscard}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Discard Changes
              </button>
            </div>

            {serverBanner && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeleting || isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-3.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Reset to Default Slides</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Responsive Preview (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Eye size={14} className="text-emerald-600" />
                <span>Live Frontend Simulation</span>
              </div>

              {/* Viewport simulation switcher */}
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewViewport("desktop")}
                  className={`rounded-md px-2 py-0.5 transition ${
                    previewViewport === "desktop"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport("mobile")}
                  className={`rounded-md px-2 py-0.5 transition ${
                    previewViewport === "mobile"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  Mobile
                </button>
              </div>
            </div>

            {/* Simulated Hero Banner Screen */}
            <div className="mt-4 flex justify-center">
              <div
                className={`transition-all duration-300 w-full ${
                  previewViewport === "mobile" ? "max-w-[280px]" : "w-full"
                }`}
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800">
                  {effectiveImageUrl ? (
                    <img
                      src={effectiveImageUrl}
                      alt="Banner Preview"
                      className="h-full w-full object-cover transition-transform duration-1000 scale-105"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1200";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-4 text-center">
                      <ImageIcon size={32} className="text-emerald-400/60 mb-2" />
                      <p className="text-xs font-semibold text-slate-300">
                        Default Mecca/Madinah slides will be displayed
                      </p>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />
                </div>

                {/* Simulated Search Bar Underlay */}
                <div className="mx-3 -mt-4 relative z-10 rounded-xl bg-white/95 backdrop-blur-md p-2 shadow-md border border-slate-100 dark:bg-slate-800/95 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Flights, Hotels & Packages Search...</span>
                  <span className="rounded-md bg-emerald-700 text-white px-2 py-0.5 font-bold text-[9px]">
                    Search
                  </span>
                </div>
              </div>
            </div>

            {/* Cloudinary & Metadata Details */}
            {serverBanner && (
              <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800/50">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Cloud size={13} className="text-emerald-600" />
                    Storage Provider
                  </span>
                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-200">
                    {serverBanner.publicId ? "Cloudinary CDN" : "External URL"}
                  </span>
                </div>

                {serverBanner.publicId && (
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">Cloudinary Asset ID</span>
                    <span className="font-mono text-[10px] truncate max-w-[170px] text-slate-500" title={serverBanner.publicId}>
                      {serverBanner.publicId}
                    </span>
                  </div>
                )}

                {serverBanner.updatedAt && (
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      Last Synchronized
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(serverBanner.updatedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Reset to Default Slides */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <ShieldAlert size={22} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reset Hero Banner to Default?
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This will permanently delete the custom hero banner record and delete the asset from Cloudinary. The public website will immediately revert to showing the default Mecca and Madinah showcase slides.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Confirm Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';

export default function ImageUpload({
  onImageSelect,
  initialPreview = null,
  maxSize = 5242880, // 5MB
  accept = 'image/*'
}) {
  const [preview, setPreview] = useState(initialPreview);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSize / 1024 / 1024}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = e.target?.result;
      setPreview(previewUrl);
      onImageSelect?.(file, previewUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onImageSelect?.(null, null);
  };

  return (
    <div className="space-y-3">
      {!preview ? (
        <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 cursor-pointer hover:bg-slate-100 transition">
          <Upload size={24} className="text-slate-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-900">Click to upload or drag and drop</p>
            <p className="text-xs text-slate-500">PNG, JPG, GIF up to 5MB</p>
          </div>
          <input
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      ) : (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="h-40 w-40 rounded-lg object-cover border border-slate-200"
          />
          <button
            onClick={handleRemove}
            className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white hover:bg-red-700 transition"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}

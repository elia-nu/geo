"use client";
import React, { useState } from "react";
import { Camera, Upload, X, User } from "lucide-react";

export default function EmployeePhotoUpload({
  employeeId,
  currentPhotoUrl,
  onPhotoUpdate,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(currentPhotoUrl);
  const [error, setError] = useState("");

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Upload file
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch(`/api/employee/${employeeId}/photo`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setPreview(result.photoUrl + `?t=${Date.now()}`); // Add timestamp to bust cache
        onPhotoUpdate && onPhotoUpdate(result.photoUrl);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload photo");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      setError(error.message);
      setPreview(currentPhotoUrl); // Reset preview on error
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const response = await fetch(`/api/employee/${employeeId}/photo`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPreview(null);
        onPhotoUpdate && onPhotoUpdate(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete photo");
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Photo Display */}
      <div className="flex items-center justify-center">
        <div className="relative">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Employee"
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                onError={() => {
                  setPreview(null);
                  setError("Failed to load photo");
                }}
              />
              {!isUploading && (
                <button
                  onClick={handleDeletePhoto}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  title="Delete photo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
              <User className="w-16 h-16 text-gray-400" />
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleInputChange}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-2">
          <div className="flex justify-center">
            {dragActive ? (
              <Upload className="w-8 h-8 text-blue-500" />
            ) : (
              <Camera className="w-8 h-8 text-gray-400" />
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900">
              {dragActive ? "Drop photo here" : "Upload employee photo"}
            </p>
            <p className="text-xs text-gray-500">
              Drag and drop or click to select
            </p>
          </div>

          <div className="text-xs text-gray-400">
            <p>Supported formats: JPEG, PNG, WebP</p>
            <p>Maximum size: 5MB</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}

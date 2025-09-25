"use client";

import React, { useState } from "react";
import { Camera, X, Download } from "lucide-react";

export default function AttendancePhotoViewer({ photoUrl, title, onClose }) {
  const [imageError, setImageError] = useState(false);

  if (!photoUrl) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = photoUrl;
    link.download = `attendance_${title}_${
      new Date().toISOString().split("T")[0]
    }.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <span>{title} Photo</span>
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Download photo"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {imageError ? (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
              <div className="text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Photo not available</p>
              </div>
            </div>
          ) : (
            <img
              src={photoUrl}
              alt={`${title} attendance photo`}
              className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
              onError={() => setImageError(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

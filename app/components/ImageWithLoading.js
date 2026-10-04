"use client";

import React, { useState } from "react";
import { Loader2, ImageOff } from "lucide-react";

/**
 * Reusable image component with smooth animated loading spinner and skeleton placeholder
 * until the image fetches and loads completely.
 */
export default function ImageWithLoading({
  src,
  alt = "Image",
  className = "",
  containerClassName = "",
  skeletonHeight = "h-48",
  objectFit = "object-contain",
  fallbackText = "Image could not be loaded",
}) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!src) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 ${skeletonHeight} ${containerClassName}`}>
        <ImageOff className="w-6 h-6 mb-1 text-gray-300" />
        <span className="text-xs font-medium">No image available</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {loading && !hasError && (
        <div className={`w-full ${skeletonHeight} bg-slate-100 flex flex-col items-center justify-center text-slate-500 animate-pulse rounded-lg border border-slate-200`}>
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-2" />
          <span className="text-xs font-medium">Fetching image...</span>
        </div>
      )}

      {hasError ? (
        <div className={`w-full ${skeletonHeight} bg-rose-50/50 flex flex-col items-center justify-center text-rose-500 rounded-lg border border-rose-200 p-4`}>
          <ImageOff className="w-6 h-6 mb-1 text-rose-400" />
          <span className="text-xs font-semibold">{fallbackText}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setHasError(true);
          }}
          className={`${className} ${objectFit} transition-opacity duration-300 ${
            loading ? "opacity-0 absolute inset-0" : "opacity-100"
          }`}
        />
      )}
    </div>
  );
}

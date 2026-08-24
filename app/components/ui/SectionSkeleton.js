import React from "react";

export default function SectionSkeleton({ title = "Loading Section..." }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-md"></div>
          <div className="h-4 w-72 bg-slate-100 rounded-md"></div>
        </div>
        <div className="h-9 w-28 bg-slate-200 rounded-lg"></div>
      </div>

      {/* Stats/Cards row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-slate-200 rounded"></div>
              <div className="h-6 w-6 bg-slate-200 rounded-full"></div>
            </div>
            <div className="h-7 w-16 bg-slate-300 rounded"></div>
            <div className="h-3 w-24 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main content table/chart skeleton */}
      <div className="space-y-3 pt-4">
        <div className="h-10 w-full bg-slate-100 rounded-lg"></div>
        <div className="h-12 w-full bg-slate-50 rounded-lg"></div>
        <div className="h-12 w-full bg-slate-50 rounded-lg"></div>
        <div className="h-12 w-full bg-slate-50 rounded-lg"></div>
        <div className="h-12 w-full bg-slate-50 rounded-lg"></div>
      </div>
    </div>
  );
}

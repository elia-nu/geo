"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Avoid SSR to prevent hydration mismatches (calendar uses Date/locale)
const EthiopianCalendar = dynamic(
  () => import("../../components/EthiopianCalendar"),
  { ssr: false }
);

export default function HRMCalendarPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <div className="p-6">
      <EthiopianCalendar />
    </div>
  );
}

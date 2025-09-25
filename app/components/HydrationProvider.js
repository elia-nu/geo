"use client";
import { useEffect, useState } from "react";

export default function HydrationProvider({ children }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <div suppressHydrationWarning={true}>
      {isHydrated ? (
        children
      ) : (
        <div className="min-h-screen bg-gray-50 animate-pulse" />
      )}
    </div>
  );
}

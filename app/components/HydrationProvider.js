"use client";
import { useEffect, useState } from "react";
import ToastProvider from "./ToastProvider";

export default function HydrationProvider({ children }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <div suppressHydrationWarning={true}>
      {isHydrated ? (
        <>
          {children}
          <ToastProvider />
        </>
      ) : (
        <div className="min-h-screen bg-gray-50 animate-pulse" />
      )}
    </div>
  );
}

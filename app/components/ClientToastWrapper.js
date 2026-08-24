"use client";

import React from "react";
import ToastProvider from "./ToastProvider";

export default function ClientToastWrapper({ children }) {
  return (
    <>
      {children}
      <ToastProvider />
    </>
  );
}

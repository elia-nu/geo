"use client";

import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ToastProvider = () => {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      newestOnTop
      theme="colored"
      closeOnClick
      pauseOnHover
      draggable
      pauseOnFocusLoss
    />
  );
};

export default ToastProvider;

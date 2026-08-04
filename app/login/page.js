"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User, Loader2 } from "lucide-react";
import {
  showSuccessToast,
  showErrorToast,
} from "../utils/sweetAlert";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    employeeId: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem("authToken", result.data.token);

        if (result.data.employee.role === "ADMIN") {
          showSuccessToast("Welcome back!", "Signing you in…");
          // Brief pause so the toast and loading state feel smooth
          await new Promise((resolve) => setTimeout(resolve, 400));
          router.push("/hrm/protected");
          return;
        }

        localStorage.removeItem("authToken");
        const msg =
          "Access denied. Admin role required to access HRM dashboard.";
        setError(msg);
        showErrorToast("Access Denied", msg);
      } else {
        const msg = result.error || "Login failed";
        setError(msg);
        showErrorToast("Login Failed", msg);
      }
    } catch (err) {
      console.error("Login error:", err);
      const msg = "Network error. Please try again.";
      setError(msg);
      showErrorToast("Connection Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
      style={{
        background: "url('/4565.jpg') no-repeat center center fixed",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
      <div className="relative max-w-md w-full">
        <div className="bg-white/50 rounded-xl shadow-lg p-8 backdrop-blur-lg">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center">
              <img
                src="/newlogo.png"
                alt="Logo"
                className="w-48 bg-white p-2 rounded-lg"
              />
            </div>
            <h1 className="text-3xl font-bold text-blue-900 my-2">
              EF Architects and Engineers Consulting plc
            </h1>
            <p className="text-blue-900">
              Sign in to access the Human Resource Management system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="employeeId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="Enter your Employee ID"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-[fadeIn_0.25s_ease-out]">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] disabled:cursor-wait shadow-sm hover:shadow-md disabled:shadow-none"
            >
              <span
                className={`flex items-center justify-center gap-2 transition-all duration-300 ${
                  loading ? "opacity-100" : "opacity-100"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="animate-pulse">Signing In…</span>
                  </>
                ) : (
                  "Sign In"
                )}
              </span>
              {loading && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.2s_ease-in-out_infinite]" />
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Access Requirements
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Valid Employee ID and Password</li>
                <li>• Admin role assigned by system administrator</li>
                <li>• Active employee status</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

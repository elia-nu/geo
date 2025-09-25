"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft, AlertTriangle } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleGoBack = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <Shield className="w-10 h-10 text-red-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>

        {/* Message */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Insufficient Permissions
            </h2>
          </div>

          <p className="text-gray-600 mb-6">
            You don't have the required permissions to access the HRM Dashboard.
            This area is restricted to administrators only.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-yellow-900 mb-2">
              Required Access Level
            </h3>
            <p className="text-sm text-yellow-700">
              You need an <strong>Administrator</strong> role to access this
              system.
            </p>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <p>If you believe this is an error:</p>
            <ul className="text-left space-y-1">
              <li>• Contact your system administrator</li>
              <li>• Request admin role assignment</li>
              <li>• Verify your employee account status</li>
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleGoBack}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Login
        </button>

        {/* Footer */}
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            Need assistance? Contact your IT department
          </p>
        </div>
      </div>
    </div>
  );
}

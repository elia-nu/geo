"use client";
import { useState } from "react";

export default function TestContractExpiry() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const checkStatus = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/notifications/contract-expiry/test");
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendNotifications = async (force = false) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const url = force
        ? "/api/notifications/contract-expiry?force=true"
        : "/api/notifications/contract-expiry";
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Contract Expiry Notification Test</h1>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={checkStatus}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Check Employee Status
          </button>
          <button
            onClick={() => sendNotifications(false)}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Notifications (Normal)
          </button>
          <button
            onClick={() => sendNotifications(true)}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Force Send (Test Mode)
          </button>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Processing...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-semibold">Error:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <pre className="text-sm overflow-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-blue-900 mb-2">How to Test:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Click "Check Employee Status" to see all contractual employees</li>
            <li>Click "Force Send (Test Mode)" to send notifications immediately</li>
            <li>Check the employee dashboard and email inbox</li>
          </ol>
          <p className="text-xs text-blue-600 mt-2">
            Note: Normal mode only sends notifications for contracts expiring in
            13-15 days or within 7 days. Force mode sends regardless of date.
          </p>
        </div>
      </div>
    </div>
  );
}


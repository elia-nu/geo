"use client";
import { useState } from "react";

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username and password are required");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("attendanceUser", username.trim());
      setLoading(false);
      onLogin(username.trim());
    }, 700); // Simulate loading
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm mx-auto bg-white/90 p-8 rounded-2xl shadow-2xl flex flex-col gap-6 border border-blue-100"
        style={{
          backdropFilter: "blur(6px)",
        }}
      >
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="bg-blue-100 rounded-full p-3 shadow-md mb-1">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-blue-700 tracking-tight">
            Welcome Back
          </h2>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-10 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition placeholder-gray-400 bg-white"
              autoFocus
              autoComplete="username"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition placeholder-gray-400 bg-white pr-12"
              autoComplete="current-password"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 transition"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.13 0 2.21.19 3.22.54M19.07 4.93A9.953 9.953 0 0121 12c0 3-4 7-9 7-1.13 0-2.21-.19-3.22-.54M4.93 19.07A9.953 9.953 0 013 12c0-3 4-7 9-7 1.13 0 2.21.19 3.22.54"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="3"
                    y1="3"
                    x2="21"
                    y2="21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
        {error && (
          <div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded py-2 px-3 animate-shake">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`bg-gradient-to-r from-blue-500 to-blue-700 text-white py-3 rounded-lg font-semibold shadow-md hover:from-blue-600 hover:to-blue-800 transition-all flex items-center justify-center gap-2 ${
            loading ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Logging in...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Login
            </>
          )}
        </button>
      </form>
    </div>
  );
}

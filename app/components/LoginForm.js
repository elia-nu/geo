"use client";
import { useState } from "react";

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username and password are required");
      return;
    }
    // Demo: just store username in localStorage
    localStorage.setItem("attendanceUser", username.trim());
    onLogin(username.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xs mx-auto bg-white/80 p-6 rounded-xl shadow flex flex-col gap-4 mt-24"
    >
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
        Login
      </h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-400"
        autoFocus
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-400"
      />
      {error && <div className="text-red-600 text-sm text-center">{error}</div>}
      <button
        type="submit"
        className="bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
      >
        Login
      </button>
    </form>
  );
}

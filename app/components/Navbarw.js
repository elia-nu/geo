"use client";
import Link from "next/link";
import { FaMapMarkerAlt, FaHome, FaUserShield, FaBars } from "react-icons/fa";
import { useState } from "react";

export default function Navbar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Helper to check admin
  const isAdmin = user === "elias" || user === "mekdi" || user === "abdi";

  return (
    <nav className="w-full flex items-center justify-between px-4 md:px-8 py-4 bg-white backdrop-blur-md shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] border-b border-gray-200 text-black z-50 relative">
      {/* Left: Logo/Title */}
      <div className="flex items-center space-x-2">
        <span className="text-lg md:text-xl text-gray-500 bg-white/60 backdrop-blur-sm rounded-lg px-2 md:px-3 py-1 shadow-sm glassmorphism">
          Smart Attendance System
        </span>
        <FaMapMarkerAlt className="text-green-500 drop-shadow-md" />
      </div>

      {/* Hamburger for mobile */}
      <button
        className="md:hidden flex items-center ml-2 text-2xl text-gray-700 focus:outline-none"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Open menu"
      >
        <FaBars />
      </button>

      {/* Center: Home link (hidden on mobile, shown in menu) */}
      <div className="hidden md:flex items-center space-x-6">
        <Link href="/" passHref>
          <span className="flex items-center gap-2 text-lg font-semibold text-black bg-white/60 backdrop-blur-sm hover:bg-white/80 text-green-700 transition-all duration-200 cursor-pointer rounded-xl px-4 py-2 glassmorphism">
            <FaHome className="text-green-600" />
            Home
          </span>
        </Link>
      </div>

      {/* Right: User info and admin (hidden on mobile, shown in menu) */}
      <div className="hidden md:flex items-center space-x-3">
        {user && (
          <div className="flex items-center space-x-3 ml-6">
            {isAdmin && (
              <Link href="/geofence-management" passHref>
                <span className="flex items-center gap-2 text-lg font-semibold text-blue-700 bg-white/60 backdrop-blur-sm border border-gray-200 shadow-md hover:shadow-lg hover:bg-white/80 hover:text-blue-900 transition-all duration-200 cursor-pointer rounded-xl px-4 py-2 glassmorphism">
                  <FaUserShield className="text-blue-600" />
                  Admin
                </span>
              </Link>
            )}

            <span className="text-sm text-gray-700">
              Logged in as <span className="font-semibold">{user}</span>
            </span>

            <button
              onClick={onLogout}
              className="px-3 py-1 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-white shadow-lg border-b border-gray-200 flex flex-col items-start px-4 py-3 md:hidden z-50 animate-fade-in">
          <Link
            href="/"
            passHref
            onClick={() => setMenuOpen(false)}
            className="w-full"
          >
            <span className="flex items-center gap-2 text-base font-semibold text-black bg-white/60 backdrop-blur-sm hover:bg-white/80 text-green-700 transition-all duration-200 cursor-pointer rounded-xl px-3 py-2 mb-2 glassmorphism w-full">
              <FaHome className="text-green-600" />
              Home
            </span>
          </Link>
          {user && isAdmin && (
            <Link
              href="/geofence-management"
              passHref
              onClick={() => setMenuOpen(false)}
              className="w-full"
            >
              <span className="flex items-center gap-2 text-base font-semibold text-blue-700 bg-white/60 backdrop-blur-sm border border-gray-200 shadow-md hover:shadow-lg hover:bg-white/80 hover:text-blue-900 transition-all duration-200 cursor-pointer rounded-xl px-3 py-2 mb-2 glassmorphism w-full">
                <FaUserShield className="text-blue-600" />
                Admin
              </span>
            </Link>
          )}
          {user && (
            <div className="flex flex-col w-full space-y-2">
              <span className="text-sm text-gray-700 px-1">
                Logged in as <span className="font-semibold">{user}</span>
              </span>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="px-3 py-1 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition w-fit"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

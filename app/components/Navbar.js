import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-white shadow-lg border-b text-black max-w-screen-xl mx-auto">
      <div className="flex space-x-6">
        <Link href="/">
          <span className="text-lg font-semibold text-black hover:text-green-800 cursor-pointer">
            Home
          </span>
        </Link>
        <Link href="/geofence-management">
          <span className="text-lg font-semibold hover:text-blue-600 cursor-pointer">
            Admin
          </span>
        </Link>
      </div>
    </nav>
  );
}

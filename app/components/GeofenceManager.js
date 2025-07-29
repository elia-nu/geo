"use client";
import { useEffect, useState } from "react";

export default function GeofenceManager() {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newGeofence, setNewGeofence] = useState({
    name: "",
    lat: "",
    lng: "",
    radius: "",
  });
  const [editIdx, setEditIdx] = useState(null);
  const [editGeofence, setEditGeofence] = useState({
    name: "",
    lat: "",
    lng: "",
    radius: "",
  });

  useEffect(() => {
    fetchGeofences();
  }, []);

  const fetchGeofences = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/geofences");
      const data = await res.json();
      setGeofences(data);
    } catch (err) {
      setError("Failed to load geofences");
    }
    setLoading(false);
  };

  const handleInput = (e, setter) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGeofence.name,
          lat: parseFloat(newGeofence.lat),
          lng: parseFloat(newGeofence.lng),
          radius: parseFloat(newGeofence.radius),
        }),
      });
      if (!res.ok) throw new Error();
      setSuccess("Geofence added");
      setNewGeofence({ name: "", lat: "", lng: "", radius: "" });
      fetchGeofences();
    } catch {
      setError("Failed to add geofence");
    }
  };

  const handleEdit = (idx) => {
    setEditIdx(idx);
    setEditGeofence({ ...geofences[idx] });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/geofences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editGeofence.name,
          lat: parseFloat(editGeofence.lat),
          lng: parseFloat(editGeofence.lng),
          radius: parseFloat(editGeofence.radius),
        }),
      });
      if (!res.ok) throw new Error();
      setSuccess("Geofence updated");
      setEditIdx(null);
      fetchGeofences();
    } catch {
      setError("Failed to update geofence");
    }
  };

  const handleDelete = async (name) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `/api/geofences?name=${encodeURIComponent(name)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      setSuccess("Geofence deleted");
      fetchGeofences();
    } catch {
      setError("Failed to delete geofence");
    }
  };

  return (
    <div className=" min-h-screen w-full bg-white">
      <div className="max-w-3xl mx-auto p-8   ">
        <h2 className="text-3xl font-extrabold mb-6 text-blue-800 flex items-center gap-2">
          <svg
            className="w-7 h-7 text-blue-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 6v6l4 2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Geofence Management
        </h2>
        {(error || success) && (
          <div className="mb-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded shadow-sm animate-shake">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded shadow-sm animate-pulse">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {success}
              </div>
            )}
          </div>
        )}
        <form
          onSubmit={handleAdd}
          className="flex flex-wrap gap-3 mb-8 items-end bg-white/80 rounded-lg p-4 shadow"
        >
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 mb-1">
              Name
            </label>
            <input
              name="name"
              value={newGeofence.name}
              onChange={(e) => handleInput(e, setNewGeofence)}
              placeholder="Name"
              className="p-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-500 font-semibold placeholder:text-gray-700"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 mb-1">
              Latitude
            </label>
            <input
              name="lat"
              value={newGeofence.lat}
              onChange={(e) => handleInput(e, setNewGeofence)}
              placeholder="Latitude"
              className="p-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-500 font-semibold placeholder:text-gray-700"
              required
              type="number"
              step="any"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 mb-1">
              Longitude
            </label>
            <input
              name="lng"
              value={newGeofence.lng}
              onChange={(e) => handleInput(e, setNewGeofence)}
              placeholder="Longitude"
              className="p-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-500 font-semibold placeholder:text-gray-700"
              required
              type="number"
              step="any"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 mb-1">
              Radius (m)
            </label>
            <input
              name="radius"
              value={newGeofence.radius}
              onChange={(e) => handleInput(e, setNewGeofence)}
              placeholder="Radius (m)"
              className="p-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-500 font-semibold placeholder:text-gray-700"
              required
              type="number"
              step="any"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-2 rounded-lg font-semibold shadow"
          >
            + Add Geofence
          </button>
        </form>
        {loading ? (
          <div className="flex items-center gap-2 text-blue-600 font-semibold">
            <svg
              className="animate-spin w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              ></path>
            </svg>
            Loading geofences...
          </div>
        ) : geofences.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <svg
              className="w-10 h-10 mx-auto mb-2 text-blue-200"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 8v4l3 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            No geofences found. Add one above!
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="w-full border-collapse text-sm bg-white/90">
              <thead>
                <tr className="bg-blue-100 text-blue-900">
                  <th className="p-3 border-b font-semibold">Name</th>
                  <th className="p-3 border-b font-semibold">Latitude</th>
                  <th className="p-3 border-b font-semibold">Longitude</th>
                  <th className="p-3 border-b font-semibold">Radius (m)</th>
                  <th className="p-3 border-b font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {geofences.map((g, idx) => (
                  <tr
                    key={g.name}
                    className={`transition hover:bg-blue-50 ${
                      editIdx === idx ? "bg-yellow-50" : ""
                    }`}
                  >
                    {editIdx === idx ? (
                      <>
                        <td className="p-2 border-b align-middle">
                          <input
                            name="name"
                            value={editGeofence.name}
                            onChange={(e) => handleInput(e, setEditGeofence)}
                            className="p-1 border border-yellow-300 rounded w-full focus:outline-none focus:ring-2 text-gray-900 focus:ring-yellow-200 placeholder:text-gray-700"
                            required
                            placeholder="Name"
                          />
                        </td>
                        <td className="p-2 border-b align-middle">
                          <input
                            name="lat"
                            value={editGeofence.lat}
                            onChange={(e) => handleInput(e, setEditGeofence)}
                            className="p-1 border border-yellow-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-200 text-gray-900 placeholder:text-gray-700"
                            required
                            type="number"
                            step="any"
                            placeholder="Latitude"
                          />
                        </td>
                        <td className="p-2 border-b align-middle">
                          <input
                            name="lng"
                            value={editGeofence.lng}
                            onChange={(e) => handleInput(e, setEditGeofence)}
                            className="p-1 border border-yellow-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-200 text-gray-900  placeholder:text-gray-700"
                            required
                            type="number"
                            step="any"
                            placeholder="Longitude"
                          />
                        </td>
                        <td className="p-2 border-b align-middle">
                          <input
                            name="radius"
                            value={editGeofence.radius}
                            onChange={(e) => handleInput(e, setEditGeofence)}
                            className="p-1 border border-yellow-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-200 text-gray-900 placeholder:text-gray-700"
                            required
                            type="number"
                            step="any"
                            placeholder="Radius (m)"
                          />
                        </td>
                        <td className="p-2 border-b align-middle flex gap-2">
                          <button
                            onClick={handleUpdate}
                            className="bg-green-600 hover:bg-green-700 transition text-white px-3 py-1 rounded font-semibold shadow"
                          >
                            <span className="inline-flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Save
                            </span>
                          </button>
                          <button
                            onClick={() => setEditIdx(null)}
                            className="bg-gray-400 hover:bg-gray-500 transition text-white px-3 py-1 rounded font-semibold shadow"
                          >
                            <span className="inline-flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              Cancel
                            </span>
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 border-b align-middle font-medium text-gray-800">
                          {g.name}
                        </td>
                        <td className="p-2 border-b align-middle font-mono text-blue-700">
                          {g.lat}
                        </td>
                        <td className="p-2 border-b align-middle font-mono text-blue-700">
                          {g.lng}
                        </td>
                        <td className="p-2 border-b align-middle font-mono text-blue-700">
                          {g.radius}
                        </td>
                        <td className="p-2 border-b align-middle flex gap-2">
                          <button
                            onClick={() => handleEdit(idx)}
                            className="bg-yellow-400 hover:bg-yellow-500 transition text-white px-3 py-1 rounded font-semibold shadow"
                          >
                            <span className="inline-flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h6l12-12a2.828 2.828 0 00-4-4L5 17v4z"
                                />
                              </svg>
                              Edit
                            </span>
                          </button>
                          <button
                            onClick={() => handleDelete(g.name)}
                            className="bg-red-600 hover:bg-red-700 transition text-white px-3 py-1 rounded font-semibold shadow"
                          >
                            <span className="inline-flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              Delete
                            </span>
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

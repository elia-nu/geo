"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { format } from "date-fns";
import FaceDetectionBox from "./FaceDetectionBox";
import GeofenceMap from "./GeofenceMap";

export default function AttendancePage({ user, onLogout }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const webcamRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [geofences, setGeofences] = useState({});

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    return Math.sqrt(
      Math.pow((lat1 - lat2) * 111000, 2) +
        Math.pow((lng1 - lng2) * 111000 * Math.cos((lat2 * Math.PI) / 180), 2)
    );
  };
  // Add state for new geofence form
  const [newGeofence, setNewGeofence] = useState({
    name: "",
    lat: "",
    lng: "",
    radius: "",
  });
  const [addGeoMsg, setAddGeoMsg] = useState("");

  useEffect(() => {
    let intervalId;
    function fetchLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          () => setUserLocation(null)
        );
      }
    }
    fetchLocation();
    intervalId = setInterval(fetchLocation, 10000); // every 10 seconds
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (user) loadAttendanceRecords();
  }, [user]);

  useEffect(() => {
    // Fetch geofences from API
    const fetchGeofences = async () => {
      try {
        const response = await fetch("/api/geofences");
        const data = await response.json();
        // Convert array to object keyed by name for compatibility
        const geofenceObj = {};
        data.forEach((g) => {
          geofenceObj[g.name] = g;
        });
        setGeofences(geofenceObj);
      } catch (error) {
        console.error("Error loading geofences:", error);
      }
    };
    fetchGeofences();
  }, []);

  const loadAttendanceRecords = async () => {
    try {
      const response = await fetch("/api/attendance");
      const data = await response.json();
      setAttendanceRecords(data);
    } catch (error) {
      console.error("Error loading attendance records:", error);
    }
  };

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      return webcamRef.current.getScreenshot();
    }
    return null;
  }, [webcamRef]);

  const handleAttendance = async () => {
    if (!user) {
      showMessage("You must be logged in", "error");
      return;
    }

    setIsProcessing(true);
    setMessage("Processing...");

    try {
      // Get geolocation
      const getPosition = () =>
        new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser"));
          } else {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos.coords),
              (err) => reject(err)
            );
          }
        });
      let coords;
      try {
        coords = await getPosition();
      } catch (geoErr) {
        showMessage("Failed to get your location: " + geoErr.message, "error");
        return;
      }

      // Capture photo
      const photo = capturePhoto();
      if (!photo) {
        showMessage("Failed to capture photo", "error");
        return;
      }

      // Remove data URL prefix to get base64 data
      const imageData = photo.replace(/^data:image\/jpeg;base64,/, "");

      // Verify face
      const verifyResponse = await fetch("/api/face/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok) {
        showMessage(verifyResult.error || "Face verification failed", "error");
        return;
      }

      // Mark attendance
      const attendanceResponse = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user,
          faceId: verifyResult.faceId,
          timestamp: new Date().toISOString(),
          lat: coords.latitude,
          lng: coords.longitude,
        }),
      });

      const attendanceResult = await attendanceResponse.json();

      if (!attendanceResponse.ok) {
        showMessage(
          attendanceResult.error || "Failed to mark attendance",
          "error"
        );
        return;
      }

      showMessage("Attendance marked successfully!", "success");
      setIsCameraActive(false);
      loadAttendanceRecords(); // Refresh the list
    } catch (error) {
      console.error("Error marking attendance:", error);
      showMessage("An error occurred while processing attendance", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 5000);
  };

  const toggleCamera = () => {
    setIsCameraActive(!isCameraActive);
    setMessage("");
  };

  // Get geofence for logged-in user
  const geofence = user ? geofences[user] : null;

  if (!user) return null;
  if (!userLocation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white to-blue-50">
        <div className="bg-white/90 p-8 rounded-xl shadow text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            Location Required
          </h2>
          <p className="mb-4 text-gray-600">
            You must allow location access to use the attendance system. Please
            enable location in your browser and reload the page.
          </p>
          <div className="text-sm text-gray-400">
            (We use your location to verify you are within your allowed area for
            attendance.)
          </div>
          <div className="mt-4 text-blue-600 font-mono">
            Fetching your location...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex flex-col items-center px-2 py-6">
      {/* User info and logout */}

      {/* Show user location coordinates */}
      <div className="mb-2 text-center text-sm text-gray-700">
        <span className="font-semibold">Your Location:</span>{" "}
        <span className="font-mono">
          {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
        </span>
      </div>

      {/* Geofence Status Indicator */}
      {geofence && userLocation && (
        <div className="mb-4 text-center">
          {(() => {
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              geofence.lat,
              geofence.lng
            );
            const isInside = distance <= geofence.radius;
            return (
              <div
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  isInside
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full mr-2 ${
                    isInside ? "bg-green-400" : "bg-red-400"
                  }`}
                ></span>
                {isInside ? "Inside Geofence" : "Outside Geofence"}
                <span className="ml-1 text-xs opacity-75">
                  ({Math.round(distance)}m / {geofence.radius}m)
                </span>
              </div>
            );
          })()}
        </div>
      )}
      {/* Header */}
      <header className="w-full max-w-2xl mx-auto text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2">
          Attendance <span className="text-blue-600">FaceID</span>
        </h1>
        <p className="text-gray-500 text-base sm:text-lg mb-2">
          Minimal, modern, and secure facial recognition attendance
        </p>
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-yellow-50 text-yellow-700 border border-yellow-200">
          <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
          Demo Mode
        </div>
      </header>

      <main className="w-full max-w-4xl flex flex-col lg:flex-row gap-8">
        {/* Attendance Form Card */}
        <section className="flex-1 bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Mark Attendance
          </h2>
          {/* Geofence Map */}
          {(geofence || userLocation) && (
            <GeofenceMap
              center={
                geofence
                  ? { lat: geofence.lat, lng: geofence.lng }
                  : userLocation
              }
              radius={geofence ? geofence.radius : 0}
              userLocation={userLocation}
            />
          )}
          {/* Camera Toggle Button */}
          <button
            onClick={toggleCamera}
            disabled={isProcessing}
            className="w-full max-w-xs mb-4 py-2 rounded-lg bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isCameraActive ? "Close Camera" : "Open Camera"}
          </button>
          {/* Camera & Face Detection */}
          {isCameraActive && (
            <div className="w-full flex flex-col items-center mb-4">
              <div className="relative w-64 h-64 max-w-full mx-auto rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover rounded-2xl"
                />
                <FaceDetectionBox isDetecting={isFaceDetected} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Align your face within the circle
              </p>
            </div>
          )}
          {/* Mark Attendance Button */}
          <button
            onClick={handleAttendance}
            disabled={
              !isCameraActive ||
              isProcessing ||
              (geofence &&
                userLocation &&
                calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  geofence.lat,
                  geofence.lng
                ) > geofence.radius)
            }
            className="w-full max-w-xs py-2 rounded-lg bg-green-600 text-white font-medium shadow hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center"
          >
            {isProcessing ? (
              <span className="flex items-center">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Processing...
              </span>
            ) : (
              <span className="flex items-center">
                <FaCheckCircle className="mr-2" />
                Mark Attendance
              </span>
            )}
          </button>
          {/* Message Display */}
          {message && (
            <div
              className={`mt-4 w-full max-w-xs p-3 rounded-lg text-center text-sm font-medium border ${
                messageType === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {messageType === "success" ? (
                  <FaCheckCircle className="h-4 w-4" />
                ) : (
                  <FaTimesCircle className="h-4 w-4" />
                )}{" "}
                {message}
              </span>
            </div>
          )}
        </section>

        {/* Attendance List Card */}
        <section className="flex-1 bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Today's Attendance
            </h2>
            <button
              onClick={loadAttendanceRecords}
              className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-100 transition-colors"
            >
              Refresh
            </button>
          </div>
          {attendanceRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-8">
              {/* Clock icon was removed from imports, so this line is commented out */}
              {/* <Clock className="h-10 w-10 mb-2" /> */}
              <span>No records yet</span>
            </div>
          ) : (
            <ul className="flex-1 space-y-2 overflow-y-auto max-h-80 pr-1">
              {attendanceRecords
                .filter(
                  (record) =>
                    new Date(record.timestamp).toDateString() ===
                    new Date().toDateString()
                )
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map((record, index) => (
                  <li
                    key={
                      record._id ||
                      record.id ||
                      `${record.name}-${record.timestamp}-${index}`
                    }
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white/80 rounded-lg px-4 py-2 shadow-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800 truncate">
                        {record.name}
                      </span>
                      {record.lat !== undefined && record.lng !== undefined && (
                        <span className="text-xs text-gray-500 font-mono">
                          {record.lat.toFixed(6)}, {record.lng.toFixed(6)}
                        </span>
                      )}
                      {record.geofenceValidated && (
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              record.distanceFromCenter <= record.geofenceRadius
                                ? "bg-green-400"
                                : "bg-red-400"
                            }`}
                          ></span>
                          <span className="text-xs text-gray-500">
                            {record.distanceFromCenter}m /{" "}
                            {record.geofenceRadius}m
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {format(new Date(record.timestamp), "HH:mm:ss")}
                    </span>
                  </li>
                ))}
            </ul>
          )}
          {/* Summary */}
          <div className="mt-4 p-3 bg-blue-50/60 rounded-lg text-sm text-gray-700">
            <span className="font-semibold">Total today:</span>{" "}
            {
              attendanceRecords.filter(
                (record) =>
                  new Date(record.timestamp).toDateString() ===
                  new Date().toDateString()
              ).length
            }{" "}
            people
          </div>
        </section>
      </main>

      {/* Instructions - minimalist, collapsible on mobile */}
      <section className="w-full max-w-2xl mt-8">
        <details
          className="bg-white/70 backdrop-blur-md rounded-2xl shadow p-4 group"
          open
        >
          <summary className="text-base font-semibold text-gray-800 cursor-pointer outline-none select-none flex items-center gap-2">
            <span>How to use</span>
            <span className="ml-1 text-blue-500 group-open:rotate-90 transition-transform">
              ›
            </span>
          </summary>
          <ol className="mt-2 space-y-2 text-gray-600 text-sm list-decimal list-inside">
            <li>Login with your username and password</li>
            <li>Open the camera and align your face</li>
            <li>
              Click{" "}
              <span className="font-semibold text-green-700">
                Mark Attendance
              </span>
            </li>
          </ol>
        </details>
      </section>
    </div>
  );
}

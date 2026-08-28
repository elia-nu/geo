"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Send,
  Camera,
  MapPin,
  Timer,
  Loader2,
  FileText,
  Briefcase,
  History,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Award,
  RefreshCw,
  Eye,
  Info,
  Check,
  AlertTriangle,
  Lock,
  Sparkles,
} from "lucide-react";
import Webcam from "react-webcam";
import AttendancePhotoViewer from "./AttendancePhotoViewer";

export default function EmployeeOvertime({ employeeId, employeeName, workLocations = [] }) {
  const [activeTab, setActiveTab] = useState("station"); // 'station' | 'request' | 'requests' | 'history'
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Overtime requests state
  const [myRequests, setMyRequests] = useState([]);
  const [todayApprovedRequest, setTodayApprovedRequest] = useState(null);

  // Overtime attendance state
  const [todayOvertimeRecord, setTodayOvertimeRecord] = useState(null);
  const [overtimeHistory, setOvertimeHistory] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Form State for new Request
  const [requestForm, setRequestForm] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: "18:00",
    endTime: "21:00",
    requestedHours: 3,
    reason: "",
    project: "",
    notes: "",
  });

  // Camera & Geolocation for Attendance Station
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [locationValidation, setLocationValidation] = useState(null);
  const [stationNotes, setStationNotes] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  const webcamRef = useRef(null);

  // Timer interval for clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial load
  useEffect(() => {
    if (employeeId) {
      fetchMyRequests();
      fetchTodayOvertime();
      fetchOvertimeHistory();
      getCurrentLocation();
    }
  }, [employeeId]);

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 6000);
  };

  // Fetch Requests
  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/overtime/requests?employeeId=${employeeId}&limit=50`);
      const result = await res.json();
      if (result.success) {
        setMyRequests(result.data || []);
        const today = new Date().toISOString().split("T")[0];
        const approvedToday = (result.data || []).find(
          (r) => r.date === today && r.status === "approved"
        );
        setTodayApprovedRequest(approvedToday || null);
      }
    } catch (err) {
      console.error("Error fetching overtime requests:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Today's Overtime Attendance
  const fetchTodayOvertime = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/overtime/attendance?employeeId=${employeeId}&date=${today}`);
      const result = await res.json();
      if (result.success && result.data?.length > 0) {
        setTodayOvertimeRecord(result.data[0]);
      } else {
        setTodayOvertimeRecord(null);
      }
    } catch (err) {
      console.error("Error fetching today overtime attendance:", err);
    }
  };

  // Fetch Overtime Attendance History
  const fetchOvertimeHistory = async () => {
    try {
      const res = await fetch(`/api/overtime/attendance?employeeId=${employeeId}&limit=50`);
      const result = await res.json();
      if (result.success) {
        setOvertimeHistory(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching overtime history:", err);
    }
  };

  // Geolocation & Distance Calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const validateLocation = (currLocation) => {
    if (!workLocations || workLocations.length === 0) {
      setLocationValidation({
        isValid: true,
        message: "Location recorded (No specific geofence restrictions)",
        distance: 0,
        nearestLocation: { name: "Assigned Work Site", radius: 500 },
      });
      return true;
    }

    let nearestLocation = null;
    let shortestDistance = Infinity;
    let isValid = false;

    for (const wl of workLocations) {
      if (!wl.latitude || !wl.longitude) continue;
      const distance = calculateDistance(
        currLocation.latitude,
        currLocation.longitude,
        parseFloat(wl.latitude),
        parseFloat(wl.longitude)
      );
      const radius = parseFloat(wl.radius) || 100;
      if (distance <= radius) {
        isValid = true;
        nearestLocation = wl;
        shortestDistance = distance;
        break;
      }
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestLocation = wl;
      }
    }

    setLocationValidation({
      isValid,
      message: isValid
        ? `Location verified! You are ${Math.round(shortestDistance)}m from ${nearestLocation?.name || "Work Site"}.`
        : `You are ${Math.round(shortestDistance)}m from ${nearestLocation?.name || "Work Site"}. Must be within ${Math.round(nearestLocation?.radius || 100)}m.`,
      distance: Math.round(shortestDistance),
      nearestLocation,
    });
    return isValid;
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    setLocationError("Acquiring high-accuracy GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setLocation(coords);
        setLocationError("");
        validateLocation(coords);
      },
      (err) => {
        setLocationError(err.message || "Failed to get GPS location. Please allow location permissions.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  // Submit Overtime Request
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestForm.date || !requestForm.reason) {
      showMessage("Date and reason are required", "error");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/overtime/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          ...requestForm,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        showMessage("Overtime request submitted successfully! Awaiting admin approval.", "success");
        setRequestForm({
          date: new Date().toISOString().split("T")[0],
          startTime: "18:00",
          endTime: "21:00",
          requestedHours: 3,
          reason: "",
          project: "",
          notes: "",
        });
        fetchMyRequests();
        setActiveTab("requests");
      } else {
        showMessage(result.error || "Failed to submit request", "error");
      }
    } catch (err) {
      console.error(err);
      showMessage("Error submitting request", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 3-Point Validation State for Pre-flight Check
  const isTimeAuthorized = !!todayApprovedRequest;
  const isLocationVerified = !!location && !!locationValidation?.isValid;
  const isCameraVerified = isCameraActive && !cameraError;
  const allChecksPassed = isTimeAuthorized && isLocationVerified && isCameraVerified;

  // Handle Overtime Check-In / Check-Out
  const handleAttendanceAction = async (action) => {
    // 1. Time Check
    if (!todayApprovedRequest) {
      showMessage("Time Check Failed: No approved overtime request found for today. Please request overtime first.", "error");
      return;
    }

    // 2. Location Check
    if (!location) {
      showMessage("Location Check Failed: GPS coordinates required. Please enable location permissions.", "error");
      return;
    }

    if (!locationValidation || !locationValidation.isValid) {
      showMessage("Location Check Failed: You must be at your designated work location to clock in/out for overtime.", "error");
      return;
    }

    // 3. Camera Check
    if (!isCameraActive || !webcamRef.current) {
      setIsCameraActive(true);
      showMessage("Camera Check Failed: Live camera photo is required. Camera is now activating, please try again.", "error");
      return;
    }

    setActionLoading(true);
    try {
      let photoUrl = null;
      const photo = webcamRef.current.getScreenshot();
      if (photo) {
        const photoRes = await fetch("/api/attendance/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photo,
            employeeId,
            action: `overtime-${action}`,
            date: new Date().toISOString().split("T")[0],
          }),
        });
        const photoResult = await photoRes.json();
        if (photoRes.ok) {
          photoUrl = photoResult.data?.photoUrl;
        }
      }

      if (!photoUrl) {
        showMessage("Photo verification required. Please look at the camera to capture proof.", "error");
        setActionLoading(false);
        return;
      }

      const res = await fetch("/api/overtime/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          action,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          notes: stationNotes,
          photoUrl,
          requestId: todayApprovedRequest._id,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        showMessage(result.message || `Overtime ${action} recorded successfully!`, "success");
        setStationNotes("");
        fetchTodayOvertime();
        fetchOvertimeHistory();
      } else {
        showMessage(result.error || `Failed to record overtime ${action}`, "error");
      }
    } catch (err) {
      console.error(err);
      showMessage("Error processing attendance action", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate quick stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const totalWorkedHoursThisMonth = overtimeHistory
    .filter((a) => {
      const d = new Date(a.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, a) => sum + (parseFloat(a.durationHours) || 0), 0);

  const pendingRequestsCount = myRequests.filter((r) => r.status === "pending").length;
  const approvedRequestsCount = myRequests.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
              <Clock className="w-8 h-8 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Overtime Work Hub</h1>
                <span className="bg-amber-400/30 text-amber-100 text-xs px-2.5 py-0.5 rounded-full font-medium border border-amber-300/30">
                  Separately Tracked
                </span>
              </div>
              <p className="text-amber-100 text-sm mt-0.5">
                Request overtime, clock in/out with proof, and monitor your verified extra hours.
              </p>
            </div>
          </div>

          {/* Real-time Clock */}
          <div className="text-left md:text-right bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/15">
            <div className="text-2xl font-mono font-bold tracking-tight">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="text-amber-100 text-xs font-medium">
              {currentTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Quick KPI Cards inside Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-amber-500/40">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <span className="text-xs text-amber-200 block font-medium">Worked This Month</span>
            <span className="text-2xl font-bold text-white mt-0.5 block">
              {totalWorkedHoursThisMonth.toFixed(1)} <span className="text-sm font-normal text-amber-200">hrs</span>
            </span>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <span className="text-xs text-amber-200 block font-medium">Today's Status</span>
            <span className="text-sm font-bold text-white mt-1 block truncate">
              {todayOvertimeRecord?.status === "in-progress"
                ? "🟢 Working Overtime"
                : todayOvertimeRecord?.status === "completed"
                ? "✅ Completed Today"
                : todayApprovedRequest
                ? "🟡 Ready to Clock In"
                : "⚪ No Approved OT"}
            </span>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <span className="text-xs text-amber-200 block font-medium">Approved Requests</span>
            <span className="text-2xl font-bold text-white mt-0.5 block">{approvedRequestsCount}</span>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <span className="text-xs text-amber-200 block font-medium">Pending Requests</span>
            <span className="text-2xl font-bold text-white mt-0.5 block">{pendingRequestsCount}</span>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 transition-all ${
            messageType === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : messageType === "error"
              ? "bg-red-50 border border-red-200 text-red-800"
              : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600" />
          ) : messageType === "error" ? (
            <XCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-600" />
          )}
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-xl shadow-sm p-1.5 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("station")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "station"
              ? "bg-amber-600 text-white shadow-md"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Timer className="w-4 h-4" />
          Overtime Attendance Station
          {todayApprovedRequest && (
            <span className="ml-1 w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("request")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "request"
              ? "bg-amber-600 text-white shadow-md"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Plus className="w-4 h-4" />
          Request Overtime
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "requests"
              ? "bg-amber-600 text-white shadow-md"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          My Requests ({myRequests.length})
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "history"
              ? "bg-amber-600 text-white shadow-md"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <History className="w-4 h-4" />
          Overtime History & Proof ({overtimeHistory.length})
        </button>
      </div>

      {/* TAB 1: OVERTIME ATTENDANCE STATION */}
      {activeTab === "station" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main Action Station */}
          <div className="lg:col-span-2 space-y-6">
            {/* 3-Point Pre-check Verification Status Banner */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  Pre-Attendance Verification Requirements
                </h2>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${
                    allChecksPassed
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
                >
                  {allChecksPassed ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {allChecksPassed ? "All Checks Passed" : "Checks Incomplete"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Time Check */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    isTimeAuthorized
                      ? "bg-green-50/80 border-green-200 text-green-900"
                      : "bg-red-50/80 border-red-200 text-red-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> 1. Time Check
                    </span>
                    {isTimeAuthorized ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs font-semibold">
                    {isTimeAuthorized ? "Approved for Today" : "No Approved Overtime"}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {todayApprovedRequest
                      ? `${todayApprovedRequest.approvedHours || todayApprovedRequest.requestedHours} hrs quota (${todayApprovedRequest.startTime || "Any"} - ${todayApprovedRequest.endTime || "Any"})`
                      : "Submit request to authorize time"}
                  </p>
                </div>

                {/* 2. Location Check */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    isLocationVerified
                      ? "bg-green-50/80 border-green-200 text-green-900"
                      : "bg-red-50/80 border-red-200 text-red-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> 2. Location Check
                    </span>
                    {isLocationVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs font-semibold truncate">
                    {isLocationVerified
                      ? "Within Work Geofence"
                      : locationError
                      ? "GPS Unavailable"
                      : "Outside Work Radius"}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5 truncate">
                    {locationValidation?.nearestLocation?.name
                      ? `${locationValidation.distance}m from ${locationValidation.nearestLocation.name}`
                      : "Worksite distance validation"}
                  </p>
                </div>

                {/* 3. Camera Check */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCameraVerified
                      ? "bg-green-50/80 border-green-200 text-green-900"
                      : "bg-red-50/80 border-red-200 text-red-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Camera className="w-4 h-4" /> 3. Camera Check
                    </span>
                    {isCameraVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs font-semibold">
                    {isCameraVerified ? "Camera Feed Active" : "Camera Required"}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {isCameraVerified ? "Photo proof ready on action" : "Activate camera feed on right"}
                  </p>
                </div>
              </div>

              {!allChecksPassed && (
                <div className="text-xs bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Required to Check In / Check Out:</span>
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px]">
                      {!isTimeAuthorized && <li>An approved overtime request for today is required.</li>}
                      {!isLocationVerified && <li>You must be within your assigned workplace geofence coordinates.</li>}
                      {!isCameraVerified && <li>Your device camera must be enabled for facial photo verification.</li>}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Today's Overtime Live Record Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-600" />
                Active Overtime Session
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Clock className="w-4 h-4 text-green-600" /> Check-in Time
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {todayOvertimeRecord?.checkInTime
                      ? new Date(todayOvertimeRecord.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "--:--"}
                  </div>
                  {todayOvertimeRecord?.checkInPhoto && (
                    <button
                      onClick={() => {
                        setSelectedPhoto(todayOvertimeRecord.checkInPhoto);
                        setShowPhotoViewer(true);
                      }}
                      className="text-xs text-amber-600 hover:underline mt-1 inline-flex items-center gap-1 font-semibold"
                    >
                      <Camera className="w-3 h-3" /> View In Photo
                    </button>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Clock className="w-4 h-4 text-red-600" /> Check-out Time
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {todayOvertimeRecord?.checkOutTime
                      ? new Date(todayOvertimeRecord.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "--:--"}
                  </div>
                  {todayOvertimeRecord?.checkOutPhoto && (
                    <button
                      onClick={() => {
                        setSelectedPhoto(todayOvertimeRecord.checkOutPhoto);
                        setShowPhotoViewer(true);
                      }}
                      className="text-xs text-amber-600 hover:underline mt-1 inline-flex items-center gap-1 font-semibold"
                    >
                      <Camera className="w-3 h-3" /> View Out Photo
                    </button>
                  )}
                </div>

                <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold mb-1">
                    <Award className="w-4 h-4 text-amber-600" /> Total Duration
                  </div>
                  <div className="text-2xl font-extrabold text-amber-900">
                    {todayOvertimeRecord?.durationFormatted || (todayOvertimeRecord?.checkInTime && !todayOvertimeRecord?.checkOutTime ? "Counting..." : "0h 0m")}
                  </div>
                  {todayOvertimeRecord?.status === "in-progress" && (
                    <span className="text-xs text-green-600 font-semibold animate-pulse block mt-1">
                      ● Overtime session in progress
                    </span>
                  )}
                </div>
              </div>

              {/* Notes Input */}
              <div className="mt-5">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Overtime Session Notes (Optional):
                </label>
                <input
                  type="text"
                  value={stationNotes}
                  onChange={(e) => setStationNotes(e.target.value)}
                  placeholder="e.g. Completed critical server maintenance or client delivery"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Overtime Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                {/* Overtime Check-In Button */}
                <button
                  onClick={() => handleAttendanceAction("check-in")}
                  disabled={
                    actionLoading ||
                    !allChecksPassed ||
                    Boolean(todayOvertimeRecord?.checkInTime)
                  }
                  className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow transition-all ${
                    actionLoading ||
                    !allChecksPassed ||
                    Boolean(todayOvertimeRecord?.checkInTime)
                      ? "bg-gray-300 cursor-not-allowed text-gray-500 shadow-none"
                      : "bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-green-600/20"
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {todayOvertimeRecord?.checkInTime
                        ? "Overtime Already Checked In"
                        : !allChecksPassed
                        ? "Complete Checks to Check In"
                        : "Check In For Overtime"}
                    </>
                  )}
                </button>

                {/* Overtime Check-Out Button */}
                <button
                  onClick={() => handleAttendanceAction("check-out")}
                  disabled={
                    actionLoading ||
                    !todayOvertimeRecord?.checkInTime ||
                    Boolean(todayOvertimeRecord?.checkOutTime) ||
                    !isLocationVerified ||
                    !isCameraVerified
                  }
                  className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow transition-all ${
                    actionLoading ||
                    !todayOvertimeRecord?.checkInTime ||
                    Boolean(todayOvertimeRecord?.checkOutTime) ||
                    !isLocationVerified ||
                    !isCameraVerified
                      ? "bg-gray-300 cursor-not-allowed text-gray-500 shadow-none"
                      : "bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-600/20"
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      {todayOvertimeRecord?.checkOutTime
                        ? "Overtime Completed Today"
                        : !isLocationVerified || !isCameraVerified
                        ? "Verify Location & Camera to Check Out"
                        : "Check Out From Overtime"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Location & Camera Verification */}
          <div className="space-y-6">
            {/* Camera Verification Widget */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-600" />
                  Live Facial Camera Feed *
                </h3>
                <button
                  onClick={() => setIsCameraActive(!isCameraActive)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                    isCameraActive
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                  }`}
                >
                  {isCameraActive ? "Turn Off Camera" : "Enable Camera"}
                </button>
              </div>

              {isCameraActive ? (
                <div className="rounded-xl overflow-hidden bg-black p-1 space-y-1">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full rounded-lg object-cover"
                    onUserMediaError={(err) => setCameraError(err?.message || "Camera access denied")}
                    onUserMedia={() => setCameraError("")}
                    videoConstraints={{ width: 400, height: 300, facingMode: "user" }}
                  />
                  {cameraError ? (
                    <p className="text-xs text-center text-red-400 py-1 font-semibold">
                      {cameraError}
                    </p>
                  ) : (
                    <p className="text-[11px] text-center text-green-400 py-1 font-medium flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-ping inline-block"></span>
                      Camera active - Photo proof captures upon check in/out
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center space-y-2">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-xs font-semibold text-gray-700">Camera is currently inactive</p>
                  <p className="text-[11px] text-gray-500">
                    A real-time photo is required to verify identity before you can check in or check out.
                  </p>
                  <button
                    onClick={() => setIsCameraActive(true)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                  >
                    Open Live Camera
                  </button>
                </div>
              )}
            </div>

            {/* Location Verification Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  GPS Work Location Status *
                </h3>
                <button
                  onClick={getCurrentLocation}
                  className="text-xs text-amber-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh GPS
                </button>
              </div>

              {locationError ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                  <p className="font-semibold">{locationError}</p>
                  <button onClick={getCurrentLocation} className="underline font-bold">
                    Retry GPS Access
                  </button>
                </div>
              ) : locationValidation ? (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    locationValidation.isValid
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {locationValidation.isValid ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                    {locationValidation.isValid ? "Location Verified Inside Geofence" : "Outside Work Geofence Radius"}
                  </div>
                  <p>{locationValidation.message}</p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" /> Acquiring GPS coordinates...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REQUEST OVERTIME FORM */}
      {activeTab === "request" && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              Submit Overtime Request
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Provide the planned date, estimated hours, and justification. Once approved by the administrator, you can clock in for overtime.
            </p>
          </div>

          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Overtime Date *
              </label>
              <input
                type="date"
                required
                value={requestForm.date}
                onChange={(e) => setRequestForm({ ...requestForm, date: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Expected Start Time
                </label>
                <input
                  type="time"
                  value={requestForm.startTime}
                  onChange={(e) => setRequestForm({ ...requestForm, startTime: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Expected End Time
                </label>
                <input
                  type="time"
                  value={requestForm.endTime}
                  onChange={(e) => setRequestForm({ ...requestForm, endTime: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Estimated Overtime (Hours) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  required
                  value={requestForm.requestedHours}
                  onChange={(e) => setRequestForm({ ...requestForm, requestedHours: parseFloat(e.target.value) || 1 })}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Project / Department Activity
                </label>
                <input
                  type="text"
                  placeholder="e.g. ERP System Migration or Emergency Task"
                  value={requestForm.project}
                  onChange={(e) => setRequestForm({ ...requestForm, project: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Reason & Work Description *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Detailed reason and scope of work to be performed during overtime..."
                value={requestForm.reason}
                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Overtime Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: MY REQUESTS LIST */}
      {activeTab === "requests" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">My Overtime Requests</h2>
              <p className="text-xs text-gray-500">Track approvals and supervisor feedback</p>
            </div>
            <button
              onClick={fetchMyRequests}
              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium bg-gray-100 px-3 py-1.5 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {myRequests.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-sm">No overtime requests submitted yet.</p>
              <button
                onClick={() => setActiveTab("request")}
                className="mt-3 text-xs font-bold text-amber-600 hover:underline"
              >
                + Submit your first overtime request
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Time Window</th>
                    <th className="p-3.5">Requested / Approved</th>
                    <th className="p-3.5">Project / Reason</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Supervisor Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-gray-900 whitespace-nowrap">
                        {req.date}
                      </td>
                      <td className="p-3.5 text-gray-600 whitespace-nowrap">
                        {req.startTime && req.endTime ? `${req.startTime} - ${req.endTime}` : "Flexible"}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-semibold text-gray-800">{req.requestedHours} hrs</span>
                        {req.status === "approved" && (
                          <span className="ml-1.5 text-xs text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded">
                            Approved: {req.approvedHours || req.requestedHours} hrs
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 max-w-xs">
                        {req.project && (
                          <span className="block font-semibold text-gray-900 text-xs">{req.project}</span>
                        )}
                        <span className="text-gray-600 text-xs line-clamp-2">{req.reason}</span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {req.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : req.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5" /> Pending Review
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-gray-600 max-w-xs">
                        {req.supervisorNotes || "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: OVERTIME ATTENDANCE HISTORY & PROOF */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Overtime Attendance Sessions & Proof</h2>
              <p className="text-xs text-gray-500">Separately recorded overtime check-ins and hours worked</p>
            </div>
            <button
              onClick={fetchOvertimeHistory}
              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium bg-gray-100 px-3 py-1.5 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {overtimeHistory.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-sm">No overtime attendance records yet.</p>
              <p className="text-xs text-gray-400 mt-1">Once you clock in and out for an approved overtime, records appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Check-in</th>
                    <th className="p-3.5">Check-out</th>
                    <th className="p-3.5">Duration Worked</th>
                    <th className="p-3.5">Admin Review Status</th>
                    <th className="p-3.5">Verification & Photo</th>
                    <th className="p-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {overtimeHistory.map((rec) => (
                    <tr key={rec._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-gray-900 whitespace-nowrap">
                        {rec.date}
                      </td>
                      <td className="p-3.5 text-gray-800 whitespace-nowrap font-mono text-xs">
                        {rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                      </td>
                      <td className="p-3.5 text-gray-800 whitespace-nowrap font-mono text-xs">
                        {rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg text-xs border border-amber-200">
                          {rec.durationFormatted || `${rec.durationHours || 0} hrs`}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {rec.adminApprovalStatus === "approved" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                              <CheckCircle className="w-3.5 h-3.5" /> Approved
                            </span>
                            {rec.approvedAttendanceHours !== undefined && (
                              <span className="block text-[11px] text-gray-500 font-semibold mt-0.5">
                                {rec.approvedAttendanceHours} hrs credited
                              </span>
                            )}
                          </div>
                        ) : rec.adminApprovalStatus === "rejected" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                            {rec.adminNotes && (
                              <span className="block text-[11px] text-red-500 truncate max-w-xs mt-0.5" title={rec.adminNotes}>
                                {rec.adminNotes}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5" /> Pending Review
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {rec.checkInPhoto && (
                            <button
                              onClick={() => {
                                setSelectedPhoto(rec.checkInPhoto);
                                setShowPhotoViewer(true);
                              }}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 inline-flex items-center gap-1 font-medium"
                            >
                              <Camera className="w-3 h-3 text-amber-600" /> In Photo
                            </button>
                          )}
                          {rec.checkOutPhoto && (
                            <button
                              onClick={() => {
                                setSelectedPhoto(rec.checkOutPhoto);
                                setShowPhotoViewer(true);
                              }}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 inline-flex items-center gap-1 font-medium"
                            >
                              <Camera className="w-3 h-3 text-amber-600" /> Out Photo
                            </button>
                          )}
                          {rec.geofenceValidation?.isValid && (
                            <span className="text-[11px] text-green-700 font-semibold flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" /> Geofenced
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-xs text-gray-500 max-w-xs truncate">
                        {rec.checkInNotes || rec.checkOutNotes || rec.reason || "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Photo Viewer Modal */}
      {showPhotoViewer && selectedPhoto && (
        <AttendancePhotoViewer
          photoUrl={selectedPhoto}
          title="Overtime Attendance Photo Proof"
          onClose={() => {
            setShowPhotoViewer(false);
            setSelectedPhoto(null);
          }}
        />
      )}
    </div>
  );
}

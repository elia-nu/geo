"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  MapPin,
  Camera,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Timer,
  Loader2,
  AlertCircle,
  FileText,
  Navigation,
  Upload,
} from "lucide-react";
import Webcam from "react-webcam";
import AttendancePhotoViewer from "./AttendancePhotoViewer";

export default function DailyAttendance({
  employeeId,
  employeeName,
  workLocations,
  hideHeader = false, // New prop to control header visibility
  onAttendanceUpdate, // Callback to refresh parent component
}) {
  // State management
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [locationValidation, setLocationValidation] = useState(null);

  const [notes, setNotes] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const webcamRef = useRef(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance record on component mount
  useEffect(() => {
    fetchTodayAttendance();
    getCurrentLocation();
  }, [employeeId]);

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Validate location against work locations
  const validateLocation = (currentLocation) => {
    if (!workLocations || workLocations.length === 0) {
      setLocationValidation({
        isValid: false,
        message: "No work locations assigned. Please contact administrator.",
        distance: null,
        nearestLocation: null,
      });
      return false;
    }

    let nearestLocation = null;
    let shortestDistance = Infinity;
    let isValid = false;

    // Check distance to each work location
    for (const workLocation of workLocations) {
      if (!workLocation.latitude || !workLocation.longitude) continue;

      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        workLocation.latitude,
        workLocation.longitude
      );

      const radius = workLocation.radius || 100; // Default 100 meters

      if (distance <= radius) {
        isValid = true;
        nearestLocation = workLocation;
        shortestDistance = distance;
        break; // Found a valid location, no need to check others
      }

      // Keep track of the nearest location for error messages
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestLocation = workLocation;
      }
    }

    setLocationValidation({
      isValid,
      message: isValid
        ? `Location verified! You are ${Math.round(shortestDistance)}m from ${
            nearestLocation.name
          }.`
        : `You are ${Math.round(shortestDistance)}m from ${
            nearestLocation.name
          }. Must be within ${nearestLocation.radius || 100}m.`,
      distance: Math.round(shortestDistance),
      nearestLocation,
    });

    return isValid;
  };

  // Get current location with improved accuracy
  const getCurrentLocation = () => {
    console.log("getCurrentLocation called");

    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    // Show loading state
    setLocationError("Getting your location... Please wait.");

    const options = {
      enableHighAccuracy: true, // Request high accuracy
      timeout: 30000, // Increase timeout to 30 seconds
      maximumAge: 0, // Don't use cached location
    };

    console.log("Requesting location with options:", options);

    // Try to get multiple readings for better accuracy
    let readings = [];
    let attempts = 0;
    const maxAttempts = 3;

    const getLocationReading = () => {
      attempts++;
      console.log(`Location attempt ${attempts}/${maxAttempts}`);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log(`Location reading ${attempts} received:`, position);
          console.log("Accuracy:", position.coords.accuracy, "meters");

          readings.push({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });

          // If we have enough readings or good accuracy, process the result
          if (
            readings.length >= maxAttempts ||
            position.coords.accuracy <= 20
          ) {
            processLocationReadings();
          } else {
            // Get another reading after a short delay
            setTimeout(getLocationReading, 2000);
          }
        },
        (error) => {
          console.error(`Location error on attempt ${attempts}:`, error);

          if (attempts >= maxAttempts) {
            // If we've tried enough times, use whatever we have
            if (readings.length > 0) {
              processLocationReadings();
            } else {
              // No successful readings
              let errorMessage = "Unable to get your location. ";

              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage +=
                    "Please allow location access in your browser settings.";
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage +=
                    "Location information is unavailable. Please try again.";
                  break;
                case error.TIMEOUT:
                  errorMessage +=
                    "Location request timed out. Please try again.";
                  break;
                default:
                  errorMessage += error.message;
              }

              setLocationError(errorMessage);
              setLocationValidation({
                isValid: false,
                message: errorMessage,
                distance: null,
                nearestLocation: null,
              });
            }
          } else {
            // Try again
            setTimeout(getLocationReading, 2000);
          }
        },
        options
      );
    };

    const processLocationReadings = () => {
      console.log("Processing location readings:", readings);

      if (readings.length === 0) {
        setLocationError("No location readings obtained");
        return;
      }

      // Use the reading with the best accuracy, or average if similar
      const bestReading = readings.reduce((best, current) =>
        current.accuracy < best.accuracy ? current : best
      );

      console.log("Best reading:", bestReading);

      const currentLocation = {
        latitude: bestReading.latitude,
        longitude: bestReading.longitude,
        accuracy: bestReading.accuracy,
        timestamp: bestReading.timestamp,
        readingsCount: readings.length,
      };

      console.log("Final location:", currentLocation);
      console.log("Location accuracy:", currentLocation.accuracy, "meters");

      // Clear any previous location errors
      setLocationError("");

      setLocation(currentLocation);

      // Validate location
      validateLocation(currentLocation);
    };

    // Start the location reading process
    getLocationReading();
  };

  // Fetch today's attendance record
  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `/api/attendance/daily?employeeId=${employeeId}&date=${today}`
      );
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        setTodayRecord(result.data[0]);
      } else {
        setTodayRecord(null);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      showMessage("Failed to load today's attendance", "error");
    }
  };

  // Show message to user
  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  // Capture photo from webcam
  const capturePhoto = () => {
    if (webcamRef.current) {
      return webcamRef.current.getScreenshot();
    }
    return null;
  };

  // Handle attendance action (check-in or check-out)
  const handleAttendanceAction = async (action) => {
    if (!employeeId) {
      showMessage("Employee ID is required", "error");
      return;
    }

    // Check if location is available
    if (!location) {
      showMessage(
        "Location is required. Please enable location services.",
        "error"
      );
      return;
    }

    // Validate location against work locations
    if (!locationValidation?.isValid) {
      showMessage(
        "You must be at one of your designated work locations to check in/out.",
        "error"
      );
      return;
    }

    setLoading(true);
    setMessage("Processing...");

    try {
      // Refresh location
      await new Promise((resolve) => {
        getCurrentLocation();
        setTimeout(resolve, 1000); // Wait for location update
      });

      // Re-validate location after refresh
      if (!locationValidation?.isValid) {
        showMessage(
          "Location validation failed. Please ensure you are at one of your work locations.",
          "error"
        );
        setLoading(false);
        return;
      }

      // Capture and save photo if camera is active
      let photoUrl = null;
      if (isCameraActive) {
        const photo = capturePhoto();
        if (!photo) {
          showMessage("Failed to capture photo", "error");
          setLoading(false);
          return;
        }

        try {
          // Save photo to file system
          const formData = new FormData();
          formData.append("photo", photo);
          formData.append("employeeId", employeeId);
          formData.append("action", action);
          formData.append("date", new Date().toISOString().split("T")[0]);

          const photoResponse = await fetch("/api/attendance/photos", {
            method: "POST",
            body: formData,
          });

          const photoResult = await photoResponse.json();
          if (!photoResponse.ok) {
            showMessage("Failed to save photo", "error");
            setLoading(false);
            return;
          }

          photoUrl = photoResult.data.photoUrl;
        } catch (error) {
          console.error("Error saving photo:", error);
          showMessage("Failed to save photo", "error");
          setLoading(false);
          return;
        }
      }

      // Prepare attendance data
      const attendanceData = {
        employeeId,
        action,
        latitude: location?.latitude,
        longitude: location?.longitude,
        notes: notes.trim(),
        photoUrl,
        faceVerified: !!photoUrl, // Set to true if photo was saved
        workLocationId: locationValidation?.nearestLocation?._id, // Include the work location ID that was validated
      };

      console.log("Submitting attendance:", {
        action,
        location: location ? "available" : "unavailable",
        locationValid: locationValidation?.isValid,
        distance: locationValidation?.distance,
        workLocation: locationValidation?.nearestLocation?.name,
      });

      // Submit attendance
      const response = await fetch("/api/attendance/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attendanceData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.geofenceError) {
          showMessage(`Location Error: ${result.error}`, "error");
        } else {
          showMessage(result.error || "Failed to record attendance", "error");
        }
        return;
      }

      // Success
      showMessage(result.message, "success");
      setNotes(""); // Clear notes
      setIsCameraActive(false); // Close camera

      // Refresh today's record
      await fetchTodayAttendance();

      // Notify parent component to refresh
      if (onAttendanceUpdate) {
        onAttendanceUpdate();
      }
    } catch (error) {
      console.error("Error recording attendance:", error);
      showMessage("Failed to record attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  // Calculate working hours display
  const getWorkingHoursDisplay = () => {
    if (!todayRecord?.checkInTime) return "00:00";

    const checkInTime = new Date(todayRecord.checkInTime);
    const checkOutTime = todayRecord.checkOutTime
      ? new Date(todayRecord.checkOutTime)
      : currentTime;

    const diffMs = checkOutTime - checkInTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status display
  const getStatusDisplay = () => {
    if (!todayRecord)
      return {
        text: "Not Started",
        color: "text-gray-500",
        bgColor: "bg-gray-100",
      };
    if (todayRecord.checkOutTime)
      return {
        text: "Completed",
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    if (todayRecord.checkInTime)
      return {
        text: "Working",
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      };
    return {
      text: "Pending",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    };
  };

  const status = getStatusDisplay();

  return (
    <div
      className={`${
        hideHeader ? "space-y-6" : "max-w-4xl mx-auto p-6 space-y-6"
      }`}
    >
      {/* Header - Only show if not hidden */}
      {!hideHeader && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Daily Attendance</h1>
                <p className="text-blue-100">{employeeName}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="text-blue-100 text-sm">
                {currentTime.toLocaleDateString([], {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}
            >
              {status.text}
            </span>
            {location && (
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                <Navigation className="w-4 h-4" />
                <span>Location Available</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-2 ${
            messageType === "success"
              ? "bg-green-100 text-green-700"
              : messageType === "error"
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : messageType === "error" ? (
            <XCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Today's Summary */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span>Today's Summary</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Check-in Time */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-700">Check-in</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(todayRecord?.checkInTime)}
            </div>
            {todayRecord?.checkInLocation && (
              <div className="text-sm text-gray-500 flex items-center space-x-1 mt-1">
                <MapPin className="w-3 h-3" />
                <span>Location recorded</span>
              </div>
            )}
            {todayRecord?.checkInPhoto && (
              <div className="text-sm text-green-600 flex items-center space-x-1 mt-1">
                <Camera className="w-3 h-3" />
                <button
                  onClick={() => {
                    setSelectedPhoto(todayRecord.checkInPhoto);
                    setShowPhotoViewer(true);
                  }}
                  className="underline hover:text-green-700"
                >
                  View photo
                </button>
              </div>
            )}
          </div>

          {/* Check-out Time */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-red-600" />
              <span className="font-medium text-gray-700">Check-out</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(todayRecord?.checkOutTime)}
            </div>
            {todayRecord?.checkOutLocation && (
              <div className="text-sm text-gray-500 flex items-center space-x-1 mt-1">
                <MapPin className="w-3 h-3" />
                <span>Location recorded</span>
              </div>
            )}
            {todayRecord?.checkOutPhoto && (
              <div className="text-sm text-green-600 flex items-center space-x-1 mt-1">
                <Camera className="w-3 h-3" />
                <button
                  onClick={() => {
                    setSelectedPhoto(todayRecord.checkOutPhoto);
                    setShowPhotoViewer(true);
                  }}
                  className="underline hover:text-green-700"
                >
                  View photo
                </button>
              </div>
            )}
          </div>

          {/* Working Hours */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Timer className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-700">Working Hours</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {getWorkingHoursDisplay()}
            </div>
            {todayRecord?.checkInTime && !todayRecord?.checkOutTime && (
              <div className="text-sm text-green-600 mt-1">
                Currently working...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Location Status */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <span>Location Status</span>
        </h3>

        {locationError ? (
          <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-yellow-700 font-medium">
                Location Issue
              </span>
            </div>
            <p className="text-yellow-700 mt-1">{locationError}</p>
            <button
              onClick={getCurrentLocation}
              className="mt-2 text-yellow-700 underline hover:text-yellow-800"
            >
              Retry location access
            </button>
          </div>
        ) : locationValidation ? (
          <div
            className={`rounded-lg p-4 ${
              locationValidation.isValid
                ? "bg-green-100 border border-green-400"
                : "bg-red-100 border border-red-400"
            }`}
          >
            <div className="flex items-center space-x-2">
              {locationValidation.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span
                className={`font-medium ${
                  locationValidation.isValid ? "text-green-700" : "text-red-700"
                }`}
              >
                {locationValidation.isValid
                  ? "Location Verified"
                  : "Location Not Valid"}
              </span>
            </div>
            <p
              className={`mt-1 ${
                locationValidation.isValid ? "text-green-700" : "text-red-700"
              }`}
            >
              {locationValidation.message}
            </p>
            {locationValidation.distance && (
              <p
                className={`text-sm mt-1 ${
                  locationValidation.isValid ? "text-green-600" : "text-red-600"
                }`}
              >
                Distance: {locationValidation.distance}m
              </p>
            )}
            <div className="mt-2 space-y-2">
              <button
                onClick={() => {
                  console.log("Refresh location button clicked");
                  getCurrentLocation();
                }}
                className={`underline ${
                  locationValidation.isValid
                    ? "text-green-700 hover:text-green-800"
                    : "text-red-700 hover:text-red-800"
                }`}
              >
                Refresh location
              </button>

              <div className="text-xs text-gray-500">
                {location?.accuracy &&
                  `Accuracy: ${Math.round(location.accuracy)}m`}
                {location?.accuracy > 100 && " (Poor accuracy)"}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
              <span className="text-gray-700 font-medium">
                Getting location...
              </span>
            </div>
          </div>
        )}

        {/* Work Locations Info */}
        {workLocations && workLocations.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              Your Work Locations ({workLocations.length})
            </h4>
            <div className="space-y-2">
              {workLocations.map((location, index) => (
                <div key={location._id} className="text-sm">
                  <span className="text-blue-700 font-medium">
                    {index + 1}. {location.name}:
                  </span>
                  <span className="text-blue-900 ml-1">
                    {typeof location.radius === "number"
                      ? `${location.radius}m`
                      : String(location.radius || 100)}
                    m radius
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Camera Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <span>Photo Verification</span>
          </h3>
          <button
            onClick={() => setIsCameraActive(!isCameraActive)}
            className={`px-4 py-2 rounded-lg font-medium ${
              isCameraActive
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            {isCameraActive ? "Close Camera" : "Open Camera"}
          </button>
        </div>

        {isCameraActive && (
          <div className="bg-gray-100 rounded-lg p-4">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full max-w-md mx-auto rounded-lg"
              videoConstraints={{
                width: 640,
                height: 480,
                facingMode: "user",
              }}
            />
            <p className="text-sm text-gray-600 text-center mt-2">
              Position your face clearly within the frame
            </p>
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span>Notes (Optional)</span>
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about your attendance (e.g., late arrival reason, early departure request, etc.)"
          className="w-full p-3 border border-gray-300 rounded-lg resize-none text-gray-900 placeholder-gray-500"
          rows={3}
          maxLength={500}
        />
        <div className="text-sm text-gray-500 mt-1">
          {notes.length}/500 characters
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Check-in Button */}
          <button
            onClick={() => handleAttendanceAction("check-in")}
            disabled={
              loading ||
              (todayRecord && todayRecord.checkInTime) ||
              !isCameraActive ||
              !locationValidation?.isValid
            }
            className={`flex-1 py-4 px-6 rounded-lg font-semibold text-white flex items-center justify-center space-x-2 ${
              (todayRecord && todayRecord.checkInTime) ||
              !isCameraActive ||
              !locationValidation?.isValid
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 active:bg-green-800"
            }`}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>
                  {todayRecord && todayRecord.checkInTime
                    ? "Already Checked In"
                    : !isCameraActive
                    ? "Enable Camera First"
                    : !locationValidation?.isValid
                    ? "Location Not Valid"
                    : "Check In"}
                </span>
              </>
            )}
          </button>

          {/* Check-out Button */}
          <button
            onClick={() => handleAttendanceAction("check-out")}
            disabled={
              loading ||
              !todayRecord?.checkInTime ||
              todayRecord?.checkOutTime ||
              !isCameraActive ||
              !locationValidation?.isValid
            }
            className={`flex-1 py-4 px-6 rounded-lg font-semibold text-white flex items-center justify-center space-x-2 ${
              !todayRecord?.checkInTime ||
              !isCameraActive ||
              !locationValidation?.isValid
                ? "bg-gray-400 cursor-not-allowed"
                : todayRecord?.checkOutTime
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 active:bg-red-800"
            }`}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                <span>
                  {!todayRecord?.checkInTime
                    ? "Check In First"
                    : !isCameraActive
                    ? "Enable Camera First"
                    : !locationValidation?.isValid
                    ? "Location Not Valid"
                    : todayRecord?.checkOutTime
                    ? "Already Checked Out"
                    : "Check Out"}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          {!todayRecord?.checkInTime &&
            !isCameraActive &&
            "Enable camera and start your workday by checking in"}
          {!todayRecord?.checkInTime &&
            isCameraActive &&
            !locationValidation?.isValid &&
            "Move to your work location to check in"}
          {!todayRecord?.checkInTime &&
            isCameraActive &&
            locationValidation?.isValid &&
            "Start your workday by checking in"}
          {todayRecord?.checkInTime &&
            !todayRecord?.checkOutTime &&
            !isCameraActive &&
            "Enable camera to check out when you're done"}
          {todayRecord?.checkInTime &&
            !todayRecord?.checkOutTime &&
            isCameraActive &&
            !locationValidation?.isValid &&
            "Move to your work location to check out"}
          {todayRecord?.checkInTime &&
            !todayRecord?.checkOutTime &&
            isCameraActive &&
            locationValidation?.isValid &&
            "Don't forget to check out when you're done"}
          {todayRecord?.checkOutTime &&
            "Your workday is complete. Have a great day!"}
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {showPhotoViewer && selectedPhoto && (
        <AttendancePhotoViewer
          photoUrl={selectedPhoto}
          title={
            todayRecord?.checkInPhoto === selectedPhoto
              ? "Check-in"
              : "Check-out"
          }
          onClose={() => {
            setShowPhotoViewer(false);
            setSelectedPhoto(null);
          }}
        />
      )}
    </div>
  );
}

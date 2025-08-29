"use client";

import React, { useState, useEffect } from "react";
import EmployeeSidebar from "../components/EmployeeSidebar";
import EmployeeDashboard from "../components/EmployeeDashboard";
import DailyAttendance from "../components/DailyAttendance";
import EmployeeAttendanceHistory from "../components/EmployeeAttendanceHistory";
import EmployeeLeaveRequest from "../components/EmployeeLeaveRequest";
import LeaveBalance from "../components/LeaveBalance";
import AttendanceDocuments from "../components/AttendanceDocuments";
import EmployeeRequestStatus from "../components/EmployeeRequestStatus";
import { MapPin, Navigation, CheckCircle, AlertCircle } from "lucide-react";

export default function EmployeePortal() {
  const [employeeData, setEmployeeData] = useState(null);
  const [workLocations, setWorkLocations] = useState([]);
  const [activeSection, setActiveSection] = useState("dashboard");

  // Check for URL parameters to set initial section
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const section = urlParams.get("section");
      if (section) {
        setActiveSection(section);
      }
    }
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem("employeeToken");
      const storedData = localStorage.getItem("employeeData");

      if (!token || !storedData) {
        window.location.href = "/employee-login";
        return;
      }

      const employee = JSON.parse(storedData);
      console.log("Employee data from localStorage:", employee);

      // Fetch fresh employee data from the database to get latest work locations
      const employeeId = employee._id || employee.id;
      console.log("Employee ID to fetch:", employeeId);
      console.log("Employee has workLocations:", employee.workLocations);

      if (!employeeId) {
        setError("Invalid employee data. Please login again.");
        return;
      }

      // Set initial employee data
      setEmployeeData(employee);

      // If employee already has workLocations from localStorage, use them initially
      if (employee.workLocations && employee.workLocations.length > 0) {
        console.log(
          "Using workLocations from localStorage initially:",
          employee.workLocations
        );
        // For now, just set the IDs - we'll fetch full location details
        setWorkLocations([]);
        await fetchWorkLocationsForEmployee(employee);
      }

      // Always fetch fresh data from database to ensure we have the latest
      await fetchLatestEmployeeData(employeeId);

      setLoading(false);
    } catch (error) {
      console.error("Authentication error:", error);
      setError("Authentication failed. Please login again.");
      setLoading(false);
    }
  };

  const fetchLatestEmployeeData = async (employeeId) => {
    try {
      console.log("Fetching latest employee data for:", employeeId);

      // Fetch the latest employee data from the database
      const response = await fetch(`/api/employee/${employeeId}`);
      const result = await response.json();

      if (result.success && result.employee) {
        const latestEmployee = result.employee;
        console.log("Latest employee data:", latestEmployee);

        // Update employee data
        setEmployeeData(latestEmployee);

        // Update localStorage with fresh data
        localStorage.setItem("employeeData", JSON.stringify(latestEmployee));

        // Fetch work locations for the employee
        await fetchWorkLocationsForEmployee(latestEmployee);
      } else {
        console.error("Failed to fetch employee data:", result.error);
        setError("Failed to load employee data. Please login again.");
      }
    } catch (error) {
      console.error("Error fetching latest employee data:", error);
      setError("Failed to load employee data. Please login again.");
    }
  };

  const fetchWorkLocationsForEmployee = async (employee) => {
    try {
      console.log("Fetching work locations for employee:", employee);

      // Check for work locations in different possible formats
      let locationIds = [];

      // New format: workLocations array
      if (employee.workLocations && Array.isArray(employee.workLocations)) {
        locationIds = employee.workLocations;
        console.log("Found workLocations array:", locationIds);
      }
      // Old format: single workLocation object
      else if (employee.workLocation && employee.workLocation._id) {
        locationIds = [employee.workLocation._id];
        console.log("Found single workLocation:", locationIds);
      }
      // Check in personalDetails
      else if (
        employee.personalDetails?.workLocation &&
        employee.personalDetails.workLocation._id
      ) {
        locationIds = [employee.personalDetails.workLocation._id];
        console.log("Found workLocation in personalDetails:", locationIds);
      }

      if (locationIds.length === 0) {
        console.log("No work locations found for employee");
        setWorkLocations([]);
        return;
      }

      console.log("Employee location IDs to match:", locationIds);
      console.log(
        "Location IDs types:",
        locationIds.map((id) => typeof id)
      );

      // Fetch all work locations
      console.log("Fetching work locations from API...");
      const response = await fetch("/api/work-locations");
      const result = await response.json();

      console.log("Work locations API response:", result);

      if (
        result.success &&
        result.locations &&
        Array.isArray(result.locations)
      ) {
        console.log("All work locations:", result.locations);

        // Filter locations that belong to this employee
        // Convert both locationIds and location._id to strings for comparison
        const employeeLocations = result.locations.filter((location) => {
          const locationIdStr = location._id.toString();
          const hasMatch = locationIds.some(
            (id) => id.toString() === locationIdStr
          );
          console.log(
            `Checking location ${location.name} (${locationIdStr}) against employee locations:`,
            locationIds,
            "Match:",
            hasMatch
          );
          return hasMatch;
        });

        console.log("Employee's work locations:", employeeLocations);
        setWorkLocations(employeeLocations);
      } else {
        console.error(
          "Failed to fetch work locations or invalid response:",
          result
        );
        console.error("Response locations type:", typeof result.locations);
        console.error("Response locations:", result.locations);
        setWorkLocations([]);
      }
    } catch (error) {
      console.error("Error fetching work locations:", error);
      setWorkLocations([]);
    }
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  const renderActiveSection = () => {
    if (!employeeData) return null;

    switch (activeSection) {
      case "dashboard":
        return (
          <EmployeeDashboard
            employeeId={employeeData._id}
            employeeName={employeeData.name}
          />
        );
      case "attendance":
        return (
          <EnhancedDailyAttendance
            employeeId={employeeData._id}
            employeeName={employeeData.name}
            employeeData={employeeData}
            workLocations={workLocations}
          />
        );
      case "attendance-history":
        return (
          <EmployeeAttendanceHistory
            employeeId={employeeData._id}
            employeeName={employeeData.name}
          />
        );
      case "leave-requests":
        return (
          <EmployeeLeaveRequest
            employeeId={employeeData._id}
            employeeName={employeeData.name}
          />
        );
      case "leave-balance":
        return (
          <LeaveBalance
            employeeId={employeeData._id}
            employeeName={employeeData.name}
          />
        );
      case "documents":
        return (
          <AttendanceDocuments
            employeeId={employeeData._id}
            employeeName={employeeData.name}
          />
        );
      case "requests-status":
        return (
          <EmployeeRequestStatus
            employeeId={employeeData._id}
            employeeName={employeeData.name}
          />
        );
      case "profile":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                My Profile
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Personal Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        Name:
                      </span>
                      <p className="text-gray-900">{employeeData.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        Email:
                      </span>
                      <p className="text-gray-900">{employeeData.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        Employee ID:
                      </span>
                      <p className="text-gray-900">{employeeData.employeeId}</p>
                    </div>
                    {employeeData.department && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Department:
                        </span>
                        <p className="text-gray-900">
                          {employeeData.department}
                        </p>
                      </div>
                    )}
                    {employeeData.designation && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Designation:
                        </span>
                        <p className="text-gray-900">
                          {employeeData.designation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Work Locations ({workLocations.length})
                  </h3>
                  {workLocations.length > 0 ? (
                    <div className="space-y-3">
                      {workLocations.map((location, index) => (
                        <div
                          key={location._id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="font-medium text-gray-900">
                            {location.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {location.address || "No address specified"}
                          </div>
                          <div className="text-sm text-gray-500">
                            Radius: {location.radius || 100}m
                          </div>
                          {location.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {location.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-2">
                        No work locations assigned
                      </p>
                      <p className="text-xs text-gray-400">
                        Contact your administrator to assign work locations
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Select a section from the sidebar</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = "/employee-login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Employee Sidebar */}
      <EmployeeSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        employeeName={employeeData.name}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">{renderActiveSection()}</div>
      </div>
    </div>
  );
}

// Enhanced Daily Attendance Component with comprehensive features
function EnhancedDailyAttendance({
  employeeId,
  employeeName,
  employeeData,
  workLocations,
}) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState(null);

  // Debug logging
  console.log("EnhancedDailyAttendance props:", {
    employeeId,
    employeeName,
    employeeData,
    workLocations,
    workLocationsLength: workLocations?.length || 0,
  });

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance record
  useEffect(() => {
    fetchTodayAttendance();
  }, [employeeId]);

  useEffect(() => {
    if (showMap && !currentLocation) {
      getCurrentLocation();
    }
  }, [showMap]);

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
    }
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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000, // 5 minutes cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCurrentLocation(location);
        setLocationLoading(false);
      },
      (error) => {
        console.error("Location error:", error);
        setLocationLoading(false);
      },
      options
    );
  };

  const status = getStatusDisplay();

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Real-time Features */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Daily Attendance Portal</h1>
              <p className="text-blue-100">Welcome, {employeeName}</p>
            </div>
          </div>

          {/* Real-time Clock and Date */}
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

        {/* Status and Location Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Work Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}
            >
              {status.text}
            </span>

            {/* Location Available Badge */}
            {workLocations.length > 0 && (
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                <Navigation className="w-4 h-4" />
                <span>Location Available</span>
              </span>
            )}
          </div>

          {/* Employee Info */}
          <div className="text-right text-sm">
            <div className="text-blue-100">ID: {employeeData.employeeId}</div>
            <div className="text-blue-100">
              {employeeData.department || "No Department"}
            </div>
          </div>
        </div>
      </div>

      {/* Work Locations Information */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-green-600" />
            <span>Your Work Locations ({workLocations.length})</span>
          </h2>
          <button
            onClick={() => setShowMap(!showMap)}
            disabled={workLocations.length === 0}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 font-medium transition-colors ${
              workLocations.length === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>{showMap ? "Hide Map" : "Show Interactive Map"}</span>
          </button>
        </div>

        {/* Interactive Map Section */}
        {showMap && workLocations.length > 0 && (
          <div className="mb-6">
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                <span>Live Location Map</span>
              </h3>
              <div className="text-sm text-gray-700 mb-4 space-y-1">
                <p>
                  •{" "}
                  <span className="text-blue-600 font-medium">
                    Blue pulsing dot
                  </span>{" "}
                  = Your current location
                </p>
                <p>
                  •{" "}
                  <span className="text-green-600 font-medium">
                    Green circles
                  </span>{" "}
                  = Work locations where you're within range
                </p>
                <p>
                  •{" "}
                  <span className="text-red-600 font-medium">Red circles</span>{" "}
                  = Work locations where you're outside range
                </p>
                <p>
                  • Switch between <strong>Satellite</strong> and{" "}
                  <strong>Street</strong> views using the layer control
                </p>
              </div>

              {/* Map Container */}
              <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden">
                {currentLocation ? (
                  <LocationMap
                    currentLocation={currentLocation}
                    workLocations={workLocations}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      {locationLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-gray-600">
                            Getting your location...
                          </p>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 mb-2">
                            Location access required
                          </p>
                          <button
                            onClick={getCurrentLocation}
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            Enable Location Access
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Work Locations List */}
        {workLocations.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Work Locations Assigned
            </h3>
            <p className="text-gray-600 mb-4">
              Please contact your administrator to assign work locations for
              attendance tracking.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-800 font-medium">
                  Action Required
                </span>
              </div>
              <p className="text-yellow-700 mt-1 text-sm">
                You cannot check in/out without assigned work locations.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {workLocations.map((location, index) => (
              <div
                key={location._id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {location.name}
                  </h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Location {index + 1}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1 font-medium">📍 Address</p>
                    <p className="text-gray-900">
                      {location.address || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1 font-medium">
                      🌍 Coordinates
                    </p>
                    <p className="text-gray-900 font-mono text-xs">
                      {location.latitude && location.longitude
                        ? `${
                            typeof location.latitude === "number"
                              ? location.latitude.toFixed(6)
                              : String(location.latitude || "N/A")
                          }, ${
                            typeof location.longitude === "number"
                              ? location.longitude.toFixed(6)
                              : String(location.longitude || "N/A")
                          }`
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1 font-medium">
                      📏 Check-in Radius
                    </p>
                    <p className="text-gray-900">
                      {location.radius
                        ? `${
                            typeof location.radius === "number"
                              ? location.radius
                              : String(location.radius || "N/A")
                          } meters`
                        : "Not specified"}
                    </p>
                  </div>
                  {location.description && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <p className="text-gray-600 mb-1 font-medium">
                        📝 Description
                      </p>
                      <p className="text-gray-900">{location.description}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Information Note */}
        {workLocations.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-medium mb-1">
                  Attendance Guidelines
                </p>
                <p className="text-sm text-blue-700">
                  You can check in/out when you are within any of your
                  designated work location radii. The system will automatically
                  detect your location and verify your proximity to assigned
                  locations.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Daily Attendance Component */}
      {workLocations.length > 0 && (
        <DailyAttendance
          employeeId={employeeId}
          employeeName={employeeName}
          workLocations={workLocations}
          hideHeader={true}
          onAttendanceUpdate={fetchTodayAttendance}
        />
      )}
    </div>
  );
}

// Enhanced Map Component using Leaflet (Free alternative with satellite imagery)
function LocationMap({ currentLocation, workLocations }) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);

  // Filter out locations without coordinates
  const validWorkLocations = workLocations.filter(
    (loc) =>
      loc.latitude &&
      loc.longitude &&
      !isNaN(parseFloat(loc.latitude)) &&
      !isNaN(parseFloat(loc.longitude))
  );

  // If no valid locations, show message
  if (validWorkLocations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center p-4">
          <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            No Work Locations with Coordinates
          </p>
          <p className="text-sm text-gray-500">
            Your work locations need latitude and longitude coordinates to
            display on the map.
          </p>
        </div>
      </div>
    );
  }

  // If no current location, show work locations only
  if (!currentLocation) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center p-4">
          <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Location Access Required</p>
          <p className="text-sm text-gray-500">
            Please allow location access to see your position relative to work
            locations.
          </p>
        </div>
      </div>
    );
  }

  // Load Leaflet CSS and JS (Free alternative to Google Maps)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load Leaflet CSS
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      cssLink.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      cssLink.crossOrigin = "";
      document.head.appendChild(cssLink);

      // Load Leaflet JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "";
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);

      return () => {
        try {
          document.head.removeChild(cssLink);
          document.head.removeChild(script);
        } catch (e) {
          // Elements might already be removed
        }
      };
    }
  }, []);

  // Initialize map when Leaflet is loaded
  useEffect(() => {
    if (mapLoaded && currentLocation && validWorkLocations.length > 0 && !map) {
      initializeMap();
    }
  }, [mapLoaded, currentLocation, validWorkLocations, map]);

  const initializeMap = () => {
    if (typeof window === "undefined" || !window.L) return;

    const mapElement = document.getElementById("leaflet-map-portal");
    if (!mapElement) return;

    // Calculate center point
    const allLatitudes = [
      currentLocation.latitude,
      ...validWorkLocations.map((loc) => parseFloat(loc.latitude)),
    ];
    const allLongitudes = [
      currentLocation.longitude,
      ...validWorkLocations.map((loc) => parseFloat(loc.longitude)),
    ];

    const centerLat =
      allLatitudes.reduce((a, b) => a + b) / allLatitudes.length;
    const centerLng =
      allLongitudes.reduce((a, b) => a + b) / allLongitudes.length;

    // Create Leaflet Map with satellite imagery
    const leafletMap = window.L.map("leaflet-map-portal").setView(
      [centerLat, centerLng],
      16
    );

    // Add multiple tile layers for better coverage
    const osmLayer = window.L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }
    );

    // Alternative satellite-like imagery (Esri World Imagery)
    const satelliteLayer = window.L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "© Esri, Maxar, Earthstar Geographics",
      }
    );

    // Add default layer (satellite)
    satelliteLayer.addTo(leafletMap);

    // Add layer control
    const baseLayers = {
      Satellite: satelliteLayer,
      "Street Map": osmLayer,
    };
    window.L.control.layers(baseLayers).addTo(leafletMap);

    // Add CSS for pulsing animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 2px 6px rgba(59, 130, 246, 0.5), 0 0 0 0 rgba(59, 130, 246, 0.7); }
        70% { box-shadow: 0 2px 6px rgba(59, 130, 246, 0.5), 0 0 0 10px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 2px 6px rgba(59, 130, 246, 0.5), 0 0 0 0 rgba(59, 130, 246, 0); }
      }
    `;
    document.head.appendChild(style);

    // Add current location marker with custom icon
    const currentLocationMarker = window.L.marker(
      [currentLocation.latitude, currentLocation.longitude],
      {
        icon: window.L.divIcon({
          className: "current-location-marker",
          html: '<div style="background: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.5); animation: pulse 2s infinite;"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      }
    ).addTo(leafletMap);

    currentLocationMarker
      .bindPopup("📍 <b>Your Current Location</b>", {
        closeButton: false,
        autoClose: false,
      })
      .openPopup();

    // Add work location markers and circles
    validWorkLocations.forEach((location, index) => {
      const lat = parseFloat(location.latitude);
      const lng = parseFloat(location.longitude);
      const radius = location.radius || 100;

      // Calculate distance to current location
      const distance = leafletMap.distance(
        [currentLocation.latitude, currentLocation.longitude],
        [lat, lng]
      );
      const isWithinRadius = distance <= radius;
      const circleColor = isWithinRadius ? "#10B981" : "#EF4444";

      // Add circle with enhanced styling
      window.L.circle([lat, lng], {
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.15,
        weight: 2,
        opacity: 0.8,
        radius: radius,
      }).addTo(leafletMap);

      // Add marker with enhanced icon
      const workLocationMarker = window.L.marker([lat, lng], {
        icon: window.L.divIcon({
          className: "work-location-marker",
          html: `<div style="background: ${circleColor}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(leafletMap);

      // Enhanced popup with emoji and styling
      const statusEmoji = isWithinRadius ? "✅" : "❌";
      const statusText = isWithinRadius ? "Within range" : "Outside range";

      workLocationMarker.bindPopup(
        `
        <div style="text-align: center; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">
            🏢 ${location.name}
          </h3>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px;">
            📍 ${location.address || "No address specified"}
          </p>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">
            📏 Radius: ${radius}m
          </p>
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: ${circleColor};">
            ${statusEmoji} Distance: ${Math.round(distance)}m<br/>
            <span style="font-size: 12px;">${statusText}</span>
          </p>
        </div>
      `,
        {
          maxWidth: 250,
        }
      );
    });

    // Fit map to show all markers with padding
    const group = new window.L.featureGroup([
      currentLocationMarker,
      ...validWorkLocations.map((location) =>
        window.L.marker([
          parseFloat(location.latitude),
          parseFloat(location.longitude),
        ])
      ),
    ]);
    leafletMap.fitBounds(group.getBounds().pad(0.05));

    setMap(leafletMap);
  };

  if (!mapLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">Loading interactive map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white rounded-lg overflow-hidden relative">
      <div
        id="leaflet-map-portal"
        className="w-full h-full"
        style={{ minHeight: "400px" }}
      ></div>
    </div>
  );
}

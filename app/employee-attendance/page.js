"use client";

import { useState, useEffect } from "react";
import DailyAttendance from "../components/DailyAttendance";
import {
  User,
  LogOut,
  AlertCircle,
  CheckCircle,
  MapPin,
  Navigation,
} from "lucide-react";

export default function EmployeeAttendancePage() {
  const [employeeData, setEmployeeData] = useState(null);
  const [workLocations, setWorkLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (employeeData?.id) {
      fetchEmployeeWorkLocations();
    }
  }, [employeeData]);

  useEffect(() => {
    if (showMap) {
      getCurrentLocation();
    }
  }, [showMap]);

  const checkAuthentication = () => {
    const token = localStorage.getItem("employeeToken");
    const employeeDataStr = localStorage.getItem("employeeData");

    if (!token || !employeeDataStr) {
      setError("Please login to access this page");
      setLoading(false);
      return;
    }

    try {
      const employee = JSON.parse(employeeDataStr);
      setEmployeeData(employee);
    } catch (error) {
      setError("Invalid session data");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeWorkLocations = async () => {
    if (!employeeData?.id) return;

    try {
      const response = await fetch(
        `/api/employee/${employeeData.id}/work-location`
      );
      const result = await response.json();

      if (result.success && result.workLocations) {
        setWorkLocations(result.workLocations);
      } else {
        setWorkLocations([]);
      }
    } catch (error) {
      console.error("Error fetching employee work locations:", error);
      setWorkLocations([]);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by your browser");
      return;
    }

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
      },
      (error) => {
        console.error("Location error:", error);
      },
      options
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("employeeToken");
    localStorage.removeItem("employeeData");
    window.location.href = "/employee-login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !employeeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "Please login to continue"}
          </p>
          <button
            onClick={() => (window.location.href = "/employee-login")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Employee Attendance Portal
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome, {employeeData.name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Employee Info */}
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  {employeeData.employeeId}
                </p>
                <p className="text-xs text-gray-500">
                  {employeeData.department}
                </p>
              </div>

              {/* Location Status */}
              <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  {workLocations.length > 0
                    ? `${workLocations.length} Location${
                        workLocations.length !== 1 ? "s" : ""
                      } Assigned`
                    : "No Locations Assigned"}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:block">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-6">
          {/* Location Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-green-600" />
                <span>Your Work Locations ({workLocations.length})</span>
              </h2>
              <button
                onClick={() => setShowMap(!showMap)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Navigation className="w-4 h-4" />
                <span>{showMap ? "Hide Map" : "Show Map"}</span>
              </button>
            </div>

            {/* Map Section */}
            {showMap && (
              <div className="mb-6">
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <h3 className="text-md font-semibold mb-3 flex items-center space-x-2">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    <span>Interactive Map</span>
                  </h3>
                  <div className="text-sm text-gray-600 mb-4">
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
                      <span className="text-red-600 font-medium">
                        Red circles
                      </span>{" "}
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
                          <Navigation className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">
                            Getting your location...
                          </p>
                          <button
                            onClick={getCurrentLocation}
                            className="mt-2 text-blue-600 hover:text-blue-800 underline"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {workLocations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">
                  No Work Locations Assigned
                </p>
                <p className="text-sm">
                  Please contact your administrator to assign work locations.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {workLocations.map((location, index) => (
                  <div
                    key={location._id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">
                        {location.name}
                      </h3>
                      <span className="text-sm text-gray-500">
                        Location {index + 1}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">Address</p>
                        <p className="font-medium text-gray-900">
                          {location.address || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Coordinates</p>
                        <p className="font-medium text-gray-900">
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
                        <p className="text-gray-600 mb-1">Radius</p>
                        <p className="font-medium text-gray-900">
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
                        <div>
                          <p className="text-gray-600 mb-1">Description</p>
                          <p className="font-medium text-gray-900">
                            {location.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> You can check in/out when you are within
                any of your designated work location radii.
              </p>
            </div>
          </div>

          {/* Daily Attendance Component */}
          {workLocations.length > 0 && (
            <DailyAttendance
              employeeId={employeeData.id}
              employeeName={employeeData.name}
              workLocations={workLocations}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Enhanced Map Component using Leaflet (Free alternative with satellite imagery)
function LocationMap({ currentLocation, workLocations }) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);

  // Debug logging
  console.log("LocationMap props:", { currentLocation, workLocations });

  // Filter out locations without coordinates
  const validWorkLocations = workLocations.filter(
    (loc) =>
      loc.latitude &&
      loc.longitude &&
      !isNaN(parseFloat(loc.latitude)) &&
      !isNaN(parseFloat(loc.longitude))
  );

  console.log("Valid work locations:", validWorkLocations);

  // If no valid locations, show sample locations for demonstration
  if (validWorkLocations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center p-4">
          <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            No Work Locations with Coordinates
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Your work locations need latitude and longitude coordinates to
            display on the map.
          </p>
          <button
            onClick={() => addSampleLocations()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Add Sample Locations for Testing
          </button>
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

    const mapElement = document.getElementById("leaflet-map");
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
    const leafletMap = window.L.map("leaflet-map").setView(
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
        id="leaflet-map"
        className="w-full h-full"
        style={{ minHeight: "400px" }}
      ></div>
    </div>
  );
}

// Function to add sample locations for testing
async function addSampleLocations() {
  try {
    const sampleLocations = [
      {
        name: "Main Office",
        address: "123 Business Street, Downtown",
        latitude: 40.7128,
        longitude: -74.006,
        radius: 150,
        description: "Primary office location",
      },
      {
        name: "Branch Office",
        address: "456 Commerce Ave, Midtown",
        latitude: 40.7589,
        longitude: -73.9851,
        radius: 100,
        description: "Secondary office location",
      },
      {
        name: "Warehouse",
        address: "789 Industrial Blvd, Brooklyn",
        latitude: 40.6782,
        longitude: -73.9442,
        radius: 200,
        description: "Storage and logistics center",
      },
    ];

    for (const location of sampleLocations) {
      await fetch("/api/work-locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(location),
      });
    }

    alert("Sample locations added! Refresh the page to see them on the map.");
    window.location.reload();
  } catch (error) {
    console.error("Error adding sample locations:", error);
    alert(
      "Failed to add sample locations. Please check the console for details."
    );
  }
}

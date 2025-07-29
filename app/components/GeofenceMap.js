"use client";
import { useEffect, useRef } from "react";

export default function GeofenceMap({ center, radius, userLocation }) {
  const mapRef = useRef(null);
  const apiKey = "AIzaSyBLw2Jz2Nlj0QpafzPmgq3e9dY-bONpIeE";

  useEffect(() => {
    // Only add script if not already present
    if (!window.google) {
      if (!document.getElementById("google-maps-script")) {
        const script = document.createElement("script");
        script.id = "google-maps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        script.async = true;
        script.onload = () => initMap();
        document.body.appendChild(script);
      } else {
        // Script is loading, wait for it to finish then init
        const onLoad = () => initMap();
        document
          .getElementById("google-maps-script")
          .addEventListener("load", onLoad, { once: true });
        return () =>
          document
            .getElementById("google-maps-script")
            .removeEventListener("load", onLoad);
      }
    } else {
      initMap();
    }
    // eslint-disable-next-line
  }, [center, radius, userLocation]);

  function initMap() {
    if (!mapRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 16,
    });
    // Geofence circle
    new window.google.maps.Circle({
      strokeColor: "#4285F4",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#4285F4",
      fillOpacity: 0.2,
      map,
      center,
      radius,
    });
    // Center marker
    new window.google.maps.Marker({
      position: center,
      map,
      title: "Geofence Center",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#fff",
      },
    });
    // User location marker
    if (userLocation) {
      new window.google.maps.Marker({
        position: userLocation,
        map,
        title: "Your Location",
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#34A853",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#fff",
        },
      });
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: 400,
        borderRadius: 12,
        overflow: "hidden",
        margin: "16px 0",
      }}
      ref={mapRef}
    />
  );
}

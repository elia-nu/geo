import { NextResponse } from "next/server";

// GPS Spoofing Prevention Functions
export class GPSValidation {
  // Validate GPS coordinates for spoofing indicators
  static validateGPSIntegrity(latitude, longitude, accuracy, timestamp) {
    const issues = [];
    let riskScore = 0;

    // Check for impossible coordinates
    if (latitude < -90 || latitude > 90) {
      issues.push("Invalid latitude value");
      riskScore += 50;
    }
    if (longitude < -180 || longitude > 180) {
      issues.push("Invalid longitude value");
      riskScore += 50;
    }

    // Check for suspicious accuracy (too precise might indicate spoofing)
    if (accuracy && accuracy < 1) {
      issues.push("Suspiciously high GPS accuracy");
      riskScore += 20;
    }

    // Check for coordinates that are too round (common in fake GPS apps)
    const latRounded = Math.round(latitude * 1000) / 1000;
    const lngRounded = Math.round(longitude * 1000) / 1000;

    if (latRounded === latitude && lngRounded === longitude) {
      issues.push("Coordinates appear to be manually entered");
      riskScore += 30;
    }

    // Check for impossible location changes (teleportation detection)
    // This would need previous location data to be fully effective

    return {
      isValid: issues.length === 0,
      riskScore: Math.min(riskScore, 100),
      issues,
      recommendations: GPSValidation.getGPSRecommendations(issues),
    };
  }

  static getGPSRecommendations(issues) {
    const recommendations = [];

    if (
      issues.includes("Invalid latitude value") ||
      issues.includes("Invalid longitude value")
    ) {
      recommendations.push("Please ensure GPS is enabled and working properly");
    }

    if (issues.includes("Suspiciously high GPS accuracy")) {
      recommendations.push(
        "GPS accuracy seems unusually high. Please verify location services"
      );
    }

    if (issues.includes("Coordinates appear to be manually entered")) {
      recommendations.push(
        "Location appears to be manually set. Please use actual GPS location"
      );
    }

    return recommendations;
  }

  // Detect location consistency issues
  static validateLocationConsistency(currentLocation, previousLocations) {
    if (!previousLocations || previousLocations.length === 0) {
      return { isValid: true, riskScore: 0, issues: [], recommendations: [] };
    }

    const issues = [];
    let riskScore = 0;

    // Check for impossible location changes (teleportation)
    const lastLocation = previousLocations[0];
    const distance = GPSValidation.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      lastLocation.latitude,
      lastLocation.longitude
    );

    // If distance is more than 1000km in less than 1 hour, it's suspicious
    const timeDiff = Math.abs(
      new Date(currentLocation.timestamp) - new Date(lastLocation.timestamp)
    );
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (distance > 1000 && hoursDiff < 1) {
      issues.push("Impossible location change detected (teleportation)");
      riskScore += 80;
    }

    return {
      isValid: issues.length === 0,
      riskScore: Math.min(riskScore, 100),
      issues,
      recommendations:
        issues.length > 0 ? ["Please verify your location is accurate"] : [],
    };
  }

  // Calculate distance between two coordinates using Haversine formula
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance * 1000; // Convert to meters
  }
}

// API endpoint for GPS validation
export async function POST(request) {
  try {
    const data = await request.json();
    const { latitude, longitude, accuracy, timestamp, previousLocations } =
      data;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Validate GPS integrity
    const gpsValidation = GPSValidation.validateGPSIntegrity(
      latitude,
      longitude,
      accuracy,
      timestamp
    );

    // Validate location consistency if previous locations are provided
    let consistencyValidation = {
      isValid: true,
      riskScore: 0,
      issues: [],
      recommendations: [],
    };
    if (previousLocations && previousLocations.length > 0) {
      consistencyValidation = GPSValidation.validateLocationConsistency(
        { latitude, longitude, timestamp },
        previousLocations
      );
    }

    // Combine results
    const overallRiskScore = Math.max(
      gpsValidation.riskScore,
      consistencyValidation.riskScore
    );
    const allIssues = [
      ...gpsValidation.issues,
      ...consistencyValidation.issues,
    ];
    const allRecommendations = [
      ...gpsValidation.recommendations,
      ...consistencyValidation.recommendations,
    ];

    const result = {
      isValid: gpsValidation.isValid && consistencyValidation.isValid,
      riskScore: overallRiskScore,
      issues: allIssues,
      recommendations: allRecommendations,
      gpsValidation,
      consistencyValidation,
    };

    return NextResponse.json({
      success: true,
      validation: result,
    });
  } catch (error) {
    console.error("GPS validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate GPS coordinates", message: error.message },
      { status: 500 }
    );
  }
}

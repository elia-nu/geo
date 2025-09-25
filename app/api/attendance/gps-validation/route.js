import { NextResponse } from "next/server";
import { GPSValidation } from "../../../utils/gpsValidation.js";

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

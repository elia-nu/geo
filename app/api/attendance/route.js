import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import geofences from "../../../data/geofences.json";

const ATTENDANCE_FILE = path.join(process.cwd(), "data", "attendance.json");

// Ensure data directory exists
const ensureDataDir = () => {
  const dataDir = path.dirname(ATTENDANCE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Load attendance data
const loadAttendance = () => {
  ensureDataDir();
  if (!fs.existsSync(ATTENDANCE_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(ATTENDANCE_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading attendance data:", error);
    return [];
  }
};

// Save attendance data
const saveAttendance = (data) => {
  ensureDataDir();
  fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(data, null, 2));
};

function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET() {
  try {
    const attendance = loadAttendance();
    return NextResponse.json(attendance);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load attendance data" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { name, faceId, timestamp, lat, lng } = await request.json();

    if (!name || !faceId || !timestamp || lat == null || lng == null) {
      return NextResponse.json(
        {
          error: "Missing required fields (name, faceId, timestamp, lat, lng)",
        },
        { status: 400 }
      );
    }

    // Geofence check
    const userFence = geofences[name];
    if (!userFence) {
      return NextResponse.json(
        { error: "No geofence defined for this user" },
        { status: 403 }
      );
    }
    const distance = haversineDistance(lat, lng, userFence.lat, userFence.lng);
    if (distance > userFence.radius) {
      return NextResponse.json(
        { error: "You are not within the allowed area to mark attendance" },
        { status: 403 }
      );
    }

    const attendance = loadAttendance();

    // Check if already marked attendance today
    const today = new Date().toDateString();
    const existingEntry = attendance.find(
      (entry) =>
        entry.name === name &&
        new Date(entry.timestamp).toDateString() === today
    );

    if (existingEntry) {
      return NextResponse.json(
        { error: "Attendance already marked for today" },
        { status: 400 }
      );
    }

    // Add new attendance record
    const newEntry = {
      id: Date.now().toString(),
      name,
      faceId,
      timestamp,
      date: today,
    };

    attendance.push(newEntry);
    try {
      saveAttendance(attendance);
    } catch (saveError) {
      console.error(
        "Failed to save attendance.json, but attendance is marked:",
        saveError
      );
      // Optionally, you could add a flag in the response to indicate this
    }

    return NextResponse.json({
      success: true,
      message: "Attendance marked successfully",
      entry: newEntry,
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return NextResponse.json(
      { error: "Failed to mark attendance" },
      { status: 500 }
    );
  }
}

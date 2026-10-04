import { NextResponse } from "next/server";
import {
  ETHIOPIA_TIMEZONE,
  getEthiopianDate,
  getEthiopianTime,
  formatEthiopianDateTime,
} from "../../utils/timeUtils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/server-time
 * Authoritative Server Time & Clock-Tampering Verification Endpoint.
 *
 * Designed for Yegar Linux server deployments and client tamper protection.
 * Returns authoritative UTC and Ethiopian (EAT / UTC+3) timestamps.
 */
export async function GET() {
  const now = new Date();
  const timestamp = now.getTime();
  const ethiopianDate = getEthiopianDate(now);
  const ethiopianTime = getEthiopianTime(now, { showSeconds: true });
  const formatted = formatEthiopianDateTime(now);

  const response = NextResponse.json({
    success: true,
    timestamp,
    iso: now.toISOString(),
    ethiopianDate,
    ethiopianTime,
    formatted,
    timeZone: ETHIOPIA_TIMEZONE,
    utcOffset: "+03:00",
    serverType: "Linux / Yegar Host",
  });

  // Never allow browsers or proxies/CDNs to cache time responses
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

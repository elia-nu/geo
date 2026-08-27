import { NextResponse } from "next/server";
import { getDb } from "../../mongo";

const ID_PREFIX = "EMP-";
const PAD = 3;

function formatId(num) {
  const padded = String(num).padStart(PAD, "0");
  return `${ID_PREFIX}${padded}`;
}

export async function GET() {
  try {
    const db = await getDb();

    // Fetch only the employeeId fields to reduce payload
    const cursor = db
      .collection("employees")
      .find(
        {
          $or: [
            { employeeId: { $exists: true } },
            { "personalDetails.employeeId": { $exists: true } },
          ],
        },
        { projection: { employeeId: 1, "personalDetails.employeeId": 1 } }
      );

    let maxNum = 0;
    const regex = new RegExp(`^${ID_PREFIX}(\\d+)$`, "i");
    for await (const doc of cursor) {
      const id = doc?.employeeId || doc?.personalDetails?.employeeId;
      if (typeof id === "string") {
        const m = id.match(regex);
        if (m && m[1]) {
          const n = parseInt(m[1], 10);
          if (!Number.isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    }

    const nextNum = maxNum + 1;
    return NextResponse.json({ nextId: formatId(nextNum) });
  } catch (error) {
    console.error("Error generating next employee ID:", error);
    // Fallback to EMP-001 if something goes wrong
    return NextResponse.json({ nextId: formatId(1) }, { status: 200 });
  }
}

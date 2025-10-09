// Test script to correctly identify September 11, 2025
import Kenat from "kenat";

console.log("Testing September 11, 2025 (correct date):");
console.log("==========================================");

// Create the correct date for September 11, 2025
const sep11 = new Date(2025, 8, 11); // September 11, 2025 (month is 0-indexed)
console.log(`Gregorian Date: ${sep11.toISOString().slice(0, 10)}`);
console.log(`Date object: ${sep11}`);

try {
  const kenat = new Kenat(sep11);
  const ethiopian = kenat.getEthiopian();
  const holiday = kenat.isHoliday();

  console.log(
    `Ethiopian Date: ${ethiopian.year}/${ethiopian.month}/${ethiopian.day}`
  );
  console.log(
    `Is Meskerem 1: ${
      ethiopian.month === 1 && ethiopian.day === 1 ? "YES" : "NO"
    }`
  );
  console.log(`Is Holiday: ${holiday ? "YES" : "NO"}`);

  if (holiday) {
    console.log("Holiday Details:");
    console.log(JSON.stringify(holiday, null, 2));
  }

  // Also test the reverse - what Gregorian date corresponds to Meskerem 1, 2018 EC?
  console.log("\nReverse test - What Gregorian date is Meskerem 1, 2018 EC?");
  const kenatReverse = new Kenat("2018/1/1");
  const gregorian = kenatReverse.getGregorian();
  console.log(
    `Meskerem 1, 2018 EC = ${gregorian.year}-${String(gregorian.month).padStart(
      2,
      "0"
    )}-${String(gregorian.day).padStart(2, "0")} GC`
  );
} catch (error) {
  console.log(`Error: ${error.message}`);
}

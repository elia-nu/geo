/**
 * Resolve a department name to the canonical department document.
 * Returns a null departmentId when the name is blank or unknown so a previous
 * assignment is cleared instead of being left behind.
 */
export async function linkEmployeeDepartment(db, departmentName) {
  const raw = String(departmentName ?? "").trim();
  if (!raw) {
    return { department: "", departmentId: null };
  }

  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dept = await db.collection("departments").findOne({
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
  });

  if (!dept) {
    return { department: raw, departmentId: null };
  }

  return { department: dept.name, departmentId: dept._id };
}

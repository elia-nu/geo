"use client";
import { usePermissions } from "../hooks/usePermissions";

/**
 * PermissionGate — wraps content that should only be shown if the user
 * has the required permission(s).
 *
 * Usage:
 *   <PermissionGate permission="payroll.manage">
 *     <PayrollActions />
 *   </PermissionGate>
 *
 *   <PermissionGate anyOf={["leave.approve", "leave.manage"]}>
 *     <LeaveApprovalPanel />
 *   </PermissionGate>
 *
 *   <PermissionGate minRole="HR_STAFF" fallback={<p>No access</p>}>
 *     <HRContent />
 *   </PermissionGate>
 */
export default function PermissionGate({
  permission,     // single permission string
  anyOf,          // array — user needs ANY of these
  allOf,          // array — user needs ALL of these
  minRole,        // minimum role level (e.g., "HR_STAFF")
  fallback = null, // what to render if denied
  children,
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasMinRole, loading, isAdmin } =
    usePermissions();

  // While loading, show nothing (avoids flash of forbidden content)
  if (loading) return null;

  // ADMIN always passes
  if (isAdmin) return <>{children}</>;

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return fallback;
  }

  // Check any-of
  if (anyOf && !hasAnyPermission(anyOf)) {
    return fallback;
  }

  // Check all-of
  if (allOf && !hasAllPermissions(allOf)) {
    return fallback;
  }

  // Check minimum role level
  if (minRole && !hasMinRole(minRole)) {
    return fallback;
  }

  return <>{children}</>;
}

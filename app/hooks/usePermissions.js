"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

/**
 * usePermissions — client-side hook that decodes the JWT from localStorage
 * (supports both authToken and employeeToken) and provides permission-checking helpers.
 *
 * Usage:
 *   const { user, role, permissions, hasPermission, hasAnyPermission, canEdit, canDelete, isAdmin, loading } = usePermissions();
 *   if (hasPermission("payroll.view")) { ... }
 *   if (canEdit("employee")) { ... }
 */
export function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("authToken") || localStorage.getItem("employeeToken")
          : null;

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Decode JWT payload (no verification — server-side handles that)
      const parts = token.split(".");
      if (parts.length !== 3) {
        setUser(null);
        setLoading(false);
        return;
      }

      const payload = JSON.parse(atob(parts[1]));

      // Check expiry
      if (payload.exp && payload.exp < Date.now() / 1000) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken");
          localStorage.removeItem("employeeToken");
        }
        setUser(null);
        setLoading(false);
        return;
      }

      // Check if there is employeeData in localStorage for additional metadata
      let storedEmployee = null;
      try {
        const raw = localStorage.getItem("employeeData");
        if (raw) storedEmployee = JSON.parse(raw);
      } catch {}

      setUser({
        userId: payload.employeeId || payload.userId || storedEmployee?._id || storedEmployee?.id,
        name: payload.name || storedEmployee?.name || "",
        email: payload.email || storedEmployee?.email || "",
        role: payload.role || storedEmployee?.role || "EMPLOYEE",
        permissions: payload.permissions || storedEmployee?.permissions || [],
        department: payload.department || storedEmployee?.department || "",
        workLocations: payload.workLocations || storedEmployee?.workLocations || [],
        employeeIdCode: payload.employeeIdCode || storedEmployee?.employeeId || "",
      });
    } catch (error) {
      console.error("Error decoding auth token:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const role = user?.role || "GUEST";
  const permissions = user?.permissions || [];
  const isAdmin = role === "ADMIN";
  const isAuthenticated = !!user;

  /**
   * Check if the user has a specific permission.
   * ADMIN users always return true.
   * Wildcard "*" in permissions also grants everything.
   * Also handles domain hierarchy:
   * e.g. "employee.manage" grants "employee.read", "employee.create", "employee.update", "employee.delete"
   * e.g. "reports.read" grants any "reports.*"
   */
  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false;
      if (isAdmin) return true;
      if (!permission) return true;
      if (permissions.includes("*")) return true;
      if (permissions.includes(permission)) return true;

      const [domain, action, subAction] = permission.split(".");

      // 1. Domain manage grants all actions in that domain
      if (domain && permissions.includes(`${domain}.manage`)) {
        return true;
      }

      // 2. Generic "reports.read" is satisfied if user has reports.read OR any specific reports.* permission
      if (permission === "reports.read") {
        if (permissions.includes("reports.read")) return true;
        if (permissions.some((p) => typeof p === "string" && p.startsWith("reports."))) return true;
      }

      // Cross-compatibility aliases for reports
      if (permission === "reports.payroll" || permission === "payroll.reports") {
        if (
          permissions.includes("reports.payroll") ||
          permissions.includes("payroll.reports") ||
          permissions.includes("payroll.manage")
        ) {
          return true;
        }
      }

      if (permission === "reports.attendance" || permission === "attendance.reports") {
        if (
          permissions.includes("reports.attendance") ||
          permissions.includes("attendance.reports") ||
          permissions.includes("attendance.manage")
        ) {
          return true;
        }
      }

      if (permission === "reports.project" || permission === "project.reports") {
        if (
          permissions.includes("reports.project") ||
          permissions.includes("project.reports") ||
          permissions.includes("project.read")
        ) {
          return true;
        }
      }

      if (permission === "reports.leave" || permission === "leave.reports") {
        if (
          permissions.includes("reports.leave") ||
          permissions.includes("leave.reports") ||
          permissions.includes("leave.manage")
        ) {
          return true;
        }
      }

      // Project assigned / own alias
      if (permission === "project.read.assigned" || permission === "project.read.own") {
        if (
          permissions.includes("project.read.assigned") ||
          permissions.includes("project.read.own") ||
          permissions.includes("project.read") ||
          permissions.includes("project.manage")
        ) {
          return true;
        }
      }

      // 3. Domain read grants broad read access (e.g. employee.read grants employee.read.own, project.read grants project.read.assigned)
      // Note: domain !== "reports" prevents generic reports.read from granting specific category reports
      if (domain && domain !== "reports" && permissions.includes(`${domain}.read`)) {
        if (action === "read" || (action === "read" && (subAction === "own" || subAction === "assigned"))) {
          return true;
        }
      }

      // 4. Domain update grants update.own
      if (domain && permissions.includes(`${domain}.update`)) {
        if (action === "update" && subAction === "own") {
          return true;
        }
      }

      // 5. Domain create grants create.own
      if (domain && permissions.includes(`${domain}.create`)) {
        if (action === "create" && subAction === "own") {
          return true;
        }
      }

      // 6. Project specific: project.create/update/budget grants project.read
      if (permission === "project.read") {
        if (
          permissions.includes("project.create") ||
          permissions.includes("project.update") ||
          permissions.includes("project.budget") ||
          permissions.includes("project.delete")
        ) {
          return true;
        }
      }

      // 7. Attendance specific: attendance.manage grants attendance.view & attendance.reports
      if (permission === "attendance.view" || permission === "attendance.reports") {
        if (permissions.includes("attendance.manage")) return true;
      }

      // 8. Overtime specific: overtime.manage grants overtime.view
      if (permission === "overtime.view") {
        if (permissions.includes("overtime.manage")) return true;
      }

      // 9. Leave specific: leave.manage grants leave.view.all and leave.approve
      if (permission === "leave.view.all" || permission === "leave.approve") {
        if (permissions.includes("leave.manage")) return true;
      }

      // 10. Payroll specific: payroll.manage or payroll.approve grants payroll.view
      if (permission === "payroll.view") {
        if (permissions.includes("payroll.manage") || permissions.includes("payroll.approve")) {
          return true;
        }
      }

      // 11. Generic prefix checking
      const parts = permission.split(".");
      if (parts.length > 2) {
        const broader = parts.slice(0, 2).join(".");
        if (permissions.includes(broader)) return true;
      }

      return false;
    },
    [user, isAdmin, permissions]
  );

  /**
   * Check if the user has ANY of the given permissions.
   */
  const hasAnyPermission = useCallback(
    (perms) => {
      if (!user) return false;
      if (isAdmin) return true;
      if (!Array.isArray(perms) || perms.length === 0) return true;
      return perms.some((p) => hasPermission(p));
    },
    [user, isAdmin, hasPermission]
  );

  /**
   * Check if the user has ALL of the given permissions.
   */
  const hasAllPermissions = useCallback(
    (perms) => {
      if (!user) return false;
      if (isAdmin) return true;
      if (!Array.isArray(perms) || perms.length === 0) return true;
      return perms.every((p) => hasPermission(p));
    },
    [user, isAdmin, hasPermission]
  );

  /**
   * Convenience helpers for common CRUD actions by module:
   * e.g. canView("employee") -> checks "employee.read"
   *      canEdit("employee") -> checks "employee.update"
   *      canCreate("employee") -> checks "employee.create"
   *      canDelete("employee") -> checks "employee.delete"
   */
  const canView = useCallback(
    (module) => {
      if (!user) return false;
      if (isAdmin) return true;
      return (
        hasPermission(`${module}.read`) ||
        hasPermission(`${module}.view`) ||
        hasPermission(`${module}.manage`)
      );
    },
    [user, isAdmin, hasPermission]
  );

  const canEdit = useCallback(
    (module) => {
      if (!user) return false;
      if (isAdmin) return true;
      return (
        hasPermission(`${module}.update`) ||
        hasPermission(`${module}.edit`) ||
        hasPermission(`${module}.manage`)
      );
    },
    [user, isAdmin, hasPermission]
  );

  const canCreate = useCallback(
    (module) => {
      if (!user) return false;
      if (isAdmin) return true;
      return (
        hasPermission(`${module}.create`) ||
        hasPermission(`${module}.manage`)
      );
    },
    [user, isAdmin, hasPermission]
  );

  const canDelete = useCallback(
    (module) => {
      if (!user) return false;
      if (isAdmin) return true;
      return (
        hasPermission(`${module}.delete`) ||
        hasPermission(`${module}.manage`)
      );
    },
    [user, isAdmin, hasPermission]
  );

  /**
   * Check if the user's role level is at least the given level.
   * Based on standard levels: ADMIN=100, HR_MANAGER=80, HR_STAFF=60, MANAGER/PM=50, FINANCE=40, EMPLOYEE=10
   */
  const ROLE_LEVELS = useMemo(
    () => ({
      ADMIN: 100,
      HR_MANAGER: 80,
      HR_STAFF: 60,
      MANAGER: 50,
      PROJECT_MANAGER: 50,
      FINANCE: 40,
      EMPLOYEE: 10,
    }),
    []
  );

  const roleLevel = ROLE_LEVELS[role] || 10;

  const hasMinRole = useCallback(
    (minRole) => {
      const minLevel = ROLE_LEVELS[minRole] || 0;
      return roleLevel >= minLevel;
    },
    [roleLevel, ROLE_LEVELS]
  );

  return {
    user,
    role,
    permissions,
    isAdmin,
    isAuthenticated,
    loading,
    roleLevel,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canView,
    canEdit,
    canCreate,
    canDelete,
    hasMinRole,
  };
}

export default usePermissions;

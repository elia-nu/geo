import { redirect } from "next/navigation";

export default function AttendanceReportsRoute() {
  redirect("/hrm?section=attendance-reports");
}

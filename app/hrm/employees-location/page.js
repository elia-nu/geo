import { redirect } from "next/navigation";

export default function EmployeesLocationRoute() {
  redirect("/hrm?section=employee-location");
}

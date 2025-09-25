import { redirect } from "next/navigation";

export default function EmployeesRoute() {
  redirect("/hrm?section=employee-database");
}

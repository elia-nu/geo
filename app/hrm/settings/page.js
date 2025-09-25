import { redirect } from "next/navigation";

export default function SettingsRoute() {
  redirect("/hrm?section=settings");
}

import { redirect } from "next/navigation";

export default function NotificationsRoute() {
  redirect("/hrm?section=notifications");
}

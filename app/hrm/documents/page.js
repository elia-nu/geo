import { redirect } from "next/navigation";

export default function DocumentsRoute() {
  redirect("/hrm?section=document-list");
}

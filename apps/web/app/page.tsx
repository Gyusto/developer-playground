import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware handles auth gating; default landing is the dashboard.
  redirect("/dashboard");
}

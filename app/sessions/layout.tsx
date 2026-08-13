import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function SessionsLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/login");

  return (
    <main className="admin-shell">
      <div className="admin-nav">
        <span className="admin-nav-title">FMS Site Survey</span>
        <Link href="/sessions">All sessions</Link>
        <Link href="/sessions/design-rules">Design rules</Link>
        <span className="admin-nav-signout"><LogoutButton /></span>
      </div>
      <div className="admin-content">{children}</div>
    </main>
  );
}

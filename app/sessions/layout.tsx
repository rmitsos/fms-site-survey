import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function SessionsLayout({ children }: { children: React.ReactNode }) {
  const user = await resolveUser();
  if (!user) redirect("/login");

  return (
    <main className="admin-shell">
      <div className="admin-nav">
        <span className="admin-nav-title">FMS Site Survey</span>
        <Link href="/sessions">All sessions</Link>
        <span className="admin-nav-signout">{user.fullName} · <LogoutButton /></span>
      </div>
      <div className="admin-content">{children}</div>
    </main>
  );
}

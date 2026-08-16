import { redirect } from "next/navigation";
import Sidebar from "@/components/shell/Sidebar";
import Topbar from "@/components/shell/Topbar";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // /logout, not /login: getCurrentUser() only returns null on a genuine
  // 401/403 (see auth.ts) — /logout clears the cookie via a Route Handler
  // before redirecting, which is what makes this terminate instead of
  // proxy.ts bouncing a still-cookied visitor straight back to /.
  // A network/5xx failure now throws instead of landing here — it's caught
  // by the nearest error boundary (this layout has none, so the root
  // src/app/error.tsx), not treated as logged-out.
  const user = await getCurrentUser();
  if (!user) redirect("/logout");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

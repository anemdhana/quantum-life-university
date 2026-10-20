import { SitePage } from "@/components/SitePage";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { loadDashboard } from "@/lib/dashboard";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await loadDashboard();
  return (
    <SitePage>
      <h1>Dashboard</h1>
      <p className="muted">
        {data.email
          ? `${data.email} · ${data.role === "admin" ? "Admin" : "Reader"}`
          : "Sign in to keep highlights, notes, and your place in the text."}
      </p>
      <DashboardView data={data} />
    </SitePage>
  );
}

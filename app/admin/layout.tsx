import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { SitePage } from "@/components/SitePage";
import { isAdminUser } from "@/lib/auth/profile";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminUser())) {
    redirect("/login?next=/admin");
  }

  return (
    <SitePage wide>
      <div className="admin-shell">
        <AdminNav />
        {children}
      </div>
    </SitePage>
  );
}

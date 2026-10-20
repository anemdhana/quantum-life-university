import { AdminNav } from "@/components/admin/AdminNav";
import { SitePage } from "@/components/SitePage";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SitePage wide>
      <div className="admin-shell">
        <AdminNav />
        {children}
      </div>
    </SitePage>
  );
}

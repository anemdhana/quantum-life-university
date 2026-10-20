import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { LibraryManager } from "@/components/admin/LibraryManager";
import { SitePage } from "@/components/SitePage";
import { loadLibrary } from "@/lib/content";

export const metadata = { title: "Admin · Library" };

export default async function AdminPage() {
  const library = await loadLibrary();
  return (
    <SitePage wide>
      <div className="admin-shell">
        <AdminNav />
        <header className="admin-page-head">
          <h1>Library</h1>
          <p className="muted">Series → day → language → section.</p>
        </header>
        <Suspense fallback={<p className="muted">Loading library…</p>}>
          <LibraryManager library={library} />
        </Suspense>
      </div>
    </SitePage>
  );
}

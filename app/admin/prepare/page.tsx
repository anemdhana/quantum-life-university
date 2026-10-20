import { AdminNav } from "@/components/admin/AdminNav";
import { PrepareForm } from "@/components/admin/PrepareForm";
import { SitePage } from "@/components/SitePage";
import { loadLibrary } from "@/lib/content";

export const metadata = { title: "Admin · Add reading" };

export default async function PreparePage() {
  const library = await loadLibrary();
  return (
    <SitePage>
      <div className="admin-shell">
        <AdminNav />
        <header className="admin-page-head">
          <h1>Prepare a reading</h1>
          <p className="muted">Download captions → ChatGPT JSON → import, then refine sections.</p>
        </header>
        <PrepareForm seriesNames={library.map((series) => series.name)} />
      </div>
    </SitePage>
  );
}

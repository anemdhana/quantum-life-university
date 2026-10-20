import { Suspense } from "react";
import { LibraryManager } from "@/components/admin/LibraryManager";
import { loadLibrary } from "@/lib/content";

export const metadata = { title: "Admin · Library" };

async function AdminLibrary() {
  const library = await loadLibrary();
  return <LibraryManager library={library} />;
}

function LibraryFallback() {
  return <p className="muted">Loading library…</p>;
}

export default function AdminPage() {
  return (
    <>
      <header className="admin-page-head">
        <h1>Library</h1>
        <p className="muted">Series → day → language → section.</p>
      </header>
      <Suspense fallback={<LibraryFallback />}>
        <AdminLibrary />
      </Suspense>
    </>
  );
}

import { Suspense } from "react";
import { PrepareForm } from "@/components/admin/PrepareForm";
import { listSeriesNames } from "@/lib/content";

export const metadata = { title: "Admin · Add reading" };

async function PrepareBody() {
  const seriesNames = await listSeriesNames();
  return <PrepareForm seriesNames={seriesNames} />;
}

export default function PreparePage() {
  return (
    <>
      <header className="admin-page-head">
        <h1>Prepare a reading</h1>
      </header>
      <Suspense fallback={<p className="muted">Loading prepare form…</p>}>
        <PrepareBody />
      </Suspense>
    </>
  );
}

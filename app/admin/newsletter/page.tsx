import { Suspense } from "react";
import { NewsletterAssetForm } from "@/components/admin/NewsletterAssetForm";
import { listNewsletterAssets } from "@/lib/actions/newsletter";

export const metadata = { title: "Admin · Newsletter" };

async function NewsletterBody() {
  const assets = await listNewsletterAssets();
  return <NewsletterAssetForm initialAssets={assets} />;
}

export default function NewsletterAdminPage() {
  return (
    <>
      <header className="admin-page-head">
        <h1>Newsletter assets</h1>
        <p className="muted">
          Pick a section, upload photos as tiles, then open a tile to set label, summary, and date.
        </p>
      </header>
      <Suspense fallback={<p className="muted">Loading assets…</p>}>
        <NewsletterBody />
      </Suspense>
    </>
  );
}

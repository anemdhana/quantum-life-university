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
          Global photo library for the monthly Telugu PDF — section title, snapshot, label, summary, date taken.
        </p>
      </header>
      <Suspense fallback={<p className="muted">Loading assets…</p>}>
        <NewsletterBody />
      </Suspense>
    </>
  );
}

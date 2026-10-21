import { Suspense } from "react";
import { NewsletterAssetForm } from "@/components/admin/NewsletterAssetForm";
import { NewsletterPreparePanel } from "@/components/admin/NewsletterPreparePanel";
import { listNewsletterAssets } from "@/lib/actions/newsletter";

export const metadata = { title: "Admin · Newsletter" };

async function NewsletterBody() {
  const assets = await listNewsletterAssets();
  return (
    <div className="newsletter-page">
      <NewsletterPreparePanel />
      <NewsletterAssetForm initialAssets={assets} />
    </div>
  );
}

export default function NewsletterAdminPage() {
  return (
    <>
      <header className="admin-page-head">
        <h1>Newsletter assets</h1>
        <p className="muted">
          Long label = title + subtitle; Summary = topic content; Instruction = how it should look. Then prepare the
          ChatGPT pack (Tiles preference or Article) for the monthly Telugu PDF.
        </p>
      </header>
      <Suspense fallback={<p className="muted">Loading assets…</p>}>
        <NewsletterBody />
      </Suspense>
    </>
  );
}

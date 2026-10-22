import { Suspense } from "react";
import Link from "next/link";
import { NewsletterAssetForm } from "@/components/admin/NewsletterAssetForm";
import { NewsletterPreparePanel } from "@/components/admin/NewsletterPreparePanel";
import { listNewsletterAssets, listNewsletterSectionSettings } from "@/lib/actions/newsletter";

export const metadata = { title: "Admin · Newsletter" };

async function NewsletterBody() {
  const [assets, sectionSettings] = await Promise.all([
    listNewsletterAssets(),
    listNewsletterSectionSettings(),
  ]);
  return (
    <div className="newsletter-page">
      <NewsletterPreparePanel />
      <NewsletterAssetForm initialAssets={assets} initialSectionSettings={sectionSettings} />
    </div>
  );
}

export default function NewsletterAdminPage() {
  return (
    <>
      <header className="admin-page-head">
        <h1>Newsletter assets</h1>
        <p className="muted">
          Bank photos and instructions here, then lay out pages in{" "}
          <Link href="/admin/newsletter/composer">Composer</Link> (or still export a ChatGPT pack below).
        </p>
      </header>
      <Suspense fallback={<p className="muted">Loading assets…</p>}>
        <NewsletterBody />
      </Suspense>
    </>
  );
}

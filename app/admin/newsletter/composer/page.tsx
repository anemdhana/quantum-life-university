import { Suspense } from "react";
import { NewsletterComposer } from "@/components/admin/NewsletterComposer";
import { listNewsletterAssets } from "@/lib/actions/newsletter";

export const metadata = { title: "Admin · Newsletter Composer" };

async function ComposerBody() {
  const assets = await listNewsletterAssets({ limit: 500 });
  return <NewsletterComposer initialAssets={assets} />;
}

export default function NewsletterComposerPage() {
  return (
    <>
      <header className="composer-hero no-print">
        <p className="series-kicker">Monthly soft PDF</p>
        <h1 className="composer-hero-title">Newsletter Composer</h1>
        <p className="composer-hero-lead muted">
          Choose a calm page layout, place library photos, and edit Telugu title and summary on the canvas. Drafts save
          in this browser. Print / Save PDF when ready — ChatGPT only if you want a light polish.
        </p>
      </header>
      <Suspense fallback={<p className="muted">Loading composer…</p>}>
        <ComposerBody />
      </Suspense>
    </>
  );
}

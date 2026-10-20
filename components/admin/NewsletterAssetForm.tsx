"use client";

import { FormEvent, useMemo, useState } from "react";
import { createNewsletterAsset, type NewsletterAssetListItem } from "@/lib/actions/newsletter";

function todayLocalIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function NewsletterAssetForm({ initialAssets }: { initialAssets: NewsletterAssetListItem[] }) {
  const defaultTakenOn = useMemo(() => todayLocalIsoDate(), []);
  const [assets, setAssets] = useState(initialAssets);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [takenOn, setTakenOn] = useState(defaultTakenOn);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("takenOn", takenOn);
    const result = await createNewsletterAsset(data);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setAssets((current) => [result.asset, ...current]);
    setMessage("Asset saved.");
    form.reset();
    setTakenOn(todayLocalIsoDate());
  }

  return (
    <div className="newsletter-board">
      <form className="prepare-tile newsletter-form" onSubmit={(event) => void onSubmit(event)}>
        <h2>New asset</h2>
        <p className="prepare-hint muted">Title, image, long label, summary, and date taken (defaults to today).</p>

        <div className="prepare-fields">
          <label className="prepare-span-2">
            <span>Title</span>
            <input name="title" className="uk-input" required minLength={2} maxLength={160} placeholder="Short name for the list" />
          </label>

          <label className="prepare-span-2">
            <span>Image</span>
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
          </label>

          <label className="prepare-span-2">
            <span>Long label</span>
            <textarea
              name="label"
              className="uk-textarea lang-te"
              rows={4}
              required
              minLength={2}
              placeholder="Caption / label text for the PDF (Telugu OK)"
            />
          </label>

          <label className="prepare-span-2">
            <span>Summary</span>
            <textarea
              name="summary"
              className="uk-textarea lang-te"
              rows={3}
              required
              minLength={2}
              placeholder="Short context: who, where, why it matters"
            />
          </label>

          <label>
            <span>Date taken</span>
            <input
              name="takenOn"
              className="uk-input"
              type="date"
              required
              value={takenOn}
              onChange={(event) => setTakenOn(event.target.value)}
            />
          </label>
        </div>

        <div className="prepare-actions">
          <button className="uk-button uk-button-primary uk-button-small" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save asset"}
          </button>
          {message ? <span className={message === "Asset saved." ? "muted" : "uk-text-danger"}>{message}</span> : null}
        </div>
      </form>

      <section className="prepare-tile prepare-tile-wide">
        <h2>Library ({assets.length})</h2>
        {assets.length === 0 ? (
          <p className="muted">No assets yet. Add the first photo above.</p>
        ) : (
          <ul className="newsletter-asset-list">
            {assets.map((asset) => (
              <li key={asset.id} className="newsletter-asset-card">
                <img src={asset.imageUrl} alt="" />
                <div>
                  <strong>{asset.title}</strong>
                  <p className="muted">{asset.takenOn}</p>
                  <p className="newsletter-asset-label lang-te">{asset.label}</p>
                  <p className="newsletter-asset-summary lang-te">{asset.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

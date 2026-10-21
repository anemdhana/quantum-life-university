"use client";

import { useMemo, useState } from "react";
import {
  createNewsletterAsset,
  updateNewsletterAsset,
  type NewsletterAssetListItem,
} from "@/lib/actions/newsletter";
import {
  DEFAULT_NEWSLETTER_SECTION_TITLE,
  NEWSLETTER_SECTION_HINTS,
  NEWSLETTER_SECTION_TITLES,
  type NewsletterSectionTitle,
} from "@/lib/newsletter/sections";

type StepId = "section" | "photo" | "caption" | "when";

const STEPS: Array<{ id: StepId; title: string; summary: string }> = [
  {
    id: "section",
    title: "Section",
    summary: "Defaults to Global Assets (any section). Or pick a specific body section.",
  },
  {
    id: "photo",
    title: "Photo",
    summary: "Upload the snapshot used in the PDF (JPEG, PNG, or WebP · max 5 MB).",
  },
  {
    id: "caption",
    title: "Caption",
    summary: "Long label becomes the PDF caption; summary is editorial context for AI.",
  },
  {
    id: "when",
    title: "Date",
    summary: "When the photo was taken — helps filter the global library by month.",
  },
];

function todayLocalIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function emptyDraft(title: NewsletterSectionTitle = DEFAULT_NEWSLETTER_SECTION_TITLE) {
  return {
    id: null as string | null,
    title,
    label: "",
    summary: "",
    takenOn: todayLocalIsoDate(),
    imageUrl: null as string | null,
    imageName: null as string | null,
    imageFile: null as File | null,
  };
}

export function NewsletterAssetForm({ initialAssets }: { initialAssets: NewsletterAssetListItem[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [draft, setDraft] = useState(() => emptyDraft());
  const [stepIndex, setStepIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [filterTitle, setFilterTitle] = useState<"" | NewsletterSectionTitle>("");

  const step = STEPS[stepIndex] ?? STEPS[0];
  const editing = Boolean(draft.id);
  const sectionHint = draft.title ? NEWSLETTER_SECTION_HINTS[draft.title] : null;

  const visibleAssets = useMemo(() => {
    if (!filterTitle) return assets;
    return assets.filter((asset) => asset.title === filterTitle);
  }, [assets, filterTitle]);

  function resetForm(nextTitle: NewsletterSectionTitle = DEFAULT_NEWSLETTER_SECTION_TITLE) {
    setDraft(emptyDraft(nextTitle));
    setStepIndex(0);
  }

  function startEdit(asset: NewsletterAssetListItem) {
    setDraft({
      id: asset.id,
      title: asset.title,
      label: asset.label,
      summary: asset.summary,
      takenOn: asset.takenOn,
      imageUrl: asset.imageUrl,
      imageName: null,
      imageFile: null,
    });
    setStepIndex(0);
    setMessage(null);
  }

  function validateStep(index: number): string | null {
    const current = STEPS[index];
    if (!current) return null;
    if (current.id === "section" && !draft.title) return "Choose a newsletter section title.";
    if (current.id === "photo" && !draft.imageFile && !draft.imageUrl) return "Upload a photo snapshot.";
    if (current.id === "caption") {
      if (draft.label.trim().length < 2) return "Enter a long label / caption.";
      if (draft.summary.trim().length < 2) return "Enter a short summary.";
    }
    if (current.id === "when" && !/^\d{4}-\d{2}-\d{2}$/.test(draft.takenOn)) {
      return "Date taken must be YYYY-MM-DD.";
    }
    return null;
  }

  function goNext() {
    const error = validateStep(stepIndex);
    if (error) {
      setMessage(error);
      return;
    }
    setMessage(null);
    setStepIndex((value) => Math.min(value + 1, STEPS.length - 1));
  }

  function goBack() {
    setMessage(null);
    setStepIndex((value) => Math.max(value - 1, 0));
  }

  async function onSave() {
    for (let index = 0; index < STEPS.length; index += 1) {
      const error = validateStep(index);
      if (error) {
        setStepIndex(index);
        setMessage(error);
        return;
      }
    }

    setPending(true);
    setMessage(null);
    const data = new FormData();
    if (draft.id) data.set("id", draft.id);
    data.set("title", draft.title);
    data.set("label", draft.label);
    data.set("summary", draft.summary);
    data.set("takenOn", draft.takenOn);
    if (draft.imageFile) data.set("image", draft.imageFile);

    const result = draft.id ? await updateNewsletterAsset(data) : await createNewsletterAsset(data);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    setAssets((current) => {
      const without = current.filter((item) => item.id !== result.asset.id);
      return [result.asset, ...without];
    });
    setMessage(draft.id ? "Asset updated." : "Asset saved.");
    resetForm(draft.title);
  }

  return (
    <div className="newsletter-board">
      <section className="prepare-tile newsletter-wizard">
        <div className="newsletter-wizard-head">
          <div>
            <h2>{editing ? "Update asset" : "Add asset"}</h2>
            <p className="prepare-hint muted">
              Global library — one section title, photo, caption, and date. Step through each group.
            </p>
          </div>
          {editing ? (
            <button type="button" className="admin-text-link" onClick={() => resetForm()} disabled={pending}>
              New asset
            </button>
          ) : null}
        </div>

        <ol className="newsletter-steps" aria-label="Asset steps">
          {STEPS.map((item, index) => {
            const state = index === stepIndex ? "active" : index < stepIndex ? "done" : undefined;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={state}
                  disabled={pending}
                  onClick={() => {
                    if (index > stepIndex) {
                      const error = validateStep(stepIndex);
                      if (error) {
                        setMessage(error);
                        return;
                      }
                    }
                    setMessage(null);
                    setStepIndex(index);
                  }}
                >
                  <span className="newsletter-step-num">{index + 1}</span>
                  <span>{item.title}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="newsletter-step-panel">
          <h3>{step.title}</h3>
          <p className="muted newsletter-step-summary">{step.summary}</p>

          {step.id === "section" ? (
            <label className="newsletter-field">
              <span>Section title</span>
              <select
                className="uk-select"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value as NewsletterSectionTitle,
                  }))
                }
                required
              >
                {NEWSLETTER_SECTION_TITLES.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
              {sectionHint ? <em className="muted newsletter-field-hint">{sectionHint}</em> : null}
            </label>
          ) : null}

          {step.id === "photo" ? (
            <div className="newsletter-field">
              <span>Photo snapshot</span>
              {draft.imageUrl ? (
                <div className="newsletter-photo-preview">
                  <img src={draft.imageUrl} alt="" />
                  <p className="muted">{editing && !draft.imageFile ? "Current image — upload only to replace." : "Preview"}</p>
                </div>
              ) : null}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (!file) {
                    setDraft((current) => ({
                      ...current,
                      imageFile: null,
                      imageName: null,
                      imageUrl: current.id ? current.imageUrl : null,
                    }));
                    return;
                  }
                  const url = URL.createObjectURL(file);
                  setDraft((current) => ({
                    ...current,
                    imageFile: file,
                    imageName: file.name,
                    imageUrl: url,
                  }));
                }}
              />
              {draft.imageName ? <em className="muted">{draft.imageName}</em> : null}
            </div>
          ) : null}

          {step.id === "caption" ? (
            <div className="newsletter-caption-fields">
              <label className="newsletter-field">
                <span>Long label</span>
                <textarea
                  className="uk-textarea lang-te"
                  rows={4}
                  value={draft.label}
                  onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Caption text for the PDF (Telugu OK)"
                  required
                />
              </label>
              <label className="newsletter-field">
                <span>Summary</span>
                <textarea
                  className="uk-textarea lang-te"
                  rows={3}
                  value={draft.summary}
                  onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                  placeholder="Short context: who, where, why it matters under this section"
                  required
                />
              </label>
            </div>
          ) : null}

          {step.id === "when" ? (
            <div className="newsletter-review">
              <label className="newsletter-field">
                <span>Date taken</span>
                <input
                  className="uk-input"
                  type="date"
                  required
                  value={draft.takenOn}
                  onChange={(event) => setDraft((current) => ({ ...current, takenOn: event.target.value }))}
                />
              </label>
              <dl className="newsletter-review-card">
                <div>
                  <dt>Section</dt>
                  <dd>{draft.title || "—"}</dd>
                </div>
                <div>
                  <dt>Label</dt>
                  <dd className="lang-te">{draft.label.trim() || "—"}</dd>
                </div>
                <div>
                  <dt>Summary</dt>
                  <dd className="lang-te">{draft.summary.trim() || "—"}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <div className="newsletter-wizard-actions">
          <button
            type="button"
            className="uk-button uk-button-default uk-button-small"
            onClick={goBack}
            disabled={pending || stepIndex === 0}
          >
            Back
          </button>
          {stepIndex < STEPS.length - 1 ? (
            <button type="button" className="uk-button uk-button-primary uk-button-small" onClick={goNext} disabled={pending}>
              Next
            </button>
          ) : (
            <button type="button" className="uk-button uk-button-primary uk-button-small" onClick={() => void onSave()} disabled={pending}>
              {pending ? "Saving…" : editing ? "Update asset" : "Save asset"}
            </button>
          )}
          {message ? (
            <span className={/saved|updated/i.test(message) ? "muted" : "uk-text-danger"}>{message}</span>
          ) : null}
        </div>
      </section>

      <section className="prepare-tile prepare-tile-wide">
        <div className="newsletter-library-head">
          <h2>Library ({visibleAssets.length})</h2>
          <label className="newsletter-filter">
            <span className="uk-hidden">Filter section</span>
            <select
              className="uk-select"
              value={filterTitle}
              onChange={(event) => setFilterTitle(event.target.value as "" | NewsletterSectionTitle)}
            >
              <option value="">All sections</option>
              {NEWSLETTER_SECTION_TITLES.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </label>
        </div>
        {visibleAssets.length === 0 ? (
          <p className="muted">No assets yet. Add the first photo with the wizard.</p>
        ) : (
          <ul className="newsletter-asset-list">
            {visibleAssets.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  className={`newsletter-asset-card ${draft.id === asset.id ? "active" : ""}`}
                  onClick={() => startEdit(asset)}
                >
                  <img src={asset.imageUrl} alt="" />
                  <div>
                    <strong>{asset.title}</strong>
                    <p className="muted">{asset.takenOn}</p>
                    <p className="newsletter-asset-label lang-te">{asset.label}</p>
                    <p className="newsletter-asset-summary lang-te">{asset.summary}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

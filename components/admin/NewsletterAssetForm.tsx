"use client";

import { useMemo, useRef, useState } from "react";
import {
  createNewsletterAsset,
  deleteNewsletterAsset,
  updateNewsletterAsset,
  type NewsletterAssetListItem,
} from "@/lib/actions/newsletter";
import {
  DEFAULT_NEWSLETTER_SECTION_TITLE,
  NEWSLETTER_SECTION_HINTS,
  NEWSLETTER_SECTION_NAV,
  NEWSLETTER_SECTION_TITLES,
  type NewsletterSectionTitle,
} from "@/lib/newsletter/sections";

function todayLocalIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function labelFromFilename(name: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base.length >= 2 ? base : "New photo";
}

function AssetDetailModal({
  asset,
  pending,
  message,
  onClose,
  onSave,
  onRemove,
}: {
  asset: NewsletterAssetListItem;
  pending: boolean;
  message: string | null;
  onClose: () => void;
  onSave: (input: {
    title: NewsletterSectionTitle;
    label: string;
    summary: string;
    instruction: string;
    takenOn: string;
    imageFile: File | null;
  }) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [title, setTitle] = useState(asset.title);
  const [label, setLabel] = useState(asset.label);
  const [summary, setSummary] = useState(asset.summary);
  const [instruction, setInstruction] = useState(asset.instruction);
  const [takenOn, setTakenOn] = useState(asset.takenOn);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(asset.imageUrl);

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal newsletter-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-head">
          <h2 id="newsletter-detail-title">Photo details</h2>
          <button type="button" className="admin-text-link" onClick={onClose} disabled={pending}>
            Close
          </button>
        </div>

        <div className="newsletter-detail-preview">
          <img src={previewUrl} alt="" />
        </div>

        <label className="newsletter-field">
          <span>Section</span>
          <select className="uk-select" value={title} onChange={(event) => setTitle(event.target.value as NewsletterSectionTitle)}>
            {NEWSLETTER_SECTION_TITLES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="newsletter-field">
          <span>Long label</span>
          <textarea
            className="uk-textarea lang-te"
            rows={3}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={"Header title on first line\nSubtitle on next line (or Title — Subtitle)"}
          />
          <em className="muted newsletter-field-hint">Printed as header title + subtitle in the PDF.</em>
        </label>

        <label className="newsletter-field">
          <span>Summary</span>
          <textarea
            className="uk-textarea lang-te"
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Topic content: what happened, why it matters under this section"
          />
          <em className="muted newsletter-field-hint">Used as the body text about this photo/topic.</em>
        </label>

        <label className="newsletter-field">
          <span>Instruction</span>
          <textarea
            className="uk-textarea"
            rows={3}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Optional notes for ChatGPT: e.g. full-width hero, short pull-quote, pair with next photo, keep one short paragraph…"
          />
          <em className="muted newsletter-field-hint">How this item should look in the PDF — not extra facts.</em>
        </label>

        <div className="newsletter-detail-row">
          <label className="newsletter-field">
            <span>Date taken</span>
            <input className="uk-input" type="date" value={takenOn} onChange={(event) => setTakenOn(event.target.value)} />
          </label>
          <label className="newsletter-field">
            <span>Replace photo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setImageFile(file);
                if (file) setPreviewUrl(URL.createObjectURL(file));
              }}
            />
          </label>
        </div>

        {message ? <p className={/updated|saved/i.test(message) ? "muted" : "uk-text-danger"}>{message}</p> : null}

        <div className="admin-modal-actions newsletter-detail-actions">
          <button
            type="button"
            className="admin-text-danger"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Remove this photo from the newsletter library? This cannot be undone.")) return;
              void onRemove();
            }}
          >
            Remove photo
          </button>
          <button type="button" className="uk-button uk-button-default uk-button-small" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className="uk-button uk-button-primary uk-button-small"
            disabled={pending}
            onClick={() => void onSave({ title, label, summary, instruction, takenOn, imageFile })}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function NewsletterAssetForm({ initialAssets }: { initialAssets: NewsletterAssetListItem[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState(initialAssets);
  const [section, setSection] = useState<NewsletterSectionTitle>(DEFAULT_NEWSLETTER_SECTION_TITLE);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<NewsletterSectionTitle, number>();
    for (const title of NEWSLETTER_SECTION_TITLES) map.set(title, 0);
    for (const asset of assets) map.set(asset.title, (map.get(asset.title) ?? 0) + 1);
    return map;
  }, [assets]);

  const sectionAssets = useMemo(() => {
    const inSection = assets.filter((asset) => asset.title === section);
    const needle = query.trim().toLowerCase();
    if (!needle) return inSection;
    return inSection.filter((asset) => {
      const haystack = [asset.title, asset.label, asset.summary, asset.instruction, asset.takenOn]
        .join("\n")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [assets, section, query]);

  const selected = selectedId ? assets.find((asset) => asset.id === selectedId) ?? null : null;

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (list.length === 0) {
      setUploadMessage("Choose JPEG, PNG, or WebP images.");
      return;
    }

    setPending(true);
    setUploadMessage(null);
    const takenOn = todayLocalIsoDate();
    const created: NewsletterAssetListItem[] = [];
    const errors: string[] = [];

    for (const file of list) {
      const data = new FormData();
      data.set("title", section);
      data.set("label", labelFromFilename(file.name));
      data.set("summary", "Add summary…");
      data.set("instruction", "");
      data.set("takenOn", takenOn);
      data.set("image", file);
      const result = await createNewsletterAsset(data);
      if (result.ok) created.push(result.asset);
      else errors.push(`${file.name}: ${result.error}`);
    }

    if (created.length) {
      setAssets((current) => [...created, ...current]);
      setSelectedId(created[0]?.id ?? null);
    }
    setPending(false);
    setUploadMessage(
      errors.length
        ? `Uploaded ${created.length}. ${errors[0]}`
        : `Uploaded ${created.length} photo${created.length === 1 ? "" : "s"}.`,
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function saveDetails(input: {
    title: NewsletterSectionTitle;
    label: string;
    summary: string;
    instruction: string;
    takenOn: string;
    imageFile: File | null;
  }) {
    if (!selected) return;
    setPending(true);
    setDetailMessage(null);
    const data = new FormData();
    data.set("id", selected.id);
    data.set("title", input.title);
    data.set("label", input.label);
    data.set("summary", input.summary);
    data.set("instruction", input.instruction);
    data.set("takenOn", input.takenOn);
    if (input.imageFile) data.set("image", input.imageFile);
    const result = await updateNewsletterAsset(data);
    setPending(false);
    if (!result.ok) {
      setDetailMessage(result.error);
      return;
    }
    setAssets((current) => current.map((item) => (item.id === result.asset.id ? result.asset : item)));
    if (result.asset.title !== section) setSection(result.asset.title);
    setDetailMessage("Asset updated.");
    setSelectedId(null);
  }

  async function removeSelected() {
    if (!selected) return;
    const assetId = selected.id;
    setPending(true);
    setDetailMessage(null);
    const result = await deleteNewsletterAsset({ id: assetId });
    setPending(false);
    if (!result.ok) {
      setDetailMessage(result.error);
      return;
    }
    setAssets((current) => current.filter((item) => item.id !== assetId));
    setSelectedId(null);
    setDetailMessage(null);
    setUploadMessage("Photo removed.");
  }

  return (
    <div className="newsletter-shell">
      <aside className="newsletter-section-nav" aria-label="Newsletter sections">
        <p className="admin-panel-label">Sections</p>
        <ul>
          {NEWSLETTER_SECTION_TITLES.map((title) => {
            const count = counts.get(title) ?? 0;
            return (
              <li key={title}>
                <button
                  type="button"
                  className={section === title ? "active" : undefined}
                  onClick={() => {
                    setSection(title);
                    setQuery("");
                    setSelectedId(null);
                    setUploadMessage(null);
                  }}
                >
                  <strong>{NEWSLETTER_SECTION_NAV[title]}</strong>
                  <span>{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="newsletter-section-panel">
        <header className="newsletter-section-head">
          <div>
            <h2>{section}</h2>
            <p className="muted newsletter-section-hint">{NEWSLETTER_SECTION_HINTS[section]}</p>
          </div>
          <div className="newsletter-toolbar">
            <label className="newsletter-search">
              <span className="uk-hidden">Search in section</span>
              <input
                className="uk-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search label, summary, date…"
              />
            </label>
            <label className="uk-button uk-button-primary uk-button-small newsletter-upload-btn">
              {pending ? "Uploading…" : "Upload photos"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={pending}
                onChange={(event) => {
                  const files = event.target.files;
                  if (files?.length) void uploadFiles(files);
                }}
              />
            </label>
            {uploadMessage ? (
              <span className={/uploaded|removed/i.test(uploadMessage) ? "muted" : "uk-text-danger"}>{uploadMessage}</span>
            ) : (
              <span className="muted">Multi-select uploads into this section.</span>
            )}
          </div>
        </header>

        {sectionAssets.length === 0 ? (
          <p className="muted newsletter-empty">
            {query.trim()
              ? "No photos match that search in this section."
              : "No photos in this section yet. Upload to start the list."}
          </p>
        ) : (
          <ul className="newsletter-photo-list">
            {sectionAssets.map((asset) => (
              <li key={asset.id}>
                <button type="button" className="newsletter-photo-row" onClick={() => setSelectedId(asset.id)}>
                  <div className="newsletter-photo-media">
                    <img src={asset.imageUrl} alt="" />
                  </div>
                  <div className="newsletter-photo-copy">
                    <strong>{asset.title}</strong>
                    <p className="lang-te">{asset.label}</p>
                    <em className="lang-te">{asset.summary}</em>
                    {asset.instruction.trim() ? (
                      <span className="newsletter-instruction-preview">Instruction: {asset.instruction.trim()}</span>
                    ) : null}
                    <span>{asset.takenOn}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected ? (
        <AssetDetailModal
          key={selected.id}
          asset={selected}
          pending={pending}
          message={detailMessage}
          onClose={() => {
            setSelectedId(null);
            setDetailMessage(null);
          }}
          onSave={saveDetails}
          onRemove={removeSelected}
        />
      ) : null}
    </div>
  );
}

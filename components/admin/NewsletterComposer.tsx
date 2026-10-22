"use client";

import { useEffect, useMemo, useState } from "react";
import type { NewsletterAssetListItem } from "@/lib/actions/newsletter";
import { defaultCoverageRange } from "@/lib/newsletter/coverage";
import {
  applyLayoutToPage,
  COMPOSER_LAYOUTS,
  COMPOSER_SECTION_OPTIONS,
  createComposerIssue,
  createComposerPage,
  getComposerLayout,
  loadComposerIssue,
  saveComposerIssue,
  type ComposerIssue,
  type ComposerLayoutId,
  type ComposerPage,
  type ComposerSlot,
} from "@/lib/newsletter/composer";
import { NEWSLETTER_SECTION_NAV, type NewsletterSectionTitle } from "@/lib/newsletter/sections";

function splitLabel(label: string) {
  const lines = label
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { title: "", subtitle: "" };
  if (lines.length === 1) {
    const parts = lines[0].split(/\s+[—–|]\s+/);
    if (parts.length >= 2) return { title: parts[0], subtitle: parts.slice(1).join(" — ") };
    return { title: lines[0], subtitle: "" };
  }
  return { title: lines[0], subtitle: lines.slice(1).join(" ") };
}

function fillSlotFromAsset(slot: ComposerSlot, asset: NewsletterAssetListItem): ComposerSlot {
  const { title, subtitle } = splitLabel(asset.label);
  return {
    ...slot,
    assetId: asset.id,
    title: title || slot.title,
    subtitle: subtitle || slot.subtitle,
    body: asset.summary || slot.body,
    useAsBackground: asset.useAsBackground || slot.useAsBackground,
  };
}

function PageCanvas({
  page,
  issueMonth,
  assetsById,
  selectedSlotId,
  onSelectSlot,
}: {
  page: ComposerPage;
  issueMonth: string;
  assetsById: Map<string, NewsletterAssetListItem>;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
}) {
  const layout = getComposerLayout(page.layoutId);
  const heading =
    page.heading.trim() ||
    (page.sectionTitle ? page.sectionTitle : layout.name);

  function mediaUrl(slot: ComposerSlot) {
    if (!slot.assetId) return null;
    return assetsById.get(slot.assetId)?.imageUrl ?? null;
  }

  function slotClass(slotId: string) {
    return selectedSlotId === slotId ? "composer-slot is-selected" : "composer-slot";
  }

  if (page.layoutId === "masthead") {
    const slot = page.slots[0];
    return (
      <article className="composer-a4 composer-layout-masthead">
        <p className="composer-brand">Quantum Life University</p>
        <div className="composer-gold-rule" aria-hidden="true" />
        <button
          type="button"
          className={slotClass(slot.id)}
          onClick={() => onSelectSlot(slot.id)}
        >
          <h1 className="lang-te">{slot.title || heading || `నెలవారీ వార్తాపత్రిక · ${issueMonth}`}</h1>
          {slot.subtitle ? <p className="composer-sub lang-te">{slot.subtitle}</p> : null}
          {slot.body ? <p className="composer-body lang-te">{slot.body}</p> : null}
        </button>
        <p className="composer-issue-meta">Issue {issueMonth}</p>
      </article>
    );
  }

  if (page.layoutId === "hero-split") {
    const media = page.slots.find((s) => s.kind === "media") ?? page.slots[0];
    const copy = page.slots.find((s) => s.kind === "copy") ?? page.slots[1];
    const url = mediaUrl(media);
    return (
      <article className="composer-a4 composer-layout-hero-split">
        {page.sectionTitle || page.heading ? (
          <header className="composer-page-kicker">{heading}</header>
        ) : null}
        <div className="composer-hero-grid">
          <button type="button" className={`${slotClass(media.id)} composer-media`} onClick={() => onSelectSlot(media.id)}>
            {url ? <img src={url} alt="" /> : <span className="composer-placeholder">Choose photo</span>}
          </button>
          <button type="button" className={`${slotClass(copy.id)} composer-copy`} onClick={() => onSelectSlot(copy.id)}>
            <h2 className="lang-te">{copy.title || "Title"}</h2>
            {copy.subtitle ? <p className="composer-sub lang-te">{copy.subtitle}</p> : null}
            <p className="composer-body lang-te">{copy.body || "Summary text…"}</p>
          </button>
        </div>
      </article>
    );
  }

  if (page.layoutId === "article") {
    const media = page.slots.find((s) => s.kind === "media") ?? page.slots[0];
    const copy = page.slots.find((s) => s.kind === "copy") ?? page.slots[1];
    const url = mediaUrl(media);
    return (
      <article className="composer-a4 composer-layout-article">
        {page.sectionTitle || page.heading ? (
          <header className="composer-page-kicker">{heading}</header>
        ) : null}
        <button type="button" className={`${slotClass(media.id)} composer-media`} onClick={() => onSelectSlot(media.id)}>
          {url ? <img src={url} alt="" /> : <span className="composer-placeholder">Choose photo</span>}
        </button>
        <button type="button" className={`${slotClass(copy.id)} composer-copy`} onClick={() => onSelectSlot(copy.id)}>
          <h2 className="lang-te">{copy.title || "Title"}</h2>
          {copy.subtitle ? <p className="composer-sub lang-te">{copy.subtitle}</p> : null}
          <p className="composer-body lang-te">{copy.body || "Summary text…"}</p>
        </button>
      </article>
    );
  }

  if (page.layoutId === "bg-soft") {
    const media = page.slots.find((s) => s.kind === "media") ?? page.slots[0];
    const copy = page.slots.find((s) => s.kind === "copy") ?? page.slots[1];
    const url = mediaUrl(media);
    return (
      <article className="composer-a4 composer-layout-bg-soft">
        <button
          type="button"
          className={`${slotClass(media.id)} composer-bg-layer`}
          onClick={() => onSelectSlot(media.id)}
          style={url ? { backgroundImage: `url(${url})` } : undefined}
        >
          {!url ? <span className="composer-placeholder">Background photo</span> : null}
        </button>
        <button type="button" className={`${slotClass(copy.id)} composer-copy composer-bg-copy`} onClick={() => onSelectSlot(copy.id)}>
          {page.sectionTitle || page.heading ? <p className="composer-page-kicker">{heading}</p> : null}
          <h2 className="lang-te">{copy.title || "Title"}</h2>
          {copy.subtitle ? <p className="composer-sub lang-te">{copy.subtitle}</p> : null}
          <p className="composer-body lang-te">{copy.body || "Summary text…"}</p>
        </button>
      </article>
    );
  }

  // tiles-2 / tiles-3
  const cols = page.layoutId === "tiles-3" ? 3 : 2;
  return (
    <article className={`composer-a4 composer-layout-tiles cols-${cols}`}>
      {page.sectionTitle || page.heading ? (
        <header className="composer-page-kicker">{heading}</header>
      ) : null}
      <div className="composer-tile-grid">
        {page.slots.map((slot) => {
          const url = mediaUrl(slot);
          return (
            <button
              key={slot.id}
              type="button"
              className={`${slotClass(slot.id)} composer-tile`}
              onClick={() => onSelectSlot(slot.id)}
            >
              <div className="composer-tile-media">
                {url ? <img src={url} alt="" /> : <span className="composer-placeholder">Photo</span>}
              </div>
              <h3 className="lang-te">{slot.title || "Title"}</h3>
              {slot.subtitle ? <p className="composer-sub lang-te">{slot.subtitle}</p> : null}
              <p className="composer-body lang-te">{slot.body || "Summary…"}</p>
            </button>
          );
        })}
      </div>
    </article>
  );
}

export function NewsletterComposer({ initialAssets }: { initialAssets: NewsletterAssetListItem[] }) {
  const defaults = useMemo(() => defaultCoverageRange(), []);
  const [issueMonth, setIssueMonth] = useState(defaults.issueMonth);
  const [issue, setIssue] = useState<ComposerIssue>(() => createComposerIssue(defaults.issueMonth));
  const [hydrated, setHydrated] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [assetQuery, setAssetQuery] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const assetsById = useMemo(() => {
    const map = new Map<string, NewsletterAssetListItem>();
    for (const asset of initialAssets) map.set(asset.id, asset);
    return map;
  }, [initialAssets]);

  useEffect(() => {
    const stored = loadComposerIssue(issueMonth);
    const next = stored ?? createComposerIssue(issueMonth);
    setIssue(next);
    setSelectedPageId(next.pages[0]?.id ?? null);
    setSelectedSlotId(next.pages[0]?.slots[0]?.id ?? null);
    setHydrated(true);
  }, [issueMonth]);

  useEffect(() => {
    if (!hydrated) return;
    saveComposerIssue(issue);
    setSavedFlash(true);
    const timer = window.setTimeout(() => setSavedFlash(false), 1200);
    return () => window.clearTimeout(timer);
  }, [issue, hydrated]);

  const selectedPage = issue.pages.find((page) => page.id === selectedPageId) ?? issue.pages[0] ?? null;
  const selectedSlot =
    selectedPage?.slots.find((slot) => slot.id === selectedSlotId) ?? selectedPage?.slots[0] ?? null;

  const filteredAssets = useMemo(() => {
    const needle = assetQuery.trim().toLowerCase();
    if (!needle) return initialAssets;
    return initialAssets.filter((asset) =>
      [asset.title, asset.label, asset.summary, asset.takenOn].join("\n").toLowerCase().includes(needle),
    );
  }, [assetQuery, initialAssets]);

  function updatePage(pageId: string, updater: (page: ComposerPage) => ComposerPage) {
    setIssue((current) => ({
      ...current,
      pages: current.pages.map((page) => (page.id === pageId ? updater(page) : page)),
    }));
  }

  function updateSelectedSlot(patch: Partial<ComposerSlot>) {
    if (!selectedPage || !selectedSlot) return;
    updatePage(selectedPage.id, (page) => ({
      ...page,
      slots: page.slots.map((slot) => (slot.id === selectedSlot.id ? { ...slot, ...patch } : slot)),
    }));
  }

  function addPage(layoutId: ComposerLayoutId = "article") {
    const page = createComposerPage({ layoutId });
    setIssue((current) => ({ ...current, pages: [...current.pages, page] }));
    setSelectedPageId(page.id);
    setSelectedSlotId(page.slots[0]?.id ?? null);
  }

  function removePage(pageId: string) {
    setIssue((current) => {
      if (current.pages.length <= 1) return current;
      const pages = current.pages.filter((page) => page.id !== pageId);
      return { ...current, pages };
    });
    if (selectedPageId === pageId) {
      setSelectedPageId(null);
      setSelectedSlotId(null);
    }
  }

  function movePage(pageId: string, direction: -1 | 1) {
    setIssue((current) => {
      const index = current.pages.findIndex((page) => page.id === pageId);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.pages.length) return current;
      const pages = [...current.pages];
      const [item] = pages.splice(index, 1);
      pages.splice(next, 0, item);
      return { ...current, pages };
    });
  }

  function onPrint() {
    window.print();
  }

  return (
    <div className="composer-shell">
      <header className="composer-toolbar">
        <label className="newsletter-field composer-month">
          <span>Issue month</span>
          <input
            className="uk-input"
            type="month"
            value={issueMonth}
            onChange={(event) => setIssueMonth(event.target.value)}
          />
        </label>
        <p className="muted composer-save-hint">
          {savedFlash ? "Draft saved in this browser." : "Draft auto-saves locally for this issue month."}
        </p>
        <div className="composer-toolbar-actions">
          <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => addPage("tiles-2")}>
            Add page
          </button>
          <button type="button" className="uk-button uk-button-primary uk-button-small" onClick={onPrint}>
            Print / Save PDF
          </button>
        </div>
      </header>

      <div className="composer-board">
        <aside className="composer-pages" aria-label="Pages">
          <p className="admin-panel-label">Pages</p>
          <ul>
            {issue.pages.map((page, index) => {
              const layout = getComposerLayout(page.layoutId);
              return (
                <li key={page.id}>
                  <button
                    type="button"
                    className={page.id === selectedPage?.id ? "active" : undefined}
                    onClick={() => {
                      setSelectedPageId(page.id);
                      setSelectedSlotId(page.slots[0]?.id ?? null);
                    }}
                  >
                    <strong>
                      {index + 1}. {page.heading.trim() || layout.name}
                    </strong>
                    <span>{layout.name}</span>
                  </button>
                  <div className="composer-page-tools">
                    <button type="button" className="admin-text-link" onClick={() => movePage(page.id, -1)} disabled={index === 0}>
                      Up
                    </button>
                    <button
                      type="button"
                      className="admin-text-link"
                      onClick={() => movePage(page.id, 1)}
                      disabled={index === issue.pages.length - 1}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="admin-text-danger"
                      onClick={() => removePage(page.id)}
                      disabled={issue.pages.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="composer-add-layouts">
            <p className="admin-panel-label">Add layout</p>
            {COMPOSER_LAYOUTS.map((layout) => (
              <button key={layout.id} type="button" className="composer-layout-chip" onClick={() => addPage(layout.id)}>
                {layout.name}
              </button>
            ))}
          </div>
        </aside>

        <section className="composer-canvas-wrap" aria-label="Page preview">
          {selectedPage ? (
            <>
              <PageCanvas
                page={selectedPage}
                issueMonth={issueMonth}
                assetsById={assetsById}
                selectedSlotId={selectedSlot?.id ?? null}
                onSelectSlot={setSelectedSlotId}
              />
              <div className="composer-print-stack" aria-hidden="true">
                {issue.pages.map((page) => (
                  <PageCanvas
                    key={`print-${page.id}`}
                    page={page}
                    issueMonth={issueMonth}
                    assetsById={assetsById}
                    selectedSlotId={null}
                    onSelectSlot={() => undefined}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Add a page to begin.</p>
          )}
        </section>

        <aside className="composer-inspector" aria-label="Page settings">
          {selectedPage ? (
            <>
              <p className="admin-panel-label">Page</p>
              <label className="newsletter-field">
                <span>Layout</span>
                <select
                  className="uk-select"
                  value={selectedPage.layoutId}
                  onChange={(event) => {
                    const layoutId = event.target.value as ComposerLayoutId;
                    updatePage(selectedPage.id, (page) => applyLayoutToPage(page, layoutId));
                    setSelectedSlotId(null);
                  }}
                >
                  {COMPOSER_LAYOUTS.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name} — {layout.description}
                    </option>
                  ))}
                </select>
              </label>
              <label className="newsletter-field">
                <span>Section heading (optional)</span>
                <select
                  className="uk-select"
                  value={selectedPage.sectionTitle}
                  onChange={(event) => {
                    const sectionTitle = event.target.value as NewsletterSectionTitle | "";
                    updatePage(selectedPage.id, (page) => ({
                      ...page,
                      sectionTitle,
                      heading: sectionTitle || page.heading,
                    }));
                  }}
                >
                  <option value="">Custom / none</option>
                  {COMPOSER_SECTION_OPTIONS.filter(Boolean).map((title) => (
                    <option key={title} value={title}>
                      {NEWSLETTER_SECTION_NAV[title as NewsletterSectionTitle]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="newsletter-field">
                <span>Page label</span>
                <input
                  className="uk-input"
                  value={selectedPage.heading}
                  onChange={(event) =>
                    updatePage(selectedPage.id, (page) => ({ ...page, heading: event.target.value }))
                  }
                  placeholder="Shown above content when set"
                />
              </label>

              {selectedSlot ? (
                <>
                  <p className="admin-panel-label">Selected slot · {selectedSlot.kind}</p>
                  <label className="newsletter-field">
                    <span>Title</span>
                    <input
                      className="uk-input lang-te"
                      value={selectedSlot.title}
                      onChange={(event) => updateSelectedSlot({ title: event.target.value })}
                    />
                  </label>
                  <label className="newsletter-field">
                    <span>Subtitle</span>
                    <input
                      className="uk-input lang-te"
                      value={selectedSlot.subtitle}
                      onChange={(event) => updateSelectedSlot({ subtitle: event.target.value })}
                    />
                  </label>
                  <label className="newsletter-field">
                    <span>Body / summary</span>
                    <textarea
                      className="uk-textarea lang-te"
                      rows={5}
                      value={selectedSlot.body}
                      onChange={(event) => updateSelectedSlot({ body: event.target.value })}
                    />
                  </label>
                  {selectedSlot.kind === "media" || selectedSlot.kind === "card" ? (
                    <label className="newsletter-check">
                      <input
                        type="checkbox"
                        checked={selectedSlot.useAsBackground}
                        onChange={(event) => updateSelectedSlot({ useAsBackground: event.target.checked })}
                      />
                      <span>Prefer as soft background</span>
                    </label>
                  ) : null}

                  <p className="admin-panel-label">Place photo from library</p>
                  <label className="newsletter-search">
                    <span className="uk-hidden">Search assets</span>
                    <input
                      className="uk-input"
                      type="search"
                      value={assetQuery}
                      onChange={(event) => setAssetQuery(event.target.value)}
                      placeholder="Search assets…"
                    />
                  </label>
                  <ul className="composer-asset-pick">
                    {filteredAssets.slice(0, 40).map((asset) => (
                      <li key={asset.id}>
                        <button
                          type="button"
                          className={selectedSlot.assetId === asset.id ? "active" : undefined}
                          onClick={() => updateSelectedSlot(fillSlotFromAsset(selectedSlot, asset))}
                        >
                          <img src={asset.imageUrl} alt="" />
                          <span className="lang-te">{asset.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {selectedSlot.assetId ? (
                    <button
                      type="button"
                      className="admin-text-link"
                      onClick={() => updateSelectedSlot({ assetId: null })}
                    >
                      Clear photo
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="muted">Click a block on the page to edit it.</p>
              )}
            </>
          ) : (
            <p className="muted">Select a page.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

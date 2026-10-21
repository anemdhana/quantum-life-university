"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fetchSection, updateDayCover, updateSection } from "@/lib/actions/admin";
import { formatClock, youtubeWatchUrl } from "@/lib/content/paragraphs";
import { readingPath } from "@/lib/series";
import { languageCode, languageLabel } from "@/lib/language";
import { SECTION_PLACEHOLDER, type Language, type ReaderSection, type SectionOutline } from "@/types/content";
import "@/components/reader/reader.css";

type Props = {
  series: string;
  seriesName: string;
  dayNumber: number;
  language: Language;
  coverUrl: string | null;
  youtubeId: string | null;
  section: ReaderSection;
  sections: SectionOutline[];
};

function paragraphsOf(section: ReaderSection) {
  return section.content.length === 1 && section.content[0] === SECTION_PLACEHOLDER ? [""] : section.content;
}

function SectionPane({
  dayNumber,
  language,
  youtubeId,
  section,
  sections,
  onSavedTitle,
}: {
  dayNumber: number;
  language: Language;
  youtubeId: string | null;
  section: ReaderSection;
  sections: SectionOutline[];
  onSavedTitle: (sectionOrder: number, title: string) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(section.title);
  const [paragraphs, setParagraphs] = useState(paragraphsOf(section));
  const [minutes, setMinutes] = useState(section.minutes ? String(section.minutes) : "");
  const [startSec, setStartSec] = useState(section.startSec != null ? String(section.startSec) : "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const index = sections.findIndex((item) => item.sectionOrder === section.sectionOrder);
  const parsedStart = startSec.trim() === "" ? null : Number(startSec);
  const sectionStart = typeof parsedStart === "number" && Number.isFinite(parsedStart) ? Math.max(0, Math.round(parsedStart)) : null;
  const listenUrl = youtubeId && sectionStart != null ? youtubeWatchUrl(youtubeId, sectionStart) : null;

  function updateParagraph(index: number, value: string) {
    setParagraphs((current) => current.map((paragraph, itemIndex) => (itemIndex === index ? value : paragraph)));
  }

  function move(index: number, dir: -1 | 1) {
    setParagraphs((current) => {
      const nextIndex = index + dir;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await updateSection({
      id: section.id,
      dayNumber,
      language,
      title,
      content: paragraphs,
      minutes: minutes.trim() ? Number(minutes) : null,
      startSec: sectionStart,
    });
    setMessage(result.ok ? "Saved." : result.error);
    setPending(false);
    if (result.ok) {
      onSavedTitle(section.sectionOrder, title.trim());
      router.refresh();
    }
  }

  return (
    <form className="uk-form-stacked admin-section-form" onSubmit={(event) => void onSubmit(event)}>
      <div className="admin-section-stepper">
        <span className="muted">
          {index + 1}/{sections.length}
        </span>
      </div>

      <div className="admin-field-row admin-field-row-3">
        <div className="admin-field-grow">
          <label className="uk-form-label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className={`uk-input ${language === "te" ? "lang-te" : ""}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="admin-field-minutes">
          <label className="uk-form-label" htmlFor="start">
            Start (sec)
          </label>
          <input
            id="start"
            className="uk-input"
            inputMode="numeric"
            value={startSec}
            onChange={(event) => setStartSec(event.target.value)}
            placeholder="72"
          />
        </div>
        <div className="admin-field-minutes">
          <label className="uk-form-label" htmlFor="minutes">
            Min
          </label>
          <input
            id="minutes"
            className="uk-input"
            inputMode="numeric"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </div>
      </div>

      {listenUrl ? (
        <div className="admin-section-tools">
          <a className="listen-link" href={listenUrl} target="_blank" rel="noreferrer">
            Listen {formatClock(sectionStart ?? 0)}
          </a>
        </div>
      ) : null}

      <div className={`reader-preview lang-${language}`} aria-live="polite">
        <p className="intro">Reader preview · same look as series Preview / Swadhyaya export</p>
        <h2 className="section-title">{title.trim() || "Untitled section"}</h2>
        {paragraphs.some((paragraph) => paragraph.trim()) ? (
          paragraphs.map((paragraph, paragraphIndex) =>
            paragraph.trim() ? <p key={paragraphIndex}>{paragraph}</p> : null,
          )
        ) : (
          <p className="muted">Paragraphs will appear here as you type.</p>
        )}
      </div>

      {paragraphs.map((paragraph, paragraphIndex) => (
        <div key={paragraphIndex} className="admin-paragraph">
          <div className="admin-paragraph-head">
            <label className="uk-form-label" htmlFor={`p-${paragraphIndex}`}>
              Paragraph {paragraphIndex + 1}
            </label>
            <div className="admin-paragraph-tools">
              <button type="button" onClick={() => move(paragraphIndex, -1)}>
                ↑
              </button>
              <button type="button" onClick={() => move(paragraphIndex, 1)}>
                ↓
              </button>
              <button type="button" onClick={() => setParagraphs((current) => current.filter((_, itemIndex) => itemIndex !== paragraphIndex))}>
                ✕
              </button>
            </div>
          </div>
          <textarea
            id={`p-${paragraphIndex}`}
            className={`uk-textarea ${language === "te" ? "lang-te" : ""}`}
            rows={4}
            value={paragraph}
            onChange={(event) => updateParagraph(paragraphIndex, event.target.value)}
          />
        </div>
      ))}

      <div className="admin-section-footer">
        <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => setParagraphs((current) => [...current, ""])}>
          + Paragraph
        </button>
        <button type="submit" className="uk-button uk-button-primary uk-button-small" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        {message ? <span className={message === "Saved." ? "muted" : "uk-text-danger"}>{message}</span> : null}
      </div>
    </form>
  );
}

function DayCoverPanel({
  series,
  dayNumber,
  language,
  coverUrl: initialCoverUrl,
}: {
  series: string;
  dayNumber: number;
  language: Language;
  coverUrl: string | null;
}) {
  const router = useRouter();
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onUpload(file: File | null) {
    if (!file) return;
    setPending(true);
    setMessage(null);
    const data = new FormData();
    data.set("series", series);
    data.set("dayNumber", String(dayNumber));
    data.set("language", language);
    data.set("image", file);
    const result = await updateDayCover(data);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setCoverUrl(result.coverUrl);
    setMessage("Cover saved.");
    router.refresh();
  }

  async function onClear() {
    if (!coverUrl) return;
    if (!window.confirm("Remove this day’s cover image?")) return;
    setPending(true);
    setMessage(null);
    const data = new FormData();
    data.set("series", series);
    data.set("dayNumber", String(dayNumber));
    data.set("language", language);
    data.set("clear", "1");
    const result = await updateDayCover(data);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setCoverUrl(null);
    setMessage("Cover removed.");
    router.refresh();
  }

  return (
    <div className="admin-day-cover">
      <p className="admin-panel-label">Day cover</p>
      {coverUrl ? <img src={coverUrl} alt="" className="admin-day-cover-preview" /> : <p className="muted">No cover yet.</p>}
      <label className="admin-day-cover-upload">
        <span>{pending ? "Saving…" : coverUrl ? "Replace image" : "Upload image"}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(event) => void onUpload(event.target.files?.[0] ?? null)}
        />
      </label>
      {coverUrl ? (
        <button type="button" className="admin-text-danger" disabled={pending} onClick={() => void onClear()}>
          Remove
        </button>
      ) : null}
      {message ? <p className={message.includes("saved") || message.includes("removed") ? "muted" : "uk-text-danger"}>{message}</p> : null}
    </div>
  );
}

export function SectionEditor({
  series,
  seriesName,
  dayNumber,
  language,
  coverUrl,
  youtubeId,
  section,
  sections: initialSections,
}: Props) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [active, setActive] = useState(section);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingOrder, setLoadingOrder] = useState<number | null>(null);

  function editHref(order: number) {
    return `/admin/edit/${dayNumber}/${order}?lang=${language}&series=${encodeURIComponent(series)}`;
  }

  function openSection(order: number) {
    if (order === active.sectionOrder || loadingOrder === order) return;
    setError(null);
    setLoadingOrder(order);
    startTransition(async () => {
      const result = await fetchSection({ series, dayNumber, language, sectionOrder: order });
      setLoadingOrder(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setActive(result.section);
      router.replace(editHref(order), { scroll: false });
    });
  }

  const index = sections.findIndex((item) => item.sectionOrder === active.sectionOrder);
  const previous = index > 0 ? sections[index - 1] : null;
  const next = index >= 0 && index < sections.length - 1 ? sections[index + 1] : null;
  const paneBusy = pending || loadingOrder !== null;

  return (
    <>
      <header className="admin-page-head">
        <h1 className={language === "te" ? "lang-te" : undefined}>{active.title}</h1>
        <p className="muted">
          {seriesName} · Day {dayNumber} · {languageLabel(language)}
          {paneBusy ? " · Loading…" : ""}
        </p>
      </header>

      <div className="admin-edit-layout">
        <aside className="admin-section-nav" aria-label="Sections">
          <div className="admin-side-links">
            <Link href={`/admin?series=${encodeURIComponent(series)}`}>Library</Link>
            <span aria-hidden="true">·</span>
            <Link href={readingPath(series, dayNumber, language, active.sectionOrder)}>Preview</Link>
          </div>
          <p className="admin-panel-label">
            Day {dayNumber} · {languageCode(language)}
          </p>
          <DayCoverPanel
            key={`${series}-${dayNumber}-${language}-${coverUrl ?? "none"}`}
            series={series}
            dayNumber={dayNumber}
            language={language}
            coverUrl={coverUrl}
          />
          <ul>
            {sections.map((item) => {
              const activeItem = item.sectionOrder === active.sectionOrder;
              const loading = loadingOrder === item.sectionOrder;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={activeItem ? "active" : undefined}
                    aria-current={activeItem ? "page" : undefined}
                    disabled={paneBusy && !loading}
                    onClick={() => openSection(item.sectionOrder)}
                  >
                    <span>{item.sectionOrder}</span>
                    <strong className={language === "te" ? "lang-te" : undefined}>
                      {item.title}
                      {loading ? " · …" : ""}
                    </strong>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="admin-section-stepper" style={{ marginTop: 12 }}>
            <button type="button" className="admin-text-link" disabled={!previous || paneBusy} onClick={() => previous && openSection(previous.sectionOrder)}>
              ← Prev
            </button>
            <button type="button" className="admin-text-link" disabled={!next || paneBusy} onClick={() => next && openSection(next.sectionOrder)}>
              Next →
            </button>
          </div>
        </aside>

        <div className={`admin-section-pane${paneBusy ? " is-loading" : ""}`} aria-busy={paneBusy}>
          {error ? <p className="uk-text-danger">{error}</p> : null}
          <SectionPane
            key={active.id}
            dayNumber={dayNumber}
            language={language}
            youtubeId={youtubeId}
            section={active}
            sections={sections}
            onSavedTitle={(sectionOrder, title) => {
              setActive((current) => (current.sectionOrder === sectionOrder ? { ...current, title } : current));
              setSections((current) =>
                current.map((item) => (item.sectionOrder === sectionOrder ? { ...item, title } : item)),
              );
            }}
          />
        </div>
      </div>
    </>
  );
}

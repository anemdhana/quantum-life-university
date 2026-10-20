"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fetchSection, updateSection } from "@/lib/actions/admin";
import { formatClock, youtubeWatchUrl } from "@/lib/content/paragraphs";
import { readingPath } from "@/lib/series";
import { SECTION_PLACEHOLDER, type Language, type ReaderSection, type SectionOutline } from "@/types/content";

type Props = {
  series: string;
  seriesName: string;
  dayNumber: number;
  language: Language;
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

export function SectionEditor({ series, seriesName, dayNumber, language, youtubeId, section, sections: initialSections }: Props) {
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
          {seriesName} · Day {dayNumber} · {language === "te" ? "Telugu" : "English"}
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
            Day {dayNumber} · {language === "te" ? "TE" : "EN"}
          </p>
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

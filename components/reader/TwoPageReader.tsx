"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { HighlightToolbar } from "@/components/reader/HighlightToolbar";
import { createHighlight, toggleBookmark } from "@/lib/actions/highlights";
import { saveProgress } from "@/lib/actions/progress";
import { formatClock, youtubeWatchUrl } from "@/lib/content/paragraphs";
import { readingPath } from "@/lib/series";
import type { Language, ReaderDay } from "@/types/content";
import "./reader.css";

type LocalHighlight = {
  sectionId: string;
  text: string;
};

type SelectionState = {
  text: string;
  x: number;
  y: number;
};

type Props = {
  day: ReaderDay;
  languages?: Language[];
  /** Published day numbers in this series+language (for Programme / Prev / Next). */
  dayNumbers?: number[];
  initialSection?: number;
  initialSpread?: number;
};

function withMarks(text: string, marks: string[]) {
  const nodes: Array<string | { mark: string; key: string }> = [text];
  marks.forEach((mark, markIndex) => {
    if (!mark) return;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (typeof node !== "string" || !node.includes(mark)) continue;
      const at = node.indexOf(mark);
      nodes.splice(
        index,
        1,
        node.slice(0, at),
        { mark, key: `${markIndex}-${at}` },
        node.slice(at + mark.length),
      );
      break;
    }
  });
  return nodes;
}

export function TwoPageReader({
  day,
  languages = ["te", "en"],
  dayNumbers,
  initialSection = 1,
  initialSpread = 0,
}: Props) {
  const startChapter = Math.min(Math.max(initialSection, 1), day.sections.length) - 1;
  const [chapter, setChapter] = useState(startChapter);
  const [spreadIndex, setSpreadIndex] = useState(Math.max(initialSpread, 0));
  const [spreadCount, setSpreadCount] = useState(1);
  const [large, setLarge] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [highlights, setHighlights] = useState<LocalHighlight[]>([]);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const pendingJump = useRef<number | null>(initialSpread > 0 ? initialSpread : null);
  const stateRef = useRef({ chapter, spreadIndex, spreadCount });
  stateRef.current = { chapter, spreadIndex, spreadCount };

  const section = day.sections[chapter];

  const measure = useCallback(() => {
    const columns = columnsRef.current;
    if (!columns) return;
    const width = columns.clientWidth || 1;
    const one = window.matchMedia("(max-width: 800px)").matches;
    setNarrow(one);
    const total = Math.max(width, columns.scrollWidth);
    const count = Math.max(1, Math.ceil((total - 2) / width));
    setSpreadCount(count);
    setSpreadIndex((current) => {
      const requested = pendingJump.current ?? current;
      pendingJump.current = null;
      const next = Math.min(Math.max(requested, 0), count - 1);
      columns.scrollLeft = next * width;
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(measure));
    return () => cancelAnimationFrame(frame);
  }, [chapter, large, day.language, measure]);

  const move = useCallback(
    (dir: 1 | -1) => {
      const columns = columnsRef.current;
      if (!columns) return;
      const width = columns.clientWidth || 1;
      const current = stateRef.current;
      setSelection(null);
      if (dir === 1) {
        if (current.spreadIndex < current.spreadCount - 1) {
          const next = current.spreadIndex + 1;
          columns.scrollLeft = next * width;
          setSpreadIndex(next);
          return;
        }
        if (current.chapter < day.sections.length - 1) {
          pendingJump.current = 0;
          setSpreadIndex(0);
          setChapter(current.chapter + 1);
        }
        return;
      }
      if (current.spreadIndex > 0) {
        const next = current.spreadIndex - 1;
        columns.scrollLeft = next * width;
        setSpreadIndex(next);
        return;
      }
      if (current.chapter > 0) {
        pendingJump.current = 9999;
        setSpreadIndex(9999);
        setChapter(current.chapter - 1);
      }
    },
    [day.sections.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea")) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") move(1);
      if (event.key === "ArrowLeft" || event.key === "PageUp") move(-1);
    };
    const onResize = () => {
      pendingJump.current = 0;
      setSpreadIndex(0);
      requestAnimationFrame(measure);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [measure, move]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void saveProgress({
        dayNumber: day.dayNumber,
        seriesSlug: day.series,
        language: day.language,
        sectionId: section.id,
        sectionOrder: section.sectionOrder,
        spreadIndex,
      });
    }, 700);
    return () => window.clearTimeout(handle);
  }, [day.dayNumber, day.language, day.series, section.id, section.sectionOrder, spreadIndex]);

  function openSection(index: number) {
    pendingJump.current = 0;
    setSpreadIndex(0);
    setChapter(index);
    setMenuOpen(false);
    setSelection(null);
  }

  function onMouseUp() {
    const selected = window.getSelection();
    const columns = columnsRef.current;
    if (!selected || selected.isCollapsed || !columns || !selected.anchorNode) return;
    if (!columns.contains(selected.anchorNode)) return;
    const text = selected.toString().trim();
    if (!text) return;
    const rect = selected.getRangeAt(0).getBoundingClientRect();
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - 280);
    setSelection({ text, x: left, y: Math.min(rect.bottom + 8, window.innerHeight - 80) });
    setStatus(null);
  }

  async function remember(noteText?: string) {
    if (!selection) return;
    setHighlights((current) => [...current, { sectionId: section.id, text: selection.text }]);
    const result = await createHighlight({
      dayNumber: day.dayNumber,
      sectionId: section.id,
      selectedText: selection.text,
      noteText: noteText || null,
    });
    setStatus(result.ok ? "Saved to your highlights." : `${result.error} Kept on this page for now.`);
    window.getSelection()?.removeAllRanges();
  }

  async function bookmark() {
    const result = await toggleBookmark({
      dayNumber: day.dayNumber,
      sectionId: section.id,
      label: section.title,
    });
    setStatus(result.ok ? (result.bookmarked ? "Bookmarked." : "Bookmark removed.") : result.error);
  }

  const marks = highlights.filter((item) => item.sectionId === section.id).map((item) => item.text);
  const atStart = chapter === 0 && spreadIndex === 0;
  const atEnd = chapter === day.sections.length - 1 && spreadIndex === spreadCount - 1;

  const orderedDays = [...(dayNumbers ?? [day.dayNumber])].sort((a, b) => a - b);
  const dayIndex = orderedDays.indexOf(day.dayNumber);
  const prevDay = dayIndex > 0 ? orderedDays[dayIndex - 1] : null;
  const nextDay = dayIndex >= 0 && dayIndex < orderedDays.length - 1 ? orderedDays[dayIndex + 1] : null;

  const dayJump = (
    <nav className="day-jump" aria-label="Days">
      <Link href="/">Programme</Link>
      {prevDay != null ? (
        <Link href={readingPath(day.series, prevDay, day.language)}>Prev</Link>
      ) : null}
      {nextDay != null ? (
        <Link href={readingPath(day.series, nextDay, day.language)}>Next</Link>
      ) : null}
    </nav>
  );

  const nav = (idPrefix: string) => (
    <ul className="nav" id={idPrefix}>
      {day.sections.map((item, index) => (
        <li key={item.id}>
          <button type="button" className={index === chapter ? "active" : undefined} onClick={() => openSection(index)}>
            <span className="n">{String(index + 1).padStart(2, "0")}</span>
            <span>
              {item.title}
              <small>~{item.minutes ?? "–"} min read</small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`reader-app lang-${day.language}${large ? " font-large" : ""}`}>
      <aside className="side">
        <Link className="brand" href="/">
          QUANTUM LIFE UNIVERSITY
        </Link>
        {dayJump}
        <h2>{day.seriesName}</h2>
        <p className="sub">
          {day.title} · {day.subtitle}
        </p>
        {nav("nav")}
      </aside>
      <main className="main">
        <header className="bar">
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <button type="button" className="uk-button uk-button-default uk-button-small mobile" onClick={() => setMenuOpen((open) => !open)}>
              ☰
            </button>
            <span className="bar-title">{section.title}</span>
          </div>
          <div className="tools">
            {languages.length > 1 ? (
              <span className="lang-switch">
                <Link className={day.language === "te" ? "active" : undefined} href={readingPath(day.series, day.dayNumber, "te", section.sectionOrder)}>
                  తె
                </Link>
                <Link className={day.language === "en" ? "active" : undefined} href={readingPath(day.series, day.dayNumber, "en", section.sectionOrder)}>
                  EN
                </Link>
              </span>
            ) : null}
            <span className="read-time">~{section.minutes ?? "–"} min</span>
            <button type="button" className="uk-button uk-button-default uk-button-small" title="Bookmark section" onClick={() => void bookmark()}>
              Bookmark
            </button>
            <button
              type="button"
              className="uk-button uk-button-default uk-button-small"
              title="Toggle text size"
              onClick={() => {
                pendingJump.current = 0;
                setSpreadIndex(0);
                setLarge((value) => !value);
              }}
            >
              A±
            </button>
            <Link className="uk-button uk-button-default uk-button-small" href={`/admin/edit/${day.dayNumber}/${section.sectionOrder}?lang=${day.language}&series=${day.series}`}>
              Edit
            </Link>
          </div>
        </header>
        <div className="reader">
          <div className="spread">
            <div className="columns" ref={columnsRef} onMouseUp={onMouseUp}>
              {chapter === 0 && day.coverUrl ? <img className="reading-cover" src={day.coverUrl} alt="" /> : null}
              <h2 className="section-title">
                {section.title}
                {day.youtubeId && section.startSec != null ? (
                  <>
                    {" "}
                    <a
                      className="listen-link"
                      href={youtubeWatchUrl(day.youtubeId, section.startSec)}
                      target="_blank"
                      rel="noreferrer"
                      title="Listen from this section"
                    >
                      ▶ {formatClock(section.startSec)}
                    </a>
                  </>
                ) : null}
              </h2>
              {section.content.map((paragraph, index) => (
                <p key={`${section.id}-${index}`}>
                  {withMarks(paragraph, marks).map((part, partIndex) =>
                    typeof part === "string" ? (
                      part
                    ) : (
                      <mark key={part.key || partIndex}>{part.mark}</mark>
                    ),
                  )}
                </p>
              ))}
            </div>
          </div>
          <footer className="bottom">
            <button type="button" id="prev" onClick={() => move(-1)} disabled={atStart}>
              ← Previous
            </button>
            <span>
              Section {chapter + 1} / {day.sections.length} · {narrow ? "Page " : "Spread "}
              {spreadIndex + 1} / {spreadCount}
              {status && !selection ? ` · ${status}` : ""}
            </span>
            <button type="button" id="next" onClick={() => move(1)} disabled={atEnd}>
              Next →
            </button>
          </footer>
        </div>
      </main>
      <div className={`mobile-side${menuOpen ? " open" : ""}`}>
        {dayJump}
        {nav("mobile-nav")}
      </div>
      {selection ? (
        <HighlightToolbar
          x={selection.x}
          y={selection.y}
          status={status}
          onHighlight={() => void remember()}
          onNote={(note) => void remember(note)}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </div>
  );
}

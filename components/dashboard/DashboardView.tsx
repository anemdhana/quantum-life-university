import Link from "next/link";
import type { DashboardData } from "@/lib/dashboard";
import { readingPath } from "@/lib/series";

export function DashboardView({ data }: { data: DashboardData }) {
  const continueHref = data.progress
    ? readingPath(
        data.progress.seriesSlug,
        data.progress.dayNumber,
        data.progress.language,
        data.progress.sectionOrder ?? 1,
        data.progress.spreadIndex,
      )
    : "/series/devi-navaratrula-jnanam/day/8?lang=te";

  const notes = data.highlights.filter((item) => item.noteText || item.voiceNoteUrl);

  return (
    <div className="uk-grid uk-grid-small uk-child-width-1-2@m" data-uk-grid>
      <section className="uk-card uk-card-default uk-card-body">
        <p className="uk-text-meta">Continue reading</p>
        <h2 className="uk-margin-remove-top">
          {data.progress ? `Day ${data.progress.dayNumber}` : "Day 8"}
        </h2>
        <p className="muted">
          {data.progress?.sectionTitle ?? "Opening Meditation · Anapanasati"}
        </p>
        <Link className="uk-button uk-button-primary" href={continueHref}>
          Resume
        </Link>
      </section>

      <section className="uk-card uk-card-default uk-card-body">
        <p className="uk-text-meta">Highlights</p>
        {data.highlights.length === 0 ? (
          <p className="muted">Select a passage in the reader to keep it here.</p>
        ) : (
          data.highlights.slice(0, 4).map((item) => (
            <blockquote key={item.id} className="passage">
              {item.selectedText}
            </blockquote>
          ))
        )}
        <Link href="/highlights">All highlights</Link>
      </section>

      <section className="uk-card uk-card-default uk-card-body">
        <p className="uk-text-meta">Notes</p>
        {notes.length === 0 ? (
          <p className="muted">Text and voice notes attached to highlights will show here.</p>
        ) : (
          notes.map((item) => (
            <article key={item.id} className="uk-margin-small-bottom">
              {item.noteText ? <p>{item.noteText}</p> : null}
              {item.voiceNoteUrl ? <audio controls src={item.voiceNoteUrl} /> : null}
            </article>
          ))
        )}
      </section>

      <section className="uk-card uk-card-default uk-card-body">
        <p className="uk-text-meta">Bookmarks</p>
        {data.bookmarks.length === 0 ? (
          <p className="muted">Bookmark a section from the reader toolbar.</p>
        ) : (
          <ul className="uk-list">
            {data.bookmarks.map((item) => (
              <li key={item.id}>
                <Link href={`/day/${item.dayNumber}`}>
                  Day {item.dayNumber}
                  {item.sectionTitle ? ` · ${item.sectionTitle}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

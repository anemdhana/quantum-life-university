"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSeries, deleteDay, deleteSeries, renameSeries } from "@/lib/actions/library";
import { readingPath } from "@/lib/series";
import type { LibrarySeries } from "@/types/content";

export function LibraryManager({ library }: { library: LibrarySeries[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("series");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [newSeries, setNewSeries] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(requested ?? library[0]?.slug ?? "");

  useEffect(() => {
    if (requested && library.some((item) => item.slug === requested)) {
      setSelectedSlug(requested);
      return;
    }
    if (!library.some((item) => item.slug === selectedSlug)) {
      setSelectedSlug(library[0]?.slug ?? "");
    }
  }, [library, requested, selectedSlug]);

  const selected = useMemo(
    () => library.find((item) => item.slug === selectedSlug) ?? library[0] ?? null,
    [library, selectedSlug],
  );

  function selectSeries(slug: string) {
    setSelectedSlug(slug);
    router.replace(`/admin?series=${encodeURIComponent(slug)}`, { scroll: false });
  }

  async function run(key: string, work: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(key);
    const result = await work();
    setPending(null);
    setMessage(result.ok ? "Library updated." : result.error ?? "Could not update the library.");
    if (result.ok) router.refresh();
  }

  return (
    <div className="admin-library">
      <aside className="admin-series-nav" aria-label="Series">
        <p className="admin-panel-label">Series</p>
        {library.length === 0 ? <p className="muted">No series yet.</p> : null}
        <ul>
          {library.map((series) => (
            <li key={series.slug}>
              <button
                type="button"
                className={series.slug === selected?.slug ? "active" : undefined}
                onClick={() => selectSeries(series.slug)}
              >
                <strong>{series.name}</strong>
                <span>{series.days.length === 1 ? "1 day" : `${series.days.length} days`}</span>
              </button>
            </li>
          ))}
        </ul>

        <form
          className="admin-new-series"
          onSubmit={(event) => {
            event.preventDefault();
            void run("create", () =>
              createSeries({ name: newSeries }).then((result) => {
                if (result.ok) {
                  setNewSeries("");
                  if (result.slug) selectSeries(result.slug);
                }
                return result;
              }),
            );
          }}
        >
          <label className="uk-form-label" htmlFor="new-series">
            New series
          </label>
          <input
            id="new-series"
            className="uk-input"
            value={newSeries}
            onChange={(event) => setNewSeries(event.target.value)}
            placeholder="Session name"
            required
          />
          <button className="uk-button uk-button-primary uk-button-small uk-width-1-1" type="submit" disabled={pending !== null}>
            Add series
          </button>
        </form>
      </aside>

      <section className="admin-series-panel">
        {message ? <p className="admin-toast">{message}</p> : null}

        {!selected ? (
          <p className="muted">Create a series to start editing readings one by one.</p>
        ) : (
          <>
            <form
              className="admin-series-head"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                void run(`rename-${selected.slug}`, () =>
                  renameSeries({ slug: selected.slug, name: String(data.get("name") ?? "") }),
                );
              }}
            >
              <div>
                <p className="admin-panel-label">Editing series</p>
                <input name="name" className="uk-input admin-series-name" defaultValue={selected.name} key={selected.slug} required />
              </div>
              <div className="admin-series-actions">
                <button className="uk-button uk-button-default uk-button-small" type="submit" disabled={pending !== null}>
                  Save name
                </button>
                <button
                  className="uk-button uk-button-danger uk-button-small"
                  type="button"
                  disabled={pending !== null}
                  onClick={() => {
                    if (!window.confirm(`Remove the whole series “${selected.name}”?`)) return;
                    void run(`delete-series-${selected.slug}`, () => deleteSeries({ slug: selected.slug }));
                  }}
                >
                  Remove series
                </button>
              </div>
            </form>

            {selected.days.length === 0 ? (
              <p className="muted">
                No days yet.{" "}
                <Link href="/admin/prepare">Add a reading</Link> to this series.
              </p>
            ) : (
              <ul className="admin-day-list">
                {selected.days.map((day) => (
                  <li key={day.dayNumber} className="admin-day-row">
                    <div className="admin-day-meta">
                      <span className="admin-day-badge">Day {day.dayNumber}</span>
                      <h2 className={/[\u0C00-\u0C7F]/.test(day.title) ? "lang-te" : undefined}>{day.title}</h2>
                    </div>
                    <div className="admin-day-actions">
                      {day.languages.map((language) => (
                        <Link
                          key={`edit-${selected.slug}-${day.dayNumber}-${language}`}
                          className="uk-button uk-button-primary uk-button-small"
                          href={`/admin/edit/${day.dayNumber}/1?lang=${language}&series=${selected.slug}`}
                        >
                          Edit {language === "te" ? "TE" : "EN"}
                        </Link>
                      ))}
                      {day.languages.map((language) => (
                        <Link
                          key={`read-${selected.slug}-${day.dayNumber}-${language}`}
                          className="admin-text-link"
                          href={readingPath(selected.slug, day.dayNumber, language)}
                        >
                          Preview {language === "te" ? "TE" : "EN"}
                        </Link>
                      ))}
                      <button
                        className="admin-text-danger"
                        type="button"
                        disabled={pending !== null}
                        onClick={() => {
                          if (!window.confirm(`Remove day ${day.dayNumber} from ${selected.name}?`)) return;
                          void run(`delete-day-${selected.slug}-${day.dayNumber}`, () =>
                            deleteDay({ seriesSlug: selected.slug, dayNumber: day.dayNumber }),
                          );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

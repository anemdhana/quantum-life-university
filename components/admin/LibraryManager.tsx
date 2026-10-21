"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSeries, deleteDay, deleteSeries, renameSeries } from "@/lib/actions/library";
import { importJsonReading } from "@/lib/actions/prepare";
import { languageCode, languageLabel, parseLanguage, preferredLanguage } from "@/lib/language";
import { readingPath } from "@/lib/series";
import type { Language, LibraryDay, LibrarySeries } from "@/types/content";

const VERSION_PROMPT = `Can you share me a precise translation of this for readers in the target language?

Upload the source day JSON with this message. Return a downloadable .json with the same shape:
* Keep the same dayNumber, section order, titles translated, startSec, and minutes.
* Set language to "en", "kn", or "hi" (or "te") to match the translation.
* Translate every paragraph precisely — natural complete sentences, no summarizing or inventing.
* Filename like day-NN-en.json / day-NN-kn.json / day-NN-hi.json. File contents = only valid JSON (no markdown fences).`;

function AddVersionModal({
  seriesName,
  seriesSlug,
  dayNumber,
  onClose,
  onImported,
}: {
  seriesName: string;
  seriesSlug: string;
  dayNumber: number;
  onClose: () => void;
  onImported: (language: Language) => void;
}) {
  const [jsonText, setJsonText] = useState("");
  const [jsonName, setJsonName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  async function onFile(file: File | null) {
    if (!file) {
      setJsonText("");
      setJsonName(null);
      return;
    }
    setJsonText((await file.text()).trim());
    setJsonName(file.name);
    setError(null);
  }

  async function onImport() {
    if (!jsonText.trim()) {
      setError("Upload a day .json file (language comes from the JSON or filename).");
      return;
    }
    setPending(true);
    setError(null);
    const data = new FormData();
    data.set("series", seriesName);
    data.set("json", jsonText);
    if (jsonName) data.set("jsonFilename", jsonName);
    data.set("forceDayNumber", String(dayNumber));
    const result = await importJsonReading(data);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onImported(result.language);
    onClose();
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-version-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-head">
          <h2 id="add-version-title">Add version · Day {dayNumber}</h2>
          <button type="button" className="admin-text-link" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted admin-modal-hint">
          Import JSON for <strong>{seriesName}</strong> day {dayNumber}. Language is taken from the file (
          <code>language</code> or name like <code>day-{String(dayNumber).padStart(2, "0")}-en.json</code>).
        </p>
        <div className="admin-modal-prompt">
          <div className="admin-modal-prompt-head">
            <span>ChatGPT hint</span>
            <button
              type="button"
              className="admin-text-link"
              onClick={() => {
                void navigator.clipboard.writeText(VERSION_PROMPT).then(() => {
                  setPromptCopied(true);
                  window.setTimeout(() => setPromptCopied(false), 2000);
                });
              }}
            >
              {promptCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="admin-modal-prompt-text">{VERSION_PROMPT}</pre>
        </div>
        <label className="prepare-file">
          <span>Upload .json</span>
          <input type="file" accept="application/json,.json" onChange={(event) => void onFile(event.target.files?.[0] ?? null)} />
          {jsonName ? <em className="muted">{jsonName} ready</em> : <em className="muted">EN / KN / HI / TE sections JSON</em>}
        </label>
        {error ? <p className="uk-text-danger">{error}</p> : null}
        <div className="admin-modal-actions">
          <button type="button" className="uk-button uk-button-default uk-button-small" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className="uk-button uk-button-primary uk-button-small"
            disabled={pending || !jsonText.trim()}
            onClick={() => void onImport()}
          >
            {pending ? "Importing…" : "Import"}
          </button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Series slug stays <code>{seriesSlug}</code>.
        </p>
      </div>
    </div>
  );
}

function DayRow({
  series,
  day,
  pending,
  onRemove,
  onAddVersion,
}: {
  series: LibrarySeries;
  day: LibraryDay;
  pending: boolean;
  onRemove: (language: Language) => void;
  onAddVersion: () => void;
}) {
  const [lang, setLang] = useState<Language>(() => preferredLanguage(day.languages));

  useEffect(() => {
    if (!day.languages.includes(lang)) {
      setLang(preferredLanguage(day.languages));
    }
  }, [day.languages, lang]);

  const activeLang = day.languages.includes(lang) ? lang : preferredLanguage(day.languages);

  return (
    <li className="admin-day-row">
      <div className="admin-day-meta">
        <span className="admin-day-badge">Day {day.dayNumber}</span>
        <h2 className={/[\u0C00-\u0C7F]/.test(day.title) ? "lang-te" : undefined}>{day.title}</h2>
        <p className="muted admin-day-langs">
          {day.languages.map((item) => languageCode(item)).join(" · ") || "No languages"}
        </p>
      </div>
      <div className="admin-day-tools">
        <div className="admin-day-actions">
          <label className="admin-day-lang">
            <span className="uk-hidden">Language</span>
            <select
              className="uk-select"
              value={activeLang}
              onChange={(event) => setLang(parseLanguage(event.target.value))}
              disabled={day.languages.length === 0}
              aria-label={`Language for day ${day.dayNumber}`}
            >
              {day.languages.map((item) => (
                <option key={item} value={item}>
                  {languageLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <Link
            className="uk-button uk-button-primary uk-button-small"
            href={`/admin/edit/${day.dayNumber}/1?lang=${activeLang}&series=${series.slug}`}
          >
            Edit
          </Link>
          <Link className="admin-text-link" href={readingPath(series.slug, day.dayNumber, activeLang)}>
            Preview
          </Link>
          <button type="button" className="admin-add-lang" disabled={pending} onClick={onAddVersion} title="Add language version from JSON">
            Add version
          </button>
          <button
            className="admin-text-danger"
            type="button"
            disabled={pending || day.languages.length === 0}
            onClick={() => onRemove(activeLang)}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

export function LibraryManager({ library }: { library: LibrarySeries[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("series");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [newSeries, setNewSeries] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(requested ?? library[0]?.slug ?? "");
  const [importDay, setImportDay] = useState<number | null>(null);

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
                  <DayRow
                    key={day.dayNumber}
                    series={selected}
                    day={day}
                    pending={pending !== null}
                    onAddVersion={() => setImportDay(day.dayNumber)}
                    onRemove={(language) => {
                      const label = languageLabel(language);
                      if (
                        !window.confirm(
                          `Remove the ${label} version of day ${day.dayNumber} from ${selected.name}? Other languages stay.`,
                        )
                      ) {
                        return;
                      }
                      void run(`delete-day-${selected.slug}-${day.dayNumber}-${language}`, () =>
                        deleteDay({ seriesSlug: selected.slug, dayNumber: day.dayNumber, language }),
                      );
                    }}
                  />
                ))}
              </ul>
            )}

            {importDay != null ? (
              <AddVersionModal
                seriesName={selected.name}
                seriesSlug={selected.slug}
                dayNumber={importDay}
                onClose={() => setImportDay(null)}
                onImported={(language) => {
                  setMessage(`${languageLabel(language)} version saved for day ${importDay}.`);
                  router.refresh();
                }}
              />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

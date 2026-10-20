"use client";

import { FormEvent, useRef, useState } from "react";
import { downloadYoutubeCaptions, importJsonReading } from "@/lib/actions/prepare";

const CHATGPT_SECTIONS_URL = "https://chatgpt.com/share/6ad732e6-0674-83ec-b0d4-c79458e35d53";

const SAMPLE_JSON = `{
  "title": "Day title",
  "language": "te",
  "sections": [
    {
      "title": "Section title",
      "content": ["First paragraph…", "Second paragraph…"],
      "minutes": 3,
      "startSec": 120
    }
  ]
}`;

const JSON_SHAPE = `{
  "title": "Day title from the talk",
  "language": "te",
  "sections": [
    {
      "title": "Short section title",
      "content": [
        "First complete-sentence paragraph…",
        "Next paragraph…"
      ],
      "minutes": 3,
      "startSec": 120
    }
  ]
}`;

const DEFAULT_FULL_PROMPT = `Need one more JSON for the given captions text.

Requirements:
* 100% spoken-text preservation — keep every spoken word from the captions; do not summarize, shorten, or invent text.
* Natural, complete-sentence section openings — each section and each paragraph must start with a full sentence (not mid-phrase).
* Skip guided meditation / breath-watch / silence / chant-only stretches; keep only the speaker teaching on the day's topic.
* Split into clear topic sections with short Telugu (or English) titles.
* Return a downloadable .json file (or canvas file) named like day-NN-te.json.
* The file contents must be only valid JSON in this shape (no markdown fences, no commentary):

${JSON_SHAPE}

* startSec = whole seconds from the first caption line of that section (from [m:ss] / [h:mm:ss] stamps).
* minutes = rough read time for that section.`;

const DEFAULT_SUMMARY_PROMPT = `Need one more JSON — a summary version of each section from the given day JSON (or captions).

Requirements:
* For every section, write a clear summary of that section's teaching only (not guided meditation).
* Each section's content must fill at least two reader pages (minimum), or more if the topic needs it — use several full paragraphs so a two-page spread is comfortably full, never a short blurb.
* Keep the same section titles and order; keep startSec if present.
* Natural, complete-sentence openings for every section and paragraph.
* Same language as the source (Telugu or English). Do not invent new teachings; compress and clarify what was spoken.
* Recalculate minutes from the summary length.
* Return a downloadable .json file (or canvas file) named like day-NN-te-summary.json.
* The file contents must be only valid JSON in this shape (no markdown fences, no commentary):

${JSON_SHAPE}
`;

type Prepared = { order: number; title: string; minutes: number };
type PromptKind = "full" | "summary";

function saveFile(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function jsonDownloadName(raw: string) {
  try {
    const data = JSON.parse(raw) as { dayNumber?: unknown; language?: unknown; title?: unknown };
    const day =
      typeof data.dayNumber === "number" && Number.isInteger(data.dayNumber)
        ? `day-${String(data.dayNumber).padStart(2, "0")}`
        : "day";
    const lang = data.language === "en" || data.language === "te" ? data.language : "te";
    return `${day}-${lang}.json`;
  } catch {
    return "sections.json";
  }
}

export function PrepareForm({ seriesNames }: { seriesNames: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sections, setSections] = useState<Prepared[]>([]);
  const [href, setHref] = useState<string | null>(null);
  const [editHref, setEditHref] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [fullPrompt, setFullPrompt] = useState(DEFAULT_FULL_PROMPT);
  const [summaryPrompt, setSummaryPrompt] = useState(DEFAULT_SUMMARY_PROMPT);
  const [pending, setPending] = useState<"import" | "captions" | null>(null);
  const [promptCopied, setPromptCopied] = useState<PromptKind | null>(null);

  async function onImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("import");
    const data = new FormData(event.currentTarget);
    data.set("json", jsonText);
    const result = await importJsonReading(data);
    setPending(null);
    if (!result.ok) {
      setMessage(result.error);
      setSections([]);
      setHref(null);
      setEditHref(null);
      return;
    }
    setSections(result.sections);
    setHref(result.href);
    setEditHref(result.editHref);
    setMessage(
      `${result.seriesName} · Day ${result.dayNumber} saved with ${result.sections.length} sections. Open Edit sections to refine.`,
    );
  }

  async function onDownloadCaptions() {
    const form = formRef.current;
    if (!form) return;
    const youtube = String(new FormData(form).get("youtube") ?? "");
    const language = String(new FormData(form).get("language") ?? "te") === "en" ? "en" : "te";
    setPending("captions");
    const result = await downloadYoutubeCaptions({ youtube, language });
    setPending(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    saveFile(result.filename, result.text, "text/plain;charset=utf-8");
    setMessage(
      `Downloaded ${result.cueCount} caption lines (${result.filename}). Upload that file in ChatGPT, then paste or upload the JSON below.`,
    );
  }

  function onDownloadJson() {
    const raw = jsonText.trim();
    if (!raw) {
      setMessage("Paste or upload JSON first, then download.");
      return;
    }
    let body = raw;
    try {
      body = `${JSON.stringify(JSON.parse(raw), null, 2)}\n`;
    } catch {
      setMessage("JSON is not valid — fix it before downloading.");
      return;
    }
    const filename = jsonDownloadName(raw);
    saveFile(filename, body, "application/json;charset=utf-8");
    setMessage(`Downloaded ${filename}.`);
  }

  async function onJsonFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setJsonText(text.trim());
  }

  async function onCopyPrompt(kind: PromptKind) {
    const text = kind === "full" ? fullPrompt : summaryPrompt;
    try {
      await navigator.clipboard.writeText(text);
      setPromptCopied(kind);
      window.setTimeout(() => setPromptCopied(null), 2000);
    } catch {
      setMessage("Could not copy. Select the prompt text and copy manually.");
    }
  }

  return (
    <form ref={formRef} className="prepare-board" onSubmit={(event) => void onImport(event)}>
      <p className="prepare-steps muted">
        1. Captions · 2. Copy prompt +{" "}
        <a href={CHATGPT_SECTIONS_URL} target="_blank" rel="noreferrer">
          ChatGPT
        </a>{" "}
        · 3. JSON · 4. Import · 5. Edit
      </p>

      <section className="prepare-tile">
        <h2>Reading</h2>
        <div className="prepare-fields">
          <label className="prepare-span-2">
            <span>Series</span>
            <input
              id="series"
              name="series"
              className="uk-input"
              list="series-names"
              required
              defaultValue="Devi Navaratrula Jnanam"
              placeholder="Devi Navaratrula Jnanam"
            />
            <datalist id="series-names">
              {seriesNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label>
            <span>Day</span>
            <input id="day" name="day" className="uk-input" type="number" min={1} max={31} required defaultValue={1} />
          </label>
          <label>
            <span>Language</span>
            <select id="language" name="language" className="uk-select" defaultValue="te">
              <option value="te">Telugu</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="prepare-span-2">
            <span>Title</span>
            <input id="title" name="title" className="uk-input" placeholder="Optional if in JSON" />
          </label>
          <label className="prepare-span-2">
            <span>Opening image</span>
            <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
          </label>
        </div>
      </section>

      <section className="prepare-tile">
        <h2>Captions</h2>
        <div className="prepare-fields">
          <label className="prepare-span-2">
            <span>YouTube ID or URL</span>
            <input id="youtube" name="youtube" className="uk-input" placeholder="dQw4w9WgXcQ or https://youtu.be/…" />
          </label>
        </div>
        <div className="prepare-actions">
          <button className="uk-button uk-button-default uk-button-small" type="button" disabled={pending !== null} onClick={() => void onDownloadCaptions()}>
            {pending === "captions" ? "Downloading…" : "Download captions"}
          </button>
          <a className="uk-button uk-button-default uk-button-small" href={CHATGPT_SECTIONS_URL} target="_blank" rel="noreferrer">
            Open ChatGPT
          </a>
        </div>
      </section>

      <section className="prepare-tile">
        <div className="prepare-tile-head">
          <h2>Full prompt</h2>
          <div className="prepare-actions">
            <button className="uk-button uk-button-default uk-button-small" type="button" onClick={() => void onCopyPrompt("full")}>
              {promptCopied === "full" ? "Copied" : "Copy"}
            </button>
            <button className="uk-button uk-button-text uk-button-small" type="button" onClick={() => setFullPrompt(DEFAULT_FULL_PROMPT)}>
              Reset
            </button>
          </div>
        </div>
        <p className="prepare-hint muted">Captions → full JSON. Attach the .txt in ChatGPT.</p>
        <textarea
          id="chatgpt-prompt-full"
          className="uk-textarea prepare-prompt"
          rows={7}
          value={fullPrompt}
          onChange={(event) => setFullPrompt(event.target.value)}
        />
      </section>

      <section className="prepare-tile">
        <div className="prepare-tile-head">
          <h2>Summary prompt</h2>
          <div className="prepare-actions">
            <button className="uk-button uk-button-default uk-button-small" type="button" onClick={() => void onCopyPrompt("summary")}>
              {promptCopied === "summary" ? "Copied" : "Copy"}
            </button>
            <button className="uk-button uk-button-text uk-button-small" type="button" onClick={() => setSummaryPrompt(DEFAULT_SUMMARY_PROMPT)}>
              Reset
            </button>
          </div>
        </div>
        <p className="prepare-hint muted">Day JSON → 2+ page summaries per section.</p>
        <textarea
          id="chatgpt-prompt-summary"
          className="uk-textarea prepare-prompt"
          rows={7}
          value={summaryPrompt}
          onChange={(event) => setSummaryPrompt(event.target.value)}
        />
      </section>

      <section className="prepare-tile prepare-tile-wide">
        <div className="prepare-tile-head">
          <h2>Import JSON</h2>
          <div className="prepare-actions">
            <button className="uk-button uk-button-primary uk-button-small" type="submit" disabled={pending !== null}>
              {pending === "import" ? "Importing…" : "Import"}
            </button>
            <button className="uk-button uk-button-default uk-button-small" type="button" disabled={!jsonText.trim()} onClick={onDownloadJson}>
              Download
            </button>
          </div>
        </div>
        <div className="prepare-json-grid">
          <label>
            <span>Upload file</span>
            <input
              id="json-file"
              type="file"
              accept="application/json,.json,text/plain"
              onChange={(event) => void onJsonFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="prepare-json-paste">
            <span>Or paste JSON</span>
            <textarea
              id="json"
              className="uk-textarea lang-te"
              rows={8}
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              placeholder={SAMPLE_JSON}
              required
            />
          </label>
        </div>
      </section>

      {(message || href || sections.length > 0) && (
        <section className="prepare-tile prepare-tile-wide prepare-result">
          {message ? <p className="prepare-message">{message}</p> : null}
          {href ? (
            <p className="prepare-links">
              {editHref ? (
                <>
                  <a href={editHref}>Edit sections</a>
                  <span aria-hidden="true">·</span>
                </>
              ) : null}
              <a href={href}>Open reading</a>
            </p>
          ) : null}
          {sections.length > 0 ? (
            <ul className="prepare-section-chips">
              {sections.map((section) => (
                <li key={`${section.order}-${section.title}`}>
                  <span>{section.order}</span>
                  {section.title}
                  <em>~{section.minutes}m</em>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}
    </form>
  );
}

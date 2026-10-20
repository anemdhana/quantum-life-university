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
* Return a downloadable .json file (or canvas file) named like day-NN-te.json — not only inline chat text.
* The file contents must be only valid JSON in this shape (no markdown fences, no commentary):

${JSON_SHAPE}

* startSec = whole seconds from the first caption line of that section (from [m:ss] / [h:mm:ss] stamps).
* minutes = rough read time for that section.
* Upload / paste the captions file after this prompt.`;

const DEFAULT_SUMMARY_PROMPT = `Need one more JSON — a summary version of each section from the given day JSON (or captions).

Requirements:
* For every section, write a clear summary of that section's teaching only (not guided meditation).
* Each section's content must fill at least two reader pages (minimum), or more if the topic needs it — use several full paragraphs so a two-page spread is comfortably full, never a short blurb.
* Keep the same section titles and order; keep startSec if present.
* Natural, complete-sentence openings for every section and paragraph.
* Same language as the source (Telugu or English). Do not invent new teachings; compress and clarify what was spoken.
* Recalculate minutes from the summary length.
* Return a downloadable .json file (or canvas file) named like day-NN-te-summary.json — not only inline chat text.
* The file contents must be only valid JSON in this shape (no markdown fences, no commentary):

${JSON_SHAPE}

* Paste the full sections JSON (or captions) after this prompt.`;

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
    <div>
      <p className="muted uk-margin-small-bottom">
        1. Download captions · 2. Edit/copy a prompt + open{" "}
        <a href={CHATGPT_SECTIONS_URL} target="_blank" rel="noreferrer">
          ChatGPT
        </a>{" "}
        · 3. Paste or download JSON · 4. Import · 5. Edit sections.
      </p>

      <form
        ref={formRef}
        className="uk-card uk-card-default uk-card-body"
        onSubmit={(event) => void onImport(event)}
      >
        <label className="uk-form-label" htmlFor="series">
          Series
        </label>
        <input
          id="series"
          name="series"
          className="uk-input uk-margin-small-bottom"
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

        <div className="uk-grid uk-grid-small uk-child-width-1-2@s" data-uk-grid>
          <div>
            <label className="uk-form-label" htmlFor="day">
              Day
            </label>
            <input id="day" name="day" className="uk-input" type="number" min={1} max={31} required defaultValue={1} />
          </div>
          <div>
            <label className="uk-form-label" htmlFor="title">
              Title
            </label>
            <input id="title" name="title" className="uk-input" placeholder="Optional if title is in JSON" />
          </div>
        </div>

        <label className="uk-form-label uk-margin-small-top" htmlFor="image">
          Opening image
        </label>
        <input id="image" name="image" className="uk-margin-small-bottom" type="file" accept="image/jpeg,image/png,image/webp" />

        <div className="uk-grid uk-grid-small uk-child-width-1-2@s" data-uk-grid>
          <div>
            <label className="uk-form-label" htmlFor="youtube">
              YouTube ID or URL
            </label>
            <input id="youtube" name="youtube" className="uk-input" placeholder="dQw4w9WgXcQ or https://youtu.be/…" />
          </div>
          <div>
            <label className="uk-form-label" htmlFor="language">
              Caption language
            </label>
            <select id="language" name="language" className="uk-select" defaultValue="te">
              <option value="te">Telugu</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="uk-margin-small-top">
          <button
            className="uk-button uk-button-default"
            type="button"
            disabled={pending !== null}
            onClick={() => void onDownloadCaptions()}
          >
            {pending === "captions" ? "Downloading…" : "Download captions"}
          </button>{" "}
          <a className="uk-button uk-button-default" href={CHATGPT_SECTIONS_URL} target="_blank" rel="noreferrer">
            Open ChatGPT
          </a>
        </div>

        <label className="uk-form-label uk-margin-top" htmlFor="chatgpt-prompt-full">
          Prompt · full captions → JSON
        </label>
        <p className="muted uk-margin-remove-top">Edit if needed, copy, then attach the captions <code>.txt</code> in ChatGPT.</p>
        <textarea
          id="chatgpt-prompt-full"
          className="uk-textarea"
          rows={10}
          value={fullPrompt}
          onChange={(event) => setFullPrompt(event.target.value)}
        />
        <div className="uk-margin-small-top">
          <button className="uk-button uk-button-default" type="button" onClick={() => void onCopyPrompt("full")}>
            {promptCopied === "full" ? "Copied" : "Copy full prompt"}
          </button>{" "}
          <button
            className="uk-button uk-button-default"
            type="button"
            onClick={() => setFullPrompt(DEFAULT_FULL_PROMPT)}
          >
            Reset
          </button>
        </div>

        <label className="uk-form-label uk-margin-top" htmlFor="chatgpt-prompt-summary">
          Prompt · section summaries (2+ pages each)
        </label>
        <p className="muted uk-margin-remove-top">Edit if needed, copy, then paste the day JSON (or captions) in ChatGPT.</p>
        <textarea
          id="chatgpt-prompt-summary"
          className="uk-textarea"
          rows={10}
          value={summaryPrompt}
          onChange={(event) => setSummaryPrompt(event.target.value)}
        />
        <div className="uk-margin-small-top">
          <button className="uk-button uk-button-default" type="button" onClick={() => void onCopyPrompt("summary")}>
            {promptCopied === "summary" ? "Copied" : "Copy summary prompt"}
          </button>{" "}
          <button
            className="uk-button uk-button-default"
            type="button"
            onClick={() => setSummaryPrompt(DEFAULT_SUMMARY_PROMPT)}
          >
            Reset
          </button>
        </div>

        <label className="uk-form-label uk-margin-top" htmlFor="json-file">
          Sections JSON file
        </label>
        <input
          id="json-file"
          className="uk-margin-small-bottom"
          type="file"
          accept="application/json,.json,text/plain"
          onChange={(event) => void onJsonFile(event.target.files?.[0] ?? null)}
        />

        <label className="uk-form-label" htmlFor="json">
          Or paste JSON
        </label>
        <textarea
          id="json"
          className="uk-textarea lang-te"
          rows={14}
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          placeholder={SAMPLE_JSON}
          required
        />

        <div className="uk-margin-small-top">
          <button className="uk-button uk-button-primary" type="submit" disabled={pending !== null}>
            {pending === "import" ? "Importing…" : "Import JSON"}
          </button>{" "}
          <button
            className="uk-button uk-button-default"
            type="button"
            disabled={!jsonText.trim()}
            onClick={onDownloadJson}
          >
            Download JSON
          </button>
        </div>
      </form>

      {message ? <p>{message}</p> : null}
      {href ? (
        <p>
          {editHref ? (
            <>
              <a href={editHref}>Edit sections</a>
              {" · "}
            </>
          ) : null}
          <a href={href}>Open reading</a>
        </p>
      ) : null}
      {sections.length > 0 ? (
        <ol className="uk-list uk-list-decimal">
          {sections.map((section) => (
            <li key={`${section.order}-${section.title}`}>
              {section.title} <span className="muted">~{section.minutes} min</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

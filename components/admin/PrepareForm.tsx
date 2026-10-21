"use client";

import { FormEvent, useRef, useState } from "react";
import { downloadYoutubeCaptions, downloadYoutubePlaylistCaptions, importJsonReading } from "@/lib/actions/prepare";

const CHATGPT_SECTIONS_URL = "https://chatgpt.com/share/6ad732e6-0674-83ec-b0d4-c79458e35d53";

const JSON_SHAPE = `{
  "dayNumber": 1,
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

* dayNumber = programme day (1–31). language = "te" or "en".
* startSec = whole seconds from the first caption line of that section (from [m:ss] / [h:mm:ss] stamps).
* minutes = rough read time for that section.`;

const DEFAULT_SUMMARY_PROMPT = `Need one more JSON — a summary version of each section from the given day JSON (or captions).

Requirements:
* For every section, write a clear summary of that section's teaching only (not guided meditation).
* Each section's content must fill at least two reader pages (minimum), or more if the topic needs it — use several full paragraphs so a two-page spread is comfortably full, never a short blurb.
* Keep the same section titles and order; keep startSec if present.
* Keep dayNumber, title, and language from the source day JSON.
* Natural, complete-sentence openings for every section and paragraph.
* Same language as the source (Telugu or English). Do not invent new teachings; compress and clarify what was spoken.
* Recalculate minutes from the summary length.
* Return a downloadable .json file (or canvas file) named like day-NN-te-summary.json.
* The file contents must be only valid JSON in this shape (no markdown fences, no commentary):

${JSON_SHAPE}
`;

type Prepared = { order: number; title: string; minutes: number };
type PromptKind = "full" | "summary";
type CaptionLang = "te" | "en";

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

function previewFromJson(raw: string, filename: string | null) {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const day =
      typeof data.dayNumber === "number"
        ? data.dayNumber
        : typeof data.day === "number"
          ? data.day
          : filename?.match(/day[_-]?(\d{1,2})/i)?.[1];
    const language = data.language === "en" || data.language === "te" ? data.language : filename?.match(/(?:^|[_\-.])(te|en)(?:[_\-.]|$)/i)?.[1];
    const title = typeof data.title === "string" ? data.title : null;
    const parts = [
      day != null ? `Day ${day}` : null,
      language ? String(language).toUpperCase() : null,
      title,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  } catch {
    return null;
  }
}

export function PrepareForm({ seriesNames }: { seriesNames: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sections, setSections] = useState<Prepared[]>([]);
  const [href, setHref] = useState<string | null>(null);
  const [editHref, setEditHref] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [jsonName, setJsonName] = useState<string | null>(null);
  const [jsonPreview, setJsonPreview] = useState<string | null>(null);
  const [captionLang, setCaptionLang] = useState<CaptionLang>("te");
  const [fullPrompt, setFullPrompt] = useState(DEFAULT_FULL_PROMPT);
  const [summaryPrompt, setSummaryPrompt] = useState(DEFAULT_SUMMARY_PROMPT);
  const [promptTab, setPromptTab] = useState<PromptKind>("full");
  const [pending, setPending] = useState<"import" | "captions" | "playlist" | null>(null);
  const [promptCopied, setPromptCopied] = useState<PromptKind | null>(null);

  async function onImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jsonText.trim()) {
      setMessage("Upload a .json file first.");
      return;
    }
    setPending("import");
    const data = new FormData(event.currentTarget);
    data.set("json", jsonText);
    if (jsonName) data.set("jsonFilename", jsonName);
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
      `${result.seriesName} · Day ${result.dayNumber} · ${result.language.toUpperCase()} saved with ${result.sections.length} sections.`,
    );
  }

  function saveBase64File(filename: string, base64: string, mime: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function onDownloadCaptions() {
    const form = formRef.current;
    if (!form) return;
    const youtube = String(new FormData(form).get("youtube") ?? "");
    setPending("captions");
    const result = await downloadYoutubeCaptions({ youtube, language: captionLang });
    setPending(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    saveFile(result.filename, result.text, "text/plain;charset=utf-8");
    setMessage(
      `Downloaded ${result.cueCount} caption lines (${result.filename}). Upload that file in ChatGPT, then import the JSON on the right.`,
    );
  }

  async function onDownloadPlaylistCaptions() {
    const form = formRef.current;
    if (!form) return;
    const playlist = String(new FormData(form).get("playlist") ?? "");
    setPending("playlist");
    const result = await downloadYoutubePlaylistCaptions({ playlist, language: captionLang });
    setPending(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    saveBase64File(result.filename, result.zipBase64, "application/zip");
    const failNote = result.failCount ? ` · ${result.failCount} skipped (see _failures.txt)` : "";
    setMessage(
      `Downloaded playlist zip (${result.okCount}/${result.videoCount} videos, ${result.cueTotal} cue lines)${failNote}.`,
    );
  }

  function onDownloadJson() {
    const raw = jsonText.trim();
    if (!raw) {
      setMessage("Upload a .json file first, then download.");
      return;
    }
    let body = raw;
    try {
      body = `${JSON.stringify(JSON.parse(raw), null, 2)}\n`;
    } catch {
      setMessage("JSON is not valid — fix the file before downloading.");
      return;
    }
    const filename = jsonName?.endsWith(".json") ? jsonName : jsonDownloadName(raw);
    saveFile(filename.endsWith(".json") ? filename : `${filename}.json`, body, "application/json;charset=utf-8");
    setMessage(`Downloaded ${filename.endsWith(".json") ? filename : `${filename}.json`}.`);
  }

  async function onJsonFile(file: File | null) {
    if (!file) {
      setJsonText("");
      setJsonName(null);
      setJsonPreview(null);
      return;
    }
    const text = await file.text();
    const trimmed = text.trim();
    const preview = previewFromJson(trimmed, file.name);
    setJsonText(trimmed);
    setJsonName(file.name);
    setJsonPreview(preview);
    setMessage(`Loaded ${file.name}${preview ? ` · ${preview}` : ""}.`);
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
      <div className="prepare-pane prepare-pane-left">
        <p className="prepare-steps muted">
          Captions → prompt +{" "}
          <a href={CHATGPT_SECTIONS_URL} target="_blank" rel="noreferrer">
            ChatGPT
          </a>{" "}
          → import JSON on the right
        </p>

        <section className="prepare-tile">
          <h2>Captions</h2>
          <div className="prepare-fields">
            <label>
              <span>Caption language</span>
              <select
                id="caption-language"
                className="uk-select"
                value={captionLang}
                onChange={(event) => setCaptionLang(event.target.value === "en" ? "en" : "te")}
              >
                <option value="te">Telugu</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="prepare-span-2">
              <span>YouTube video ID or URL</span>
              <input id="youtube" name="youtube" className="uk-input" placeholder="dQw4w9WgXcQ or https://youtu.be/…" />
            </label>
            <label className="prepare-span-2">
              <span>Playlist ID or URL</span>
              <input
                id="playlist"
                name="playlist"
                className="uk-input"
                placeholder="PLxxxx… or https://www.youtube.com/playlist?list=…"
              />
            </label>
          </div>
          <div className="prepare-actions">
            <button
              className="uk-button uk-button-default uk-button-small"
              type="button"
              disabled={pending !== null}
              onClick={() => void onDownloadCaptions()}
            >
              {pending === "captions" ? "Downloading…" : "Download video captions"}
            </button>
            <button
              className="uk-button uk-button-default uk-button-small"
              type="button"
              disabled={pending !== null}
              onClick={() => void onDownloadPlaylistCaptions()}
            >
              {pending === "playlist" ? "Zipping playlist…" : "Download playlist zip"}
            </button>
            <a className="uk-button uk-button-default uk-button-small" href={CHATGPT_SECTIONS_URL} target="_blank" rel="noreferrer">
              Open ChatGPT
            </a>
          </div>
        </section>

        <section className="prepare-tile prepare-prompts">
          <div className="prepare-tile-head">
            <div className="prepare-prompt-tabs" role="tablist" aria-label="Prompt type">
              <button
                type="button"
                role="tab"
                aria-selected={promptTab === "full"}
                className={promptTab === "full" ? "active" : undefined}
                onClick={() => setPromptTab("full")}
              >
                Full prompt
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={promptTab === "summary"}
                className={promptTab === "summary" ? "active" : undefined}
                onClick={() => setPromptTab("summary")}
              >
                Summary prompt
              </button>
            </div>
            <div className="prepare-actions">
              <button
                className="uk-button uk-button-default uk-button-small"
                type="button"
                onClick={() => void onCopyPrompt(promptTab)}
              >
                {promptCopied === promptTab ? "Copied" : "Copy"}
              </button>
              <button
                className="uk-button uk-button-text uk-button-small"
                type="button"
                onClick={() =>
                  promptTab === "full" ? setFullPrompt(DEFAULT_FULL_PROMPT) : setSummaryPrompt(DEFAULT_SUMMARY_PROMPT)
                }
              >
                Reset
              </button>
            </div>
          </div>
          <p className="prepare-hint muted">
            {promptTab === "full" ? "Captions → full JSON (include dayNumber + language)" : "Day JSON → 2+ page summaries"}
          </p>
          {promptTab === "full" ? (
            <textarea
              id="chatgpt-prompt-full"
              className="uk-textarea prepare-prompt"
              rows={8}
              value={fullPrompt}
              onChange={(event) => setFullPrompt(event.target.value)}
            />
          ) : (
            <textarea
              id="chatgpt-prompt-summary"
              className="uk-textarea prepare-prompt"
              rows={8}
              value={summaryPrompt}
              onChange={(event) => setSummaryPrompt(event.target.value)}
            />
          )}
        </section>
      </div>

      <aside className="prepare-pane prepare-pane-right">
        <section className="prepare-tile prepare-import">
          <div className="prepare-tile-head">
            <h2>Import JSON</h2>
            <div className="prepare-actions">
              <button
                className="uk-button uk-button-primary uk-button-small"
                type="submit"
                disabled={pending !== null || !jsonText.trim()}
              >
                {pending === "import" ? "Importing…" : "Import"}
              </button>
              <button
                className="uk-button uk-button-default uk-button-small"
                type="button"
                disabled={!jsonText.trim()}
                onClick={onDownloadJson}
              >
                Download
              </button>
            </div>
          </div>
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
            <label className="prepare-span-2">
              <span>Opening image (optional)</span>
              <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
            </label>
            <label className="prepare-span-2 prepare-file">
              <span>Upload .json</span>
              <input
                id="json-file"
                type="file"
                accept="application/json,.json"
                onChange={(event) => void onJsonFile(event.target.files?.[0] ?? null)}
              />
              {jsonName ? (
                <em className="muted">
                  {jsonName} ready
                  {jsonPreview ? ` · ${jsonPreview}` : ""}
                </em>
              ) : (
                <em className="muted">Day, title, and language come from the JSON (or filename like day-01-te.json)</em>
              )}
            </label>
          </div>
        </section>

        <section className="prepare-tile prepare-result">
          <h2>Loaded sections</h2>
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
            <ul className="prepare-section-list">
              {sections.map((section) => (
                <li key={`${section.order}-${section.title}`}>
                  <span>{String(section.order).padStart(2, "0")}</span>
                  <strong>{section.title}</strong>
                  <em>~{section.minutes}m</em>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted prepare-empty">Import a JSON file to see sections here.</p>
          )}
        </section>
      </aside>
    </form>
  );
}

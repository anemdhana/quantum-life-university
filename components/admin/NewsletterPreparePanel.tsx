"use client";

import { useMemo, useState } from "react";
import { defaultCoverageRange } from "@/lib/newsletter/coverage";
import { firstNewsletterPdfPrompt, followUpNewsletterPdfPrompt } from "@/lib/newsletter/prompts";

type PromptKind = "first" | "followup";

const CHATGPT_URL = "https://chatgpt.com/";

export function NewsletterPreparePanel() {
  const defaults = useMemo(() => defaultCoverageRange(), []);
  const [takenOnFrom, setTakenOnFrom] = useState(defaults.takenOnFrom);
  const [takenOnTo, setTakenOnTo] = useState(defaults.takenOnTo);
  const [issueMonth, setIssueMonth] = useState(defaults.issueMonth);
  const [allAssets, setAllAssets] = useState(false);
  const [promptKind, setPromptKind] = useState<PromptKind>("first");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const prompt = useMemo(() => {
    const args = {
      issueMonth,
      takenOnFrom: allAssets ? undefined : takenOnFrom,
      takenOnTo: allAssets ? undefined : takenOnTo,
    };
    return promptKind === "first" ? firstNewsletterPdfPrompt(args) : followUpNewsletterPdfPrompt(args);
  }, [allAssets, issueMonth, promptKind, takenOnFrom, takenOnTo]);

  function exportHref() {
    const params = new URLSearchParams();
    params.set("issueMonth", issueMonth);
    if (allAssets) {
      params.set("all", "1");
    } else {
      params.set("takenOnFrom", takenOnFrom);
      params.set("takenOnTo", takenOnTo);
    }
    return `/api/admin/newsletter/export?${params.toString()}`;
  }

  async function onCopyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Could not copy. Select the prompt text and copy manually.");
    }
  }

  return (
    <section className="prepare-tile newsletter-prepare">
      <div className="newsletter-prepare-head">
        <div>
          <h2>Prepare PDF (ChatGPT)</h2>
          <p className="prepare-hint muted">
            Layout comes from section and photo instructions. Download the zip, copy the prompt, attach files in
            ChatGPT.
          </p>
        </div>
        <a className="uk-button uk-button-default uk-button-small" href={CHATGPT_URL} target="_blank" rel="noreferrer">
          Open ChatGPT
        </a>
      </div>

      <div className="newsletter-prepare-fields">
        <label className="newsletter-field">
          <span>Issue month (PDF name)</span>
          <input className="uk-input" type="month" value={issueMonth} onChange={(event) => setIssueMonth(event.target.value)} />
        </label>
        <label className="newsletter-field">
          <span>Date taken from</span>
          <input
            className="uk-input"
            type="date"
            value={takenOnFrom}
            disabled={allAssets}
            onChange={(event) => setTakenOnFrom(event.target.value)}
          />
        </label>
        <label className="newsletter-field">
          <span>Date taken to</span>
          <input
            className="uk-input"
            type="date"
            value={takenOnTo}
            disabled={allAssets}
            onChange={(event) => setTakenOnTo(event.target.value)}
          />
        </label>
        <label className="newsletter-all-check">
          <input type="checkbox" checked={allAssets} onChange={(event) => setAllAssets(event.target.checked)} />
          <span>Export all global assets (ignore date range)</span>
        </label>
      </div>

      <div className="newsletter-prepare-actions">
        <a
          className="uk-button uk-button-primary uk-button-small"
          href={exportHref()}
          onClick={() => setMessage("Downloading resource zip…")}
        >
          Download resources (.md + images)
        </a>
        <span className="muted">Includes look-and-feel, brief, layout directives, section markdown, and images.</span>
      </div>

      <div className="newsletter-prompt-tabs" role="tablist" aria-label="Prompt type">
        <button
          type="button"
          role="tab"
          aria-selected={promptKind === "first"}
          className={promptKind === "first" ? "active" : undefined}
          onClick={() => setPromptKind("first")}
        >
          First PDF (full prompt)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={promptKind === "followup"}
          className={promptKind === "followup" ? "active" : undefined}
          onClick={() => setPromptKind("followup")}
        >
          Next month (short)
        </button>
        <button type="button" className="admin-text-link" onClick={() => void onCopyPrompt()}>
          {copied ? "Copied" : "Copy prompt"}
        </button>
      </div>

      <p className="muted newsletter-prompt-hint">
        {promptKind === "first"
          ? "New ChatGPT chat: attach the zip (include 02-LAYOUT-DIRECTIVES.md), then paste this prompt."
          : "Same ChatGPT project: attach this month’s sections + images + 02-LAYOUT-DIRECTIVES.md."}
      </p>

      <textarea className="uk-textarea newsletter-prompt-box" rows={12} readOnly value={prompt} />
      {message ? <p className="muted">{message}</p> : null}
    </section>
  );
}

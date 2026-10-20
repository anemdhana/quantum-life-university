"use client";

import { useState } from "react";
import { VoiceNoteRecorder } from "@/components/reader/VoiceNoteRecorder";

type Props = {
  x: number;
  y: number;
  status: string | null;
  onHighlight: () => void;
  onNote: (note: string) => void;
  onClose: () => void;
};

export function HighlightToolbar({ x, y, status, onHighlight, onNote, onClose }: Props) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div className="hl-toolbar" style={{ left: x, top: y }} role="toolbar" aria-label="Passage tools">
      <button type="button" className="uk-button uk-button-primary uk-button-small" onClick={onHighlight}>
        Highlight
      </button>
      <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => setNoteOpen((open) => !open)}>
        Add note
      </button>
      <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => setVoiceOpen((open) => !open)}>
        Voice
      </button>
      <button type="button" className="uk-button uk-button-text uk-button-small" onClick={onClose}>
        Close
      </button>
      {noteOpen ? (
        <form
          className="uk-width-1-1"
          onSubmit={(event) => {
            event.preventDefault();
            onNote(note.trim());
          }}
        >
          <textarea className="uk-textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note for this passage" />
          <button type="submit" className="uk-button uk-button-primary uk-button-small uk-margin-small-top">
            Save note
          </button>
        </form>
      ) : null}
      {voiceOpen ? <VoiceNoteRecorder /> : null}
      {status ? <p className="hl-note uk-width-1-1">{status}</p> : null}
    </div>
  );
}

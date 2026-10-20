"use client";

import { useRef, useState } from "react";

export function VoiceNoteRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function toggle() {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("This browser cannot record audio.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      setAudioUrl(URL.createObjectURL(blob));
      setMessage("Recorded in this browser. Upload starts once Supabase Storage is connected.");
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setMessage(null);
  }

  return (
    <div className="uk-width-1-1">
      <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => void toggle()}>
        {recording ? "Stop" : "Voice note"}
      </button>
      {audioUrl ? <audio className="uk-margin-small-top" controls src={audioUrl} /> : null}
      {message ? <p className="hl-note">{message}</p> : null}
    </div>
  );
}

export type CaptionCue = {
  startSec: number;
  text: string;
};

type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
  kind?: string;
  name?: string;
};

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function cleanCaptionText(value: string) {
  return decodeEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseXmlCaptions(xml: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  const classic = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  let match: RegExpExecArray | null;
  while ((match = classic.exec(xml))) {
    const startMatch = match[1].match(/\bstart="([0-9.]+)"/i);
    if (!startMatch) continue;
    const text = cleanCaptionText(match[2]);
    if (!text) continue;
    cues.push({ startSec: Number(startMatch[1]), text });
  }
  if (cues.length) return cues;

  // srv3 / timedtext format="3": <p t="ms" d="ms">...</p>
  const paragraphs = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  while ((match = paragraphs.exec(xml))) {
    const startMatch = match[1].match(/\bt="(\d+)"/i);
    if (!startMatch) continue;
    const text = cleanCaptionText(match[2]);
    if (!text) continue;
    cues.push({ startSec: Number(startMatch[1]) / 1000, text });
  }
  return cues;
}

function parseJson3Captions(payload: unknown): CaptionCue[] {
  if (!payload || typeof payload !== "object" || !("events" in payload)) return [];
  const events = (payload as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];
  return events.flatMap((event) => {
    if (!event || typeof event !== "object") return [];
    const record = event as { tStartMs?: unknown; segs?: unknown };
    if (typeof record.tStartMs !== "number" || !Array.isArray(record.segs)) return [];
    const text = cleanCaptionText(
      record.segs
        .map((seg) => (seg && typeof seg === "object" && "utf8" in seg ? String((seg as { utf8: unknown }).utf8 ?? "") : ""))
        .join(""),
    );
    if (!text || text === "\n") return [];
    return [{ startSec: record.tStartMs / 1000, text }];
  });
}

function tracksFromPlayer(player: unknown): CaptionTrack[] {
  if (!player || typeof player !== "object") return [];
  const captions = (player as { captions?: unknown }).captions;
  if (!captions || typeof captions !== "object") return [];
  const list = (captions as { playerCaptionsTracklistRenderer?: { captionTracks?: unknown } })
    .playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as {
      baseUrl?: unknown;
      languageCode?: unknown;
      kind?: unknown;
      name?: { simpleText?: unknown } | string;
    };
    if (typeof record.baseUrl !== "string" || typeof record.languageCode !== "string") return [];
    const name =
      typeof record.name === "string"
        ? record.name
        : typeof record.name?.simpleText === "string"
          ? record.name.simpleText
          : undefined;
    return [
      {
        baseUrl: record.baseUrl.replace(/\\u0026/g, "&").replace(/&amp;/g, "&"),
        languageCode: record.languageCode.toLowerCase(),
        kind: typeof record.kind === "string" ? record.kind : undefined,
        name,
      },
    ];
  });
}

function pickTrack(tracks: CaptionTrack[], preferredLang: "te" | "en") {
  const aliases = preferredLang === "te" ? ["te", "tel", "te-in"] : ["en", "en-us", "en-gb", "en-in"];
  const ranked = [...tracks].sort((a, b) => {
    const aPref = aliases.some((code) => a.languageCode === code || a.languageCode.startsWith(`${code}-`)) ? 0 : 1;
    const bPref = aliases.some((code) => b.languageCode === code || b.languageCode.startsWith(`${code}-`)) ? 0 : 1;
    if (aPref !== bPref) return aPref - bPref;
    const aManual = a.kind === "asr" ? 1 : 0;
    const bManual = b.kind === "asr" ? 1 : 0;
    return aManual - bManual;
  });
  return ranked[0] ?? null;
}

const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip";

async function fetchPlayer(videoId: string, preferredLang: "te" | "en") {
  const response = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": ANDROID_UA,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "20.10.38",
          hl: preferredLang,
          gl: preferredLang === "te" ? "IN" : "US",
        },
      },
      videoId,
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not open the YouTube player API (${response.status}).`);
  }
  return (await response.json()) as unknown;
}

async function downloadTrack(baseUrl: string): Promise<CaptionCue[]> {
  const formats = ["fmt=json3", "fmt=srv3", ""];
  for (const format of formats) {
    const url = format ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${format}` : baseUrl;
    const response = await fetch(url, {
      headers: {
        "User-Agent": ANDROID_UA,
        "Accept-Language": "en,te;q=0.8",
      },
    });
    if (!response.ok) continue;
    const body = await response.text();
    if (!body.trim()) continue;

    if (body.trim().startsWith("{")) {
      try {
        const cues = parseJson3Captions(JSON.parse(body) as unknown);
        if (cues.length) return cues;
      } catch {
        // try XML parsers below
      }
    }

    const cues = parseXmlCaptions(body);
    if (cues.length) return cues;
  }
  return [];
}

export async function fetchYoutubeCaptions(videoId: string, preferredLang: "te" | "en"): Promise<CaptionCue[]> {
  const player = await fetchPlayer(videoId, preferredLang);
  const playability =
    player && typeof player === "object" && "playabilityStatus" in player
      ? (player as { playabilityStatus?: { status?: string; reason?: string } }).playabilityStatus
      : undefined;
  if (playability?.status && playability.status !== "OK") {
    throw new Error(playability.reason || `YouTube will not play that video (${playability.status}).`);
  }

  const tracks = tracksFromPlayer(player);
  if (tracks.length === 0) {
    throw new Error("No captions were found on that video. Turn on subtitles on YouTube, then try again.");
  }

  const track = pickTrack(tracks, preferredLang);
  if (!track) throw new Error("No matching caption track was found.");
  const cues = await downloadTrack(track.baseUrl);
  if (cues.length === 0) {
    throw new Error(
      "The caption track downloaded empty. Auto-captions sometimes need a few minutes after upload — try again shortly.",
    );
  }
  return cues;
}

/** Timed caption lines for ChatGPT / download — no character cap. */
export function captionsAsText(cues: CaptionCue[]): string {
  return cues
    .map((cue) => {
      const total = Math.max(0, Math.floor(cue.startSec));
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = String(total % 60).padStart(2, "0");
      const clock =
        hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
      return `[${clock}] ${cue.text}`;
    })
    .join("\n");
}

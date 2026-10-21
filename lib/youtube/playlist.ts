export type PlaylistVideo = {
  videoId: string;
  title: string;
  index: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function walk(node: unknown, visit: (item: Record<string, unknown>) => void) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  const record = asRecord(node);
  if (!record) return;
  visit(record);
  for (const value of Object.values(record)) walk(value, visit);
}

function continuationToken(payload: unknown): string | null {
  let token: string | null = null;
  walk(payload, (item) => {
    if (token) return;
    const endpoint = asRecord(item.continuationEndpoint) ?? asRecord(item.nextContinuationData);
    const command = endpoint ? asRecord(endpoint.continuationCommand) : null;
    if (command && typeof command.token === "string") {
      token = command.token;
      return;
    }
    if (typeof item.token === "string" && (item.clickTrackingParams || item.continuation)) {
      token = item.token;
    }
  });
  return token;
}

function titleFromRuns(titleObj: Record<string, unknown> | null): string | null {
  if (!titleObj) return null;
  if (typeof titleObj.simpleText === "string") return titleObj.simpleText;
  const runs = Array.isArray(titleObj.runs) ? titleObj.runs : null;
  const first = runs?.[0] ? asRecord(runs[0]) : null;
  return first && typeof first.text === "string" ? first.text : null;
}

function videosFromPayload(payload: unknown): PlaylistVideo[] {
  const found: PlaylistVideo[] = [];
  const seen = new Set<string>();

  const push = (videoId: string, title: string) => {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId) || seen.has(videoId)) return;
    seen.add(videoId);
    found.push({ videoId, title: title || videoId, index: found.length + 1 });
  };

  walk(payload, (item) => {
    const classic = asRecord(item.playlistVideoRenderer);
    if (classic && typeof classic.videoId === "string") {
      push(classic.videoId, titleFromRuns(asRecord(classic.title)) ?? classic.videoId);
      return;
    }

    // Newer WEB playlist cards
    const lockup = asRecord(item.lockupViewModel);
    if (lockup) {
      const contentId = typeof lockup.contentId === "string" ? lockup.contentId : null;
      const meta = asRecord(lockup.metadata);
      const lockupMetadata = meta ? asRecord(meta.lockupMetadataViewModel) : null;
      const title =
        titleFromRuns(lockupMetadata ? asRecord(lockupMetadata.title) : null) ||
        (typeof lockup.accessibilityText === "string" ? lockup.accessibilityText : null) ||
        contentId;
      if (contentId) push(contentId, title ?? contentId);
    }
  });

  return found;
}

const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip";
const WEB_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function browsePlaylist(body: Record<string, unknown>, userAgent: string) {
  const response = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": userAgent,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Could not open the YouTube playlist API (${response.status}).`);
  }
  return (await response.json()) as unknown;
}

function androidContext(preferredLang: "te" | "en") {
  return {
    client: {
      clientName: "ANDROID",
      clientVersion: "20.10.38",
      hl: preferredLang,
      gl: preferredLang === "te" ? "IN" : "US",
    },
  };
}

function webContext(preferredLang: "te" | "en") {
  return {
    client: {
      clientName: "WEB",
      clientVersion: "2.20240304.00.00",
      hl: preferredLang,
      gl: preferredLang === "te" ? "IN" : "US",
    },
  };
}

async function collectFromBrowse(
  playlistId: string,
  preferredLang: "te" | "en",
  maxVideos: number,
  mode: "android" | "web",
): Promise<PlaylistVideo[]> {
  const context = mode === "android" ? androidContext(preferredLang) : webContext(preferredLang);
  const userAgent = mode === "android" ? ANDROID_UA : WEB_UA;
  let payload = await browsePlaylist({ context, browseId: `VL${playlistId}` }, userAgent);

  const videos: PlaylistVideo[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < 20 && videos.length < maxVideos; page += 1) {
    for (const item of videosFromPayload(payload)) {
      if (seen.has(item.videoId)) continue;
      seen.add(item.videoId);
      videos.push({ ...item, index: videos.length + 1 });
      if (videos.length >= maxVideos) break;
    }

    const token = continuationToken(payload);
    if (!token || videos.length >= maxVideos) break;

    payload = await browsePlaylist({ context, continuation: token }, userAgent);
  }

  return videos;
}

async function collectFromHtml(playlistId: string, maxVideos: number): Promise<PlaylistVideo[]> {
  const response = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`, {
    headers: {
      "User-Agent": WEB_UA,
      "Accept-Language": "en,te;q=0.8",
    },
  });
  if (!response.ok) return [];
  const html = await response.text();
  const match = html.match(/ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!match) return [];
  try {
    const data = JSON.parse(match[1]) as unknown;
    return videosFromPayload(data).slice(0, maxVideos).map((item, index) => ({ ...item, index: index + 1 }));
  } catch {
    return [];
  }
}

/** Resolve videos in a playlist (follows continuations, capped for safety). */
export async function fetchPlaylistVideos(
  playlistId: string,
  preferredLang: "te" | "en" = "te",
  maxVideos = 80,
): Promise<PlaylistVideo[]> {
  // ANDROID still returns classic playlistVideoRenderer; WEB often uses lockupViewModel only.
  let videos = await collectFromBrowse(playlistId, preferredLang, maxVideos, "android");
  if (!videos.length) {
    videos = await collectFromBrowse(playlistId, preferredLang, maxVideos, "web");
  }
  if (!videos.length) {
    videos = await collectFromHtml(playlistId, maxVideos);
  }

  if (!videos.length) {
    throw new Error("No videos found in that playlist. Check the playlist ID and that it is public.");
  }
  return videos;
}

export function parseYoutubePlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z0-9_-]{10,80}$/.test(trimmed) && /^(PL|UU|LL|FL|OL|RD|TL)/.test(trimmed)) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const list = url.searchParams.get("list");
    if (list && /^[A-Za-z0-9_-]{10,80}$/.test(list)) return list;
  } catch {
    // fall through
  }
  const match = trimmed.match(/[?&]list=([A-Za-z0-9_-]{10,80})/);
  return match?.[1] ?? null;
}

export function safeCaptionFilename(index: number, videoId: string, title: string, language: string) {
  const order = String(index).padStart(2, "0");
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const label = slug || "video";
  return `${order}-${videoId}-${label}-${language}-captions.txt`;
}

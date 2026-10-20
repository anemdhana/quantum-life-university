export function asParagraphs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") {
      const text = item.trim();
      return text ? [text] : [];
    }
    if (item && typeof item === "object" && "text" in item && typeof (item as { text: unknown }).text === "string") {
      const text = (item as { text: string }).text.trim();
      return text ? [text] : [];
    }
    return [];
  });
}

export function parseYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0]?.slice(0, 11);
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    const fromQuery = url.searchParams.get("v");
    if (fromQuery && /^[a-zA-Z0-9_-]{11}$/.test(fromQuery)) return fromQuery;
  } catch {
    // fall through
  }
  const match = trimmed.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

export function youtubeWatchUrl(videoId: string, startSec?: number | null) {
  const base = `https://www.youtube.com/watch?v=${videoId}`;
  if (startSec == null || startSec <= 0) return base;
  return `${base}&t=${Math.floor(startSec)}s`;
}

export function formatClock(startSec: number) {
  const total = Math.max(0, Math.floor(startSec));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

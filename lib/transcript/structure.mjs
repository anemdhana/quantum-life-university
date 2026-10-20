import { createHash } from "node:crypto";
import chapters from "./day-7-chapters.json" with { type: "json" };

export const DAY7_CHAPTERS = chapters;

export function collapseTranscript(raw) {
  return raw.replace(/\s+/g, " ").trim();
}

export function cleanSlice(raw) {
  return raw
    .replace(/(?:(?:ఓం|ఓ|ఆ)\s*){3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toParagraphs(text) {
  const sentences = text
    .split(/(?<=[.?!।])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);

  const paragraphs = [];
  let buffer = "";
  for (const sentence of sentences) {
    const next = buffer ? `${buffer} ${sentence}` : sentence;
    if (buffer && next.length > 520) {
      paragraphs.push(buffer);
      buffer = sentence;
    } else {
      buffer = next;
    }
  }
  if (buffer) paragraphs.push(buffer);
  return paragraphs;
}

export function minutesFor(paragraphs) {
  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 150));
}

export function sectionId(seriesSlug, dayNumber, language, sectionOrder) {
  const hash = createHash("sha256")
    .update(`reading-${seriesSlug}-day-${dayNumber}-${language}-${sectionOrder}`)
    .digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

function sentenceEnd(text, index) {
  const look = text.slice(index, Math.min(text.length, index + 280));
  const match = look.match(/[.?!।]/);
  if (!match || match.index === undefined) return Math.min(text.length, index);
  let end = index + match.index + 1;
  while (text[end] === " ") end += 1;
  if (end > 0 && text[end - 1] !== " " && text[end] && text[end] !== " ") {
    const space = text.indexOf(" ", end);
    if (space !== -1 && space - end < 48) return space + 1;
  }
  return end;
}

export function structureWithPlan(raw, plan) {
  const text = collapseTranscript(raw);
  const starts = plan.map((chapter, index) => (index === 0 ? 0 : sentenceEnd(text, chapter.from)));
  return plan.map((chapter, index) => {
    const start = starts[index];
    const end = index + 1 < starts.length ? starts[index + 1] : text.length;
    let slice = cleanSlice(text.slice(start, end));
    if (/^[\u0C00-\u0C03\u0C3E-\u0C4D\u0C55\u0C56]/.test(slice)) {
      const space = slice.indexOf(" ");
      if (space > 0) slice = slice.slice(space + 1);
    }
    const firstSpace = slice.indexOf(" ");
    const firstWord = firstSpace > 0 ? slice.slice(0, firstSpace) : "";
    if (firstWord.length > 0 && firstWord.length <= 8 && firstWord.includes("\u0C4D")) {
      slice = slice.slice(firstSpace + 1);
    }
    const content = toParagraphs(slice);
    const paragraphs = content.length > 0 ? content : [slice];
    return {
      sectionOrder: index + 1,
      title: chapter.title,
      content: paragraphs,
      minutes: minutesFor(paragraphs),
    };
  });
}

export function structureBalanced(raw, count = 8) {
  const text = cleanSlice(collapseTranscript(raw));
  const size = Math.ceil(text.length / count);
  const plan = Array.from({ length: count }, (_, index) => {
    const from = index * size;
    const slice = text.slice(from, from + size);
    const title = slice.split(/[.?!।]/)[0]?.trim().slice(0, 42) || `విభాగం ${index + 1}`;
    return { title, from, to: from + size };
  });
  return structureWithPlan(text, plan);
}

export function isDay7Transcript(raw) {
  return raw.includes("నవరాత్రుల్లో ఏడవ రోజు") && raw.includes("567");
}

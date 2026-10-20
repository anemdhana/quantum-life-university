import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DAY7_CHAPTERS, isDay7Transcript, sectionId, structureWithPlan } from "../lib/transcript/structure.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const transcriptPath = path.join(
  root,
  "..",
  "9-Day-Devi-Navaratri-Dr-Newton",
  "Transcripts",
  "day-7-youtube_transcript_TlWBXJ5zkfs.txt",
);
const transcript = fs.readFileSync(transcriptPath, "utf8");
if (!isDay7Transcript(transcript)) {
  throw new Error("This file is not the Day 7 Devi Navaratrula Jnanam transcript.");
}

const sections = structureWithPlan(transcript, DAY7_CHAPTERS).map((section) => ({
  id: sectionId("devi-navaratrula-jnanam", 7, "te", section.sectionOrder),
  ...section,
}));

const day = {
  dayNumber: 7,
  language: "te",
  series: "navaratri",
  title: "దేవీ నవరాత్రుల జ్ఞానం",
  subtitle: "సప్తమి · Day 7",
  sections,
};

const contentDir = path.join(root, "content");
fs.mkdirSync(contentDir, { recursive: true });
fs.writeFileSync(path.join(contentDir, "day-07-te.json"), JSON.stringify(day, null, 2) + "\n");

function dollar(tag, value) {
  return `$${tag}$${value}$${tag}$`;
}

const lines = [
  "-- Day 7 Telugu, Devi Navaratrula Jnanam. Safe to re-run.",
  "insert into public.days (day_number, title, subtitle, language, published)",
  `values (7, ${dollar("d7title", day.title)}, ${dollar("d7sub", day.subtitle)}, 'te', true)`,
  "on conflict (day_number, language) do update",
  "set title = excluded.title, subtitle = excluded.subtitle, published = excluded.published;",
  "",
];

for (const section of sections) {
  const tag = `d7s${section.sectionOrder}`;
  lines.push("insert into public.sections (id, day_id, section_order, title, content, minutes)");
  lines.push("select");
  lines.push(`  '${section.id}'::uuid,`);
  lines.push("  d.id,");
  lines.push(`  ${section.sectionOrder},`);
  lines.push(`  ${dollar(`${tag}t`, section.title)},`);
  lines.push(`  ${dollar(`${tag}j`, JSON.stringify(section.content))}::jsonb,`);
  lines.push(`  ${section.minutes}`);
  lines.push("from public.days d");
  lines.push("where d.day_number = 7 and d.language = 'te'");
  lines.push("on conflict (day_id, section_order) do update");
  lines.push("set id = excluded.id, title = excluded.title, content = excluded.content, minutes = excluded.minutes, updated_at = now();");
  lines.push("");
}

fs.writeFileSync(path.join(root, "supabase", "seed-day7.sql"), lines.join("\n"));

for (const section of sections) {
  console.log(
    String(section.sectionOrder).padStart(2, "0"),
    section.title,
    section.content.length,
    "paras",
    section.minutes,
    "min",
  );
}

/**
 * Upsert Telugu days 1–7 from content/day-0N-te.json into Supabase.
 * Usage: node scripts/push-devi-te.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(resolve(process.cwd(), ".env.local"));
loadEnv(resolve(process.cwd(), ".env"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SERVICE_ROLE_KEY");
  process.exit(1);
}

const SERIES = "devi-navaratrula-jnanam";
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: series, error: seriesError } = await supabase
  .from("series")
  .select("id")
  .eq("slug", SERIES)
  .maybeSingle();
if (seriesError || !series) {
  console.error(seriesError?.message || "Series not found");
  process.exit(1);
}

const contentDir = resolve(process.cwd(), "content");
const files = readdirSync(contentDir)
  .filter((name) => /^day-0[1-7]-te\.json$/.test(name))
  .sort();

for (const file of files) {
  const day = JSON.parse(readFileSync(resolve(contentDir, file), "utf8"));
  const { data: dayRow, error: dayError } = await supabase
    .from("days")
    .upsert(
      {
        series_id: series.id,
        day_number: day.dayNumber,
        language: "te",
        title: day.title,
        subtitle: day.subtitle,
        published: true,
      },
      { onConflict: "series_id,day_number,language" },
    )
    .select("id")
    .single();
  if (dayError) {
    console.error(file, dayError.message);
    process.exit(1);
  }

  const { error: pruneError } = await supabase
    .from("sections")
    .delete()
    .eq("day_id", dayRow.id)
    .gt("section_order", day.sections.length);
  if (pruneError) {
    console.error(`prune ${file}:`, pruneError.message);
    process.exit(1);
  }

  for (const section of day.sections) {
    const { error: secError } = await supabase.from("sections").upsert(
      {
        id: section.id,
        day_id: dayRow.id,
        section_order: section.sectionOrder,
        title: section.title,
        content: section.content,
        minutes: section.minutes,
      },
      { onConflict: "day_id,section_order" },
    );
    if (secError) {
      console.error(`${file} s${section.sectionOrder}:`, secError.message);
      process.exit(1);
    }
  }
  console.log(
    `day ${day.dayNumber} te: ${day.title} · ${day.sections.length} sections · ${day.sections.map((s) => s.title).join(" | ")}`,
  );
}

console.log("Done.");

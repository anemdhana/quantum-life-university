/**
 * Set proper day titles for Devi Navaratrula Jnanam (EN + TE where present).
 * Usage: node scripts/set-devi-day-titles.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
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
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const SERIES = "devi-navaratrula-jnanam";

/** Thematic titles from each day's core teaching (not generic Jnanodayam). */
const EN = {
  1: "Bathukamma · The Asura and the Hara Centre",
  2: "The Empty Vessel · Shakti and Chaitanya",
  3: "Sura and Asura · Svara and Apasvara",
  4: "Cause, Symbol, and a New Birth",
  5: "Two Navaratris · Aham and Sarvam",
  6: "Parashakti · Mahishasura Mardini",
  7: "The Sword of Knowledge · Sumbha and Nisumbha",
  8: "Devi Shakti · Nature and the Power of Words",
  9: "The First Principle · Shakti, Chaitanya, Knowledge",
  10: "Vijayadashami — Divine Shakti, Self-Knowledge, and Spiritual Practice",
};

const TE = {
  1: "బతుకమ్మ · అసురుడు · హర కేంద్రం",
  2: "ఖాళీ పాత్ర · శక్తి · చైతన్యం",
  3: "సుర · అసుర · స్వర · అపస్వర",
  4: "కారణం · సంకేతం · నూతన జన్మ",
  5: "రెండు నవరాత్రులు · అహం · సర్వం",
  6: "పరాశక్తి · మహిషాసుర మర్దిని",
  7: "జ్ఞాన ఖడ్గం · శుంభ నిశుంభులు",
  8: "దేవీ శక్తి · ప్రకృతి · మాటల ప్రభావం",
  9: "నవరాత్రుల తొమ్మిదవ రోజు — దేవీ శక్తి, జ్ఞానదృష్టి మరియు అంతర్యాత్ర",
  10: "విజయదశమి — దేవీ శక్తి, ఆత్మజ్ఞానం మరియు సాధన",
};

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

const { data: days, error: daysError } = await supabase
  .from("days")
  .select("id, day_number, language, title")
  .eq("series_id", series.id)
  .order("day_number");

if (daysError) {
  console.error(daysError.message);
  process.exit(1);
}

let updated = 0;
for (const day of days ?? []) {
  const map = day.language === "te" ? TE : EN;
  const title = map[day.day_number];
  if (!title || title === day.title) {
    console.log(`skip day ${day.day_number} (${day.language}): ${day.title}`);
    continue;
  }
  const { error } = await supabase.from("days").update({ title }).eq("id", day.id);
  if (error) {
    console.error(`fail day ${day.day_number} ${day.language}:`, error.message);
    process.exit(1);
  }
  console.log(`day ${day.day_number} (${day.language}): ${day.title} → ${title}`);
  updated += 1;
}

console.log(`Done. Updated ${updated} row(s).`);

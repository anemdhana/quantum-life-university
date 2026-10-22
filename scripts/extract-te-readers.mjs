/**
 * Import Telugu Devi Navaratrula Jnanam readers (days 1–7) into content/*.json
 * and supabase/seed-devi-te.sql. Day 8 is skipped (already curated).
 *
 * Replaces generic nav titles like "ప్రవచన పఠనం · భాగం 2" with thematic titles.
 *
 * Usage:
 *   node scripts/extract-te-readers.mjs
 *   node scripts/extract-te-readers.mjs --from "C:/path/to/Devi_Navaratri_Telugu_Readers_Days_01_to_08"
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERIES_SLUG = "devi-navaratrula-jnanam";
const SERIES_NAME = "Devi Navaratrula Jnanam";

const DAY_TITLES = {
  1: "బతుకమ్మ · అసురుడు · హర కేంద్రం",
  2: "ఖాళీ పాత్ర · శక్తి · చైతన్యం",
  3: "సుర · అసుర · స్వర · అపస్వర",
  4: "కారణం · సంకేతం · నూతన జన్మ",
  5: "రెండు నవరాత్రులు · అహం · సర్వం",
  6: "పరాశక్తి · మహిషాసుర మర్దిని",
  7: "జ్ఞాన ఖడ్గం · శుంభ నిశుంభులు",
};

/** Thematic section titles — replaces generic "ప్రవచన పఠనం · భాగం N". */
const SECTION_TITLES = {
  1: [
    "ధ్యాన ప్రారంభం · ఆనాపానసతి",
    "హర కేంద్రం · నిమజ్జనం",
    "నవావరణలు · త్రిగుణాలు",
    "సాధకుల రాత్రులు · బతుకమ్మ",
    "మహిషాసుర మర్దిని స్తోత్రం",
    "శరీరం · నిద్ర · నియమం",
    "ప్రశ్నలు · ముగింపు",
  ],
  2: [
    "ధ్యాన ప్రారంభం · ఖాళీ పాత్ర",
    "శక్తి · చైతన్యం · మూడు మాతలు",
    "లక్ష్మీ ముద్ర · అంతర్ముఖం",
    "నాడులు · ఎరుపు రంగు",
    "దేవీ సమర్పణ · తొమ్మిది శ్వాసలు",
    "సెలబ్రేషన్ · ఎంజాయ్మెంట్ కాదు",
    "అనుభవాలు · సంకేతాలు",
  ],
  3: [
    "ధ్యాన ప్రారంభం · సహస్రార సంకల్పం",
    "సుర · అసుర · త్రిగుణాలు",
    "జగన్మాత · మూడు మాతలు",
    "సురత్వం · మనసు ఉపవాసం",
    "ఆత్మ తృప్తి · జీవిత లక్ష్యం",
    "దేవీ సమర్పణ · శ్రీం",
    "కార్యకారణం · అనుభవాలు",
  ],
  4: [
    "ధ్యాన ప్రారంభం · శ్వాస · సహస్రారం",
    "రంభ · కరంభ · ఐహిక వాంఛలు",
    "మనసు · ఇంద్రుడు · మాయ",
    "పుత్ర · ద్విజ · స్పష్టత",
    "హల్వా · కమలం · వాసనలు",
    "మురికి వస్త్రం · సంస్కారాలు",
    "దేవీ సమర్పణ · తొమ్మిది రౌండ్లు",
  ],
  5: [
    "ధ్యాన ప్రారంభం · సహస్రార పిరమిడ్",
    "రెండు నవరాత్రులు · రంభ · కరంభ",
    "సంకేత కథలు · పుత్రకామేష్టి",
    "అరిషడ్వర్గాలు · ఆరు రాయభారులు",
    "అంతఃశత్రువులు · మోహం",
    "దేవీ సమర్పణ · శ్రీం",
    "అనుభవాలు · ప్రశ్నలు",
  ],
  6: [
    "ధ్యాన ప్రారంభం · ఖాళీ పాత్ర",
    "మహిషాసురుడు · మేరు శిఖరం",
    "పద్దెనిమిది బాహువులు · అంతఃశత్రువులు",
    "శక్తి అనుభవాలు · తురీయం",
    "దేవీ సమర్పణ · శరణాగతి",
    "సాయుజ్యం · త్రిశూలం",
    "అనుభవాలు · సహ-సృష్టి",
  ],
  7: [
    "ధ్యాన ప్రారంభం · ఆనాపానసతి",
    "శుంభ నిశుంభులు · విశ్వాసం · సమర్పణ",
    "మమకారం · బంధనం · ప్రేమ",
    "తృప్తి · రక్తబీజుడు · బ్లాక్స్",
    "అవధూతలు · మోక్ష జ్ఞానం",
    "నచికేత విద్య · ప్రశ్నలు",
    "అంతఃశత్రువులు · ముగింపు",
  ],
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readerDir = path.join(root, "Swadhyaya", "9-Day-Devi-Navaratri-Dr-Newton");

const fromArg = process.argv.indexOf("--from");
const sourceDir =
  fromArg >= 0 && process.argv[fromArg + 1]
    ? path.resolve(process.argv[fromArg + 1])
    : "C:/Users/dhana/Downloads/Devi_Navaratri_Telugu_Readers_Days_01_to_08";

function sectionId(dayNumber, language, sectionOrder) {
  const hash = createHash("sha256")
    .update(`reading-${SERIES_SLUG}-day-${dayNumber}-${language}-${sectionOrder}`)
    .digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

function extractChapters(html, file) {
  const marker = "const chapters=";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`${file}: chapters array not found`);
  const jsonStart = start + marker.length;
  const navAt = html.indexOf("const nav=", jsonStart);
  if (navAt < 0) throw new Error(`${file}: nav marker not found`);
  const end = html.lastIndexOf("];", navAt);
  if (end < 0) throw new Error(`${file}: end of chapters array not found`);
  return JSON.parse(html.slice(jsonStart, end + 1));
}

function dollar(tag, value) {
  if (String(value).includes(`$${tag}$`)) {
    throw new Error(`dollar tag collision: ${tag}`);
  }
  return `$${tag}$${value}$${tag}$`;
}

function isGenericTitle(title) {
  return /ప్రవచన\s*పఠనం|భాగం\s*\d+/i.test(title || "");
}

function resolveTitle(dayNumber, index, rawTitle) {
  const mapped = SECTION_TITLES[dayNumber]?.[index];
  if (mapped) return mapped;
  if (rawTitle && !isGenericTitle(rawTitle)) return rawTitle;
  return `విభాగం ${index + 1}`;
}

if (!fs.existsSync(sourceDir)) {
  console.error(`Source folder not found: ${sourceDir}`);
  process.exit(1);
}

fs.mkdirSync(readerDir, { recursive: true });

const days = [];
for (let dayNumber = 1; dayNumber <= 7; dayNumber += 1) {
  const srcName = `day-${String(dayNumber).padStart(2, "0")}-two-page-reader.html`;
  const srcPath = path.join(sourceDir, srcName);
  if (!fs.existsSync(srcPath)) {
    console.warn(`skip missing ${srcName}`);
    continue;
  }

  let html = fs.readFileSync(srcPath, "utf8");
  const chapters = extractChapters(html, srcName);
  const titles = chapters.map((chapter, index) => resolveTitle(dayNumber, index, chapter.title));

  // Patch chapter titles in HTML so left-nav matches.
  const patched = chapters.map((chapter, index) => ({ ...chapter, title: titles[index] }));
  const marker = "const chapters=";
  const start = html.indexOf(marker) + marker.length;
  const navAt = html.indexOf("const nav=", start);
  const end = html.lastIndexOf("];", navAt);
  html = `${html.slice(0, start)}${JSON.stringify(patched)};${html.slice(end + 2)}`;

  // Prefer series branding over programme-only "జ్ఞానోదయం" in the sidebar.
  html = html
    .replace(/<h2>జ్ఞానోదయం<\/h2>/, `<h2>${DAY_TITLES[dayNumber]}</h2>`)
    .replace(
      /<title>జ్ఞానోదయం · Day \d+ · Two-page reader<\/title>/,
      `<title>దేవీ నవరాత్రుల జ్ఞానం · Day ${dayNumber} · తెలుగు</title>`,
    );

  const destName = `day-${String(dayNumber).padStart(2, "0")}-te.html`;
  fs.writeFileSync(path.join(readerDir, destName), html);
  console.log(`copied Swadhyaya/.../${destName} (${patched.length} sections)`);

  days.push({
    dayNumber,
    language: "te",
    series: SERIES_SLUG,
    title: DAY_TITLES[dayNumber],
    subtitle: `దేవీ నవరాత్రులు · Day ${dayNumber}`,
    sections: patched.map((chapter, index) => ({
      id: sectionId(dayNumber, "te", index + 1),
      sectionOrder: index + 1,
      title: chapter.title,
      content: chapter.paras,
      minutes: chapter.minutes ?? null,
    })),
  });
}

const contentDir = path.join(root, "content");
fs.mkdirSync(contentDir, { recursive: true });
for (const day of days) {
  const filename = `day-${String(day.dayNumber).padStart(2, "0")}-te.json`;
  fs.writeFileSync(path.join(contentDir, filename), `${JSON.stringify(day, null, 2)}\n`);
  console.log(`wrote content/${filename}`);
}

const sql = [];
sql.push("-- Generated by scripts/extract-te-readers.mjs");
sql.push(`-- Telugu days 1–7 for ${SERIES_NAME} (${SERIES_SLUG}). Day 8 is in seed.sql / content/day-08-te.json.`);
sql.push("");
sql.push(`insert into public.series (slug, name)`);
sql.push(`values ('${SERIES_SLUG}', ${dollar("seriesname", SERIES_NAME)})`);
sql.push(`on conflict (slug) do update set name = excluded.name;`);
sql.push("");

for (const day of days) {
  const tag = `d${day.dayNumber}te`;
  sql.push(`insert into public.days (series_id, day_number, title, subtitle, language, published)`);
  sql.push(
    `select s.id, ${day.dayNumber}, ${dollar(`${tag}title`, day.title)}, ${dollar(`${tag}sub`, day.subtitle)}, 'te', true`,
  );
  sql.push(`from public.series s`);
  sql.push(`where s.slug = '${SERIES_SLUG}'`);
  sql.push(`on conflict (series_id, day_number, language) do update`);
  sql.push(`set title = excluded.title, subtitle = excluded.subtitle, published = excluded.published;`);
  sql.push("");

  // Drop leftover sections if the new day has fewer parts than a prior seed.
  sql.push(`delete from public.sections sec`);
  sql.push(`using public.days d`);
  sql.push(`join public.series s on s.id = d.series_id`);
  sql.push(`where sec.day_id = d.id`);
  sql.push(`  and s.slug = '${SERIES_SLUG}'`);
  sql.push(`  and d.day_number = ${day.dayNumber}`);
  sql.push(`  and d.language = 'te'`);
  sql.push(`  and sec.section_order > ${day.sections.length};`);
  sql.push("");

  day.sections.forEach((section) => {
    const stag = `${tag}s${section.sectionOrder}`;
    sql.push(`insert into public.sections (id, day_id, section_order, title, content, minutes)`);
    sql.push(`select`);
    sql.push(`  '${section.id}'::uuid,`);
    sql.push(`  d.id,`);
    sql.push(`  ${section.sectionOrder},`);
    sql.push(`  ${dollar(`${stag}title`, section.title)},`);
    sql.push(`  ${dollar(`${stag}json`, JSON.stringify(section.content))}::jsonb,`);
    sql.push(`  ${section.minutes ?? "null"}`);
    sql.push(`from public.days d`);
    sql.push(`join public.series s on s.id = d.series_id`);
    sql.push(
      `where s.slug = '${SERIES_SLUG}' and d.day_number = ${day.dayNumber} and d.language = 'te'`,
    );
    sql.push(`on conflict (day_id, section_order) do update`);
    sql.push(
      `set id = excluded.id, title = excluded.title, content = excluded.content, minutes = excluded.minutes, updated_at = now();`,
    );
    sql.push("");
  });
}

const outSql = path.join(root, "supabase", "seed-devi-te.sql");
fs.writeFileSync(outSql, sql.join("\n"));
console.log(`wrote supabase/seed-devi-te.sql (${days.length} days)`);
console.log("Skipped day 8 (already curated).");

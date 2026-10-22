#!/usr/bin/env python3
"""
Export a Self Knowledge Reading series from the local Supabase DB
into static two-page reader HTML files (Swadhyaya-style).

Prompts (with defaults):
  • Series name   — e.g. Devi Navaratrula Jnanam
  • Output folder — e.g. Swadhyaya/9-Day-Devi-Navaratri-Dr-Newton
  • Language      — en / te / all

Usage (from repo root):
  python scripts/export_series_html.py
  python scripts/export_series_html.py --all
  python scripts/export_series_html.py --series "Devi Navaratrula Jnanam" --lang all --out Swadhyaya/9-Day-Devi-Navaratri-Dr-Newton

Requires: Kong/API up (NEXT_PUBLIC_SUPABASE_URL) and ANON_KEY or SERVICE_ROLE_KEY in .env.
Optional: pip install psycopg[binary]  — then POSTGRES_PASSWORD can be used as a fallback.
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SERIES = "Devi Navaratrula Jnanam"
DEFAULT_OUT = ROOT / "Swadhyaya" / "9-Day-Devi-Navaratri-Dr-Newton"

READER_CSS = r"""
:root{--paper:#fffdf8;--ink:#352d26;--gold:#a17b43;--line:#e8dfd0}*{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden}body{background:var(--paper);color:var(--ink);font-family:'Source Sans 3',sans-serif}.app{display:grid;grid-template-columns:220px minmax(0,1fr);height:100dvh}.side{background:#f6f1e8;border-right:1px solid var(--line);overflow-y:auto;padding:15px 8px}.brand{display:block;font:600 10px system-ui;letter-spacing:.12em;color:var(--gold);padding:5px 9px;text-decoration:none}.day-jump{display:flex;flex-wrap:wrap;gap:4px;margin:8px 6px 4px}.day-jump a{display:inline-flex;align-items:center;justify-content:center;font:600 10px system-ui;color:#6b4a25;text-decoration:none;border:1px solid #dbcbb6;background:#fffdf8;border-radius:5px;padding:0 6px;min-height:22px;line-height:20px}.day-jump a:hover{background:#e9dcc5}.side h2{font:600 19px 'Libre Baskerville',serif;margin:4px 9px 2px}.sub{font-size:11px;color:#7c6e5d;margin:0 9px 13px}.nav{padding:0;margin:0;list-style:none}.nav button{width:100%;text-align:left;border:0;background:transparent;color:#514538;display:flex;gap:8px;align-items:flex-start;padding:8px 9px;border-radius:6px;font:400 12px/1.5 'Noto Sans Telugu',sans-serif;cursor:pointer}.nav button:hover,.nav button.active{background:#e9dcc5;color:#5e421f}.nav button.active{font-weight:700;box-shadow:inset 3px 0 0 var(--gold)}.nav button.active .n{font-weight:800}.nav button.active small{font-weight:600}.nav .n{font:600 10px system-ui;color:var(--gold);padding-top:3px}.nav small{display:block;color:#877965;font:10px system-ui;margin-top:3px}.main{display:flex;flex-direction:column;min-width:0;min-height:0}.bar{min-height:48px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-bottom:1px solid var(--line);padding:4px 10px;background:#faf6ef}.bar-title{font:600 13px 'Libre Baskerville',serif;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.tools{display:flex;align-items:center;gap:5px;flex-shrink:0}.lang-switch{display:inline-flex;gap:2px;border:1px solid #dbcbb6;border-radius:5px;overflow:hidden}.lang-switch a{font:600 10px system-ui;color:#6b4a25;text-decoration:none;padding:0 8px;min-height:27px;line-height:27px;background:#fffdf8}.lang-switch a.active{background:#e9dcc5}.uk-button.uk-button-small{font:11px system-ui;text-transform:none;border-radius:5px;padding:0 9px;min-height:29px;line-height:27px}.read-time{color:#786b59;font:11px system-ui;white-space:nowrap}.reader{flex:1;min-height:0;display:flex;flex-direction:column}.spread{flex:1;min-height:0;position:relative;overflow:hidden;padding:16px 24px 14px}.columns{height:100%;width:100%;overflow:hidden;column-count:2;column-gap:36px;padding:0;column-fill:auto;scroll-behavior:smooth}.columns-inner{height:100%;width:100%}.columns p{font:400 14px/1.73 'Noto Sans Telugu',sans-serif;margin:0 0 8px;text-align:left;overflow-wrap:anywhere;break-inside:avoid-column}.columns .section-title{font:600 18px/1.6 'Libre Baskerville',serif;color:#6b4a25;margin:0 0 9px;break-after:avoid-column}.columns .intro{font:11px system-ui;color:var(--gold);margin:0 0 8px}.spread:after{content:'';position:absolute;top:16px;bottom:14px;left:50%;width:1px;background:var(--line);pointer-events:none}.bottom{height:43px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 10px;background:#faf6ef;font:11px system-ui;color:#6f6252}.bottom button{border:1px solid #dbcbb6;background:#fffdf8;border-radius:5px;padding:5px 11px;color:#654c2f;cursor:pointer}.bottom button:disabled{opacity:.35;cursor:default}.mobile{display:none}.mobile-side{display:none}.mobile-side.open{display:block;position:fixed;z-index:50;top:48px;left:0;bottom:0;width:230px;overflow:auto;background:#f6f1e8;box-shadow:3px 0 20px #0002;padding:10px}.font-large .columns p{font-size:16px;line-height:1.8}.font-large .columns .section-title{font-size:20px}@media(max-width:800px){.app{grid-template-columns:1fr}.side{display:none}.mobile{display:inline-block}.columns{column-count:1}.spread:after{display:none}.columns p{font-size:14px}.bar-title{max-width:100%}}@media(min-width:801px) and (max-width:1100px){.columns p{font-size:13px;line-height:1.65}}
""".strip()

READER_JS = r"""
const nav=document.getElementById('nav'),mobileNav=document.getElementById('mobile-nav'),columns=document.getElementById('columns');let chapter=0,spreadIndex=0,spreadCount=1;
function makeNav(root){chapters.forEach((c,i)=>{let li=document.createElement('li'),b=document.createElement('button');b.innerHTML='<span class="n">'+String(i+1).padStart(2,'0')+'</span><span>'+c.title+'<small>~'+c.minutes+' min read</small></span>';b.onclick=()=>{chapter=i;spreadIndex=0;render();document.getElementById('mobile-side').classList.remove('open')};li.append(b);root.append(li)})}makeNav(nav);makeNav(mobileNav);
function render(){let c=chapters[chapter];document.getElementById('heading').textContent=c.title;document.getElementById('time').textContent='~'+c.minutes+' min';columns.innerHTML='';let title=document.createElement('h2');title.className='section-title';title.textContent=c.title;columns.append(title);for(let p of c.paras){let el=document.createElement('p');el.textContent=p;columns.append(el)}document.querySelectorAll('.nav button').forEach((b,i)=>b.classList.toggle('active',i%chapters.length===chapter));requestAnimationFrame(()=>requestAnimationFrame(measure))}
function measure(){const width=columns.clientWidth;const one=window.matchMedia('(max-width:800px)').matches;const total=Math.max(width,columns.scrollWidth);spreadCount=Math.max(1,Math.ceil((total-2)/width));spreadIndex=Math.min(spreadIndex,spreadCount-1);columns.scrollLeft=spreadIndex*width;document.getElementById('position').textContent='Section '+(chapter+1)+' / '+chapters.length+' · '+(one?'Page ':'Spread ')+(spreadIndex+1)+' / '+spreadCount;document.getElementById('prev').disabled=chapter===0&&spreadIndex===0;document.getElementById('next').disabled=chapter===chapters.length-1&&spreadIndex===spreadCount-1}
function move(dir){if(dir===1){if(spreadIndex<spreadCount-1)spreadIndex++;else if(chapter<chapters.length-1){chapter++;spreadIndex=0;render();return}}else{if(spreadIndex>0)spreadIndex--;else if(chapter>0){chapter--;spreadIndex=9999;render();return}}measure()}
document.getElementById('next').onclick=()=>move(1);document.getElementById('prev').onclick=()=>move(-1);document.getElementById('font').onclick=()=>{document.body.classList.toggle('font-large');spreadIndex=0;requestAnimationFrame(measure)};document.getElementById('menu').onclick=()=>document.getElementById('mobile-side').classList.toggle('open');window.addEventListener('resize',()=>{spreadIndex=0;requestAnimationFrame(measure)});document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='PageDown')move(1);if(e.key==='ArrowLeft'||e.key==='PageUp')move(-1)});render();
""".strip()


def load_dotenv(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.is_file():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def ask(prompt: str, default: str) -> str:
    raw = input(f"{prompt} [{default}]: ").strip()
    return raw or default


def day_filename(day_number: int, language: str) -> str:
    return f"day-{day_number:02d}-{language}.html"


def as_paragraphs(content) -> list[str]:
    if isinstance(content, list):
        return [str(p).strip() for p in content if str(p).strip()]
    if isinstance(content, str):
        try:
            parsed = json.loads(content)
            return as_paragraphs(parsed)
        except json.JSONDecodeError:
            text = content.strip()
            return [text] if text else []
    return []


def word_count(paras: list[str]) -> int:
    return sum(len(p.split()) for p in paras)


def rest_get(base: str, key: str, path: str, params: dict[str, str]) -> list | dict:
    query = urllib.parse.urlencode(params)
    url = f"{base.rstrip('/')}{path}?{query}"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_via_rest(env: dict[str, str], series_name: str, language: str) -> tuple[dict, list[dict]]:
    base = env.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("SUPABASE_PUBLIC_URL")
    key = (
        env.get("SUPABASE_SERVICE_ROLE_KEY")
        or env.get("SERVICE_ROLE_KEY")
        or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or env.get("ANON_KEY")
    )
    if not base or not key:
        raise RuntimeError("Missing NEXT_PUBLIC_SUPABASE_URL and ANON/SERVICE key in .env")

    series_rows = rest_get(
        base,
        key,
        "/rest/v1/series",
        {"select": "id,slug,name", "name": f"eq.{series_name}", "limit": "1"},
    )
    if not series_rows:
        # try slug match
        slug = series_name.strip().lower().replace(" ", "-")
        series_rows = rest_get(
            base,
            key,
            "/rest/v1/series",
            {"select": "id,slug,name", "slug": f"eq.{slug}", "limit": "1"},
        )
    if not series_rows:
        raise RuntimeError(f'Series not found: "{series_name}"')

    series = series_rows[0]
    params = {
        "select": "id,day_number,title,subtitle,language,published,sections(id,section_order,title,content,minutes)",
        "series_id": f"eq.{series['id']}",
        "published": "eq.true",
        "order": "day_number.asc,language.asc",
    }
    if language in ("en", "te"):
        params["language"] = f"eq.{language}"

    days = rest_get(base, key, "/rest/v1/days", params)
    # PostgREST may not nest-order sections; sort in Python
    for day in days:
        sections = day.get("sections") or []
        sections.sort(key=lambda s: s.get("section_order") or 0)
        day["sections"] = sections
    return series, days


def fetch_via_postgres(env: dict[str, str], series_name: str, language: str) -> tuple[dict, list[dict]]:
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError("REST failed and psycopg is not installed. pip install 'psycopg[binary]'") from exc

    password = env.get("POSTGRES_PASSWORD", "qlu-local-postgres")
    conninfo = env.get("DATABASE_URL") or f"postgresql://postgres:{password}@127.0.0.1:54332/postgres"
    with psycopg.connect(conninfo) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "select id, slug, name from public.series where name = %s or slug = %s limit 1",
                (series_name, series_name.strip().lower().replace(" ", "-")),
            )
            row = cur.fetchone()
            if not row:
                raise RuntimeError(f'Series not found: "{series_name}"')
            series = {"id": row[0], "slug": row[1], "name": row[2]}

            sql = """
                select d.id, d.day_number, d.title, d.subtitle, d.language, d.published,
                       coalesce(
                         json_agg(
                           json_build_object(
                             'id', s.id,
                             'section_order', s.section_order,
                             'title', s.title,
                             'content', s.content,
                             'minutes', s.minutes
                           ) order by s.section_order
                         ) filter (where s.id is not null),
                         '[]'::json
                       ) as sections
                from public.days d
                left join public.sections s on s.day_id = d.id
                where d.series_id = %s and d.published = true
            """
            args: list = [series["id"]]
            if language in ("en", "te"):
                sql += " and d.language = %s"
                args.append(language)
            sql += " group by d.id order by d.day_number, d.language"

            cur.execute(sql, args)
            days = []
            for r in cur.fetchall():
                sections = r[6]
                if isinstance(sections, str):
                    sections = json.loads(sections)
                days.append(
                    {
                        "id": r[0],
                        "day_number": r[1],
                        "title": r[2],
                        "subtitle": r[3],
                        "language": r[4],
                        "published": r[5],
                        "sections": sections or [],
                    }
                )
            return series, days


def build_chapters(day: dict) -> list[dict]:
    chapters = []
    for section in day.get("sections") or []:
        paras = as_paragraphs(section.get("content"))
        if not paras:
            continue
        minutes = section.get("minutes")
        if not isinstance(minutes, int) or minutes < 1:
            minutes = max(1, round(word_count(paras) / 150))
        chapters.append(
            {
                "title": section.get("title") or f"Section {section.get('section_order')}",
                "paras": paras,
                "minutes": minutes,
                "words": word_count(paras),
            }
        )
    return chapters


def day_jump_html(day_number: int, language: str, siblings: list[int]) -> str:
    links = ['<a href="index.html">Programme</a>']
    prev_n = max((n for n in siblings if n < day_number), default=None)
    next_n = min((n for n in siblings if n > day_number), default=None)
    if prev_n is not None:
        links.append(f'<a href="{day_filename(prev_n, language)}">Prev</a>')
    if next_n is not None:
        links.append(f'<a href="{day_filename(next_n, language)}">Next</a>')
    return "".join(links)


def render_day_html(
    day: dict,
    series_name: str,
    siblings: list[int],
    other_langs: list[str] | None = None,
) -> str:
    language = day["language"]
    day_number = int(day["day_number"])
    title = day.get("title") or series_name
    subtitle = day.get("subtitle") or f"Day {day_number}"
    side_sub = f"{title} · {subtitle}"
    lang_label = "English" if language == "en" else "Telugu"
    page_title = f"{series_name} · Day {day_number} · {lang_label}"
    jump = day_jump_html(day_number, language, siblings)
    chapters = build_chapters(day)
    chapters_json = json.dumps(chapters, ensure_ascii=False, separators=(",", ":"))

    # Language switch (matches /series/.../day/N?lang=te|en)
    langs = other_langs or [language]
    if language not in langs:
        langs = [language, *langs]
    lang_bits = []
    for lang in langs:
        label = "EN" if lang == "en" else "TE"
        cls = ' class="active"' if lang == language else ""
        lang_bits.append(f'<a href="{day_filename(day_number, lang)}"{cls}>{label}</a>')
    lang_switch = f'<span class="lang-switch">{"".join(lang_bits)}</span>' if len(langs) > 1 else ""

    esc = html_lib.escape
    return f"""<!doctype html><html lang="{language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(page_title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;500;600&family=Noto+Serif+Telugu:wght@400;500;600&display=swap" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/uikit@3.23.0/dist/css/uikit.min.css"><style>
{READER_CSS}
</style></head><body><div class="app lang-{language}"><aside class="side"><a class="brand" href="index.html">QUANTUM LIFE UNIVERSITY</a><nav class="day-jump" aria-label="Days">{jump}</nav><h2>{esc(series_name)}</h2><p class="sub">{esc(side_sub)}</p><ul class="nav" id="nav"></ul></aside><main class="main"><header class="bar"><div style="display:flex;align-items:center;gap:6px;min-width:0"><button class="uk-button uk-button-default uk-button-small mobile" id="menu">☰</button><span class="bar-title" id="heading">{esc(title)}</span></div><div class="tools">{lang_switch}<span class="read-time" id="time"></span><button class="uk-button uk-button-default uk-button-small" id="font" title="Toggle text size">A±</button></div></header><div class="reader"><div class="spread" id="spread"><div class="columns" id="columns"></div></div><footer class="bottom"><button id="prev">← Previous</button><span id="position"></span><button id="next">Next →</button></footer></div></main></div><div class="mobile-side" id="mobile-side"><nav class="day-jump" aria-label="Days">{jump}</nav><ul class="nav" id="mobile-nav"></ul></div><script>const chapters={chapters_json};
{READER_JS}</script></body></html>
"""


def render_index_html(series: dict, days: list[dict]) -> str:
    # Group by day number with both languages when present
    by_day: dict[int, dict[str, dict]] = {}
    for day in days:
        n = int(day["day_number"])
        by_day.setdefault(n, {})[day["language"]] = day

    items = []
    for n in sorted(by_day):
        langs = by_day[n]
        en = langs.get("en")
        te = langs.get("te")
        primary = en or te
        title = (en or te or {}).get("title") or ""
        links = []
        if en:
            links.append(f'<a href="{day_filename(n, "en")}">English</a>')
        if te:
            links.append(f'<a href="{day_filename(n, "te")}">తెలుగు</a>')
        links_html = " · ".join(links)
        esc_title = html_lib.escape(title)
        items.append(
            f'        <li id="day-{n:02d}"><strong>Day {n}</strong>'
            f"<em>{esc_title}</em>"
            f'<span class="day-langs">{links_html}</span></li>'
        )

    name = series.get("name") or "Series"
    esc_name = html_lib.escape(name)
    banner = ""
    banner_path = DEFAULT_OUT / "assets" / "devi-navaratrula-jnanam-banner.png"
    if banner_path.is_file():
        banner = (
            '      <img class="hub-banner" src="assets/devi-navaratrula-jnanam-banner.png" '
            'alt="జ్ఞానోదయం · Devi Navratrula Jnanam" width="1600" height="900" />\n'
        )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc_name}</title>
  <style>
    :root {{
      --ink: #2a241f; --ink-muted: #56483a; --ink-soft: #8a6a4a;
      --accent: #ba7a3a; --accent-dark: #8a5a2b; --heading: #6e4a25;
      --card: rgba(255, 252, 247, 0.92); --qa: rgba(255, 255, 255, 0.82);
    }}
    body {{
      margin: 0; font-family: Georgia, "Times New Roman", serif; color: var(--ink);
      background: radial-gradient(circle at top left, #f7e7cf 0, #f7e7cf 18%, transparent 19%),
        linear-gradient(135deg, #f6efe6 0%, #efe2d1 45%, #e2d2bb 100%);
      line-height: 1.6; min-height: 100vh;
    }}
    a {{ color: var(--accent-dark); }}
    .site-wrap {{ box-sizing: border-box; max-width: 880px; margin: 0 auto; padding: 8px 12px 32px; }}
    .site-header {{
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 8px 16px; margin-bottom: 8px; padding: 0 4px 6px;
      border-bottom: 1px solid rgba(186, 122, 58, 0.18);
    }}
    .site-header a {{ text-decoration: none; }}
    .site-brand {{ display: block; font-size: 15px; font-weight: 700; letter-spacing: 0.04em; color: var(--heading); }}
    .site-brand span {{ display: block; font-size: 12px; font-weight: 400; color: var(--ink-soft); margin-top: 2px; }}
    .hub-banner {{
      display: block; width: 100%; height: auto; margin: 0 0 14px;
      border-radius: 16px; border: 1px solid rgba(126, 92, 53, 0.15);
      box-shadow: 0 10px 28px rgba(85, 58, 31, 0.12);
    }}
    .hub-card {{
      box-sizing: border-box; padding: 28px 24px 36px; border-radius: 20px;
      background: var(--card); box-shadow: 0 16px 40px rgba(85, 58, 31, 0.14);
      border: 1px solid rgba(126, 92, 53, 0.15);
    }}
    .hub-card h1 {{ margin: 0 0 8px; font-size: 22px; color: var(--heading); }}
    .lede {{ margin: 0 0 20px; color: var(--ink-muted); font-size: 15px; }}
    .week-label {{ margin: 28px 0 10px; font-size: 14px; font-weight: 700; color: var(--accent); }}
    .day-list {{ list-style: none; margin: 0; padding: 0; }}
    .day-list li {{
      margin: 0 0 8px; padding: 12px 14px; border-radius: 12px;
      background: var(--qa); border: 1px solid rgba(186, 122, 58, 0.18);
    }}
    .day-list strong {{ display: block; font-size: 14px; color: var(--heading); }}
    .day-list em {{ display: block; font-style: normal; font-size: 13px; color: var(--ink-muted); margin: 4px 0 8px; }}
    .day-langs a {{ margin-right: 10px; font-size: 13px; font-weight: 600; }}
    .site-footer {{ margin-top: 22px; padding: 8px 4px; font-size: 12px; color: var(--ink-soft); text-align: center; }}
  </style>
</head>
<body>
  <div class="site-wrap">
    <header class="site-header">
      <a class="site-brand" href="index.html">
        {esc_name}
        <span>Self Knowledge Reading</span>
      </a>
      <nav><a href="index.html">Programme</a></nav>
    </header>
    <div class="hub-card">
{banner}      <h1>Programme</h1>
      <p class="lede">Same content as the library reader · {esc_name}.</p>
      <p class="week-label">Days</p>
      <ul class="day-list">
{chr(10).join(items)}
      </ul>
    </div>
    <footer class="site-footer">{esc_name} · Quantum Life University</footer>
  </div>
</body>
</html>
"""


def main() -> int:
    env = {**os.environ, **load_dotenv(ROOT / ".env"), **load_dotenv(ROOT / ".env.local")}

    # Avoid Windows console encoding issues on arrows / emoji.
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="Export series readings to static HTML")
    parser.add_argument("--series", default=None, help="Series name")
    parser.add_argument("--out", default=None, help="Output folder")
    parser.add_argument("--lang", default=None, choices=("en", "te", "all"), help="Language")
    parser.add_argument("--all", action="store_true", help="Non-interactive: defaults + all languages")
    args = parser.parse_args()

    print("Export series -> static HTML readers (library two-page style)")
    print(f"Repo root: {ROOT}")

    if args.all or (args.series and args.out and args.lang):
        series_name = args.series or DEFAULT_SERIES
        out_raw = args.out or str(DEFAULT_OUT)
        language = (args.lang or "all").lower()
    else:
        series_name = args.series or ask("Series name", DEFAULT_SERIES)
        out_raw = args.out or ask("Output folder", str(DEFAULT_OUT))
        language = (args.lang or ask("Language (en / te / all)", "all")).lower()

    out_dir = Path(out_raw).expanduser()
    if not out_dir.is_absolute():
        out_dir = (ROOT / out_dir).resolve()
    if language not in ("en", "te", "all"):
        print("Language must be en, te, or all", file=sys.stderr)
        return 1

    try:
        series, days = fetch_via_rest(env, series_name, language)
    except Exception as rest_err:
        print(f"REST fetch failed ({rest_err}); trying Postgres...")
        try:
            series, days = fetch_via_postgres(env, series_name, language)
        except Exception as pg_err:
            print(f"Could not load series: {pg_err}", file=sys.stderr)
            return 1

    if not days:
        print("No published days found for that series/language.", file=sys.stderr)
        return 1

    out_dir.mkdir(parents=True, exist_ok=True)

    # Sibling day numbers per language for Prev/Next links
    by_lang: dict[str, list[int]] = {}
    langs_by_day: dict[int, list[str]] = {}
    for day in days:
        n = int(day["day_number"])
        by_lang.setdefault(day["language"], []).append(n)
        langs_by_day.setdefault(n, [])
        if day["language"] not in langs_by_day[n]:
            langs_by_day[n].append(day["language"])
    for lang in by_lang:
        by_lang[lang] = sorted(set(by_lang[lang]))
    for n in langs_by_day:
        langs_by_day[n] = sorted(langs_by_day[n], key=lambda x: 0 if x == "te" else 1)

    written = 0
    for day in days:
        chapters = build_chapters(day)
        if not chapters:
            print(f"  skip day {day['day_number']} {day['language']} (no sections)")
            continue
        n = int(day["day_number"])
        path = out_dir / day_filename(n, day["language"])
        html = render_day_html(
            day,
            series["name"],
            by_lang[day["language"]],
            other_langs=langs_by_day.get(n, [day["language"]]),
        )
        path.write_text(html, encoding="utf-8")
        written += 1
        print(f"  wrote {path.name} ({len(chapters)} sections)")

    index_path = out_dir / "index.html"
    index_path.write_text(render_index_html(series, days), encoding="utf-8")
    print(f"  wrote {index_path.name}")
    print(f"Done: {written} day file(s) -> {out_dir}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nCancelled.", file=sys.stderr)
        raise SystemExit(130)

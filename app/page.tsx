import Link from "next/link";
import { SitePage } from "@/components/SitePage";
import { loadLibrary, readingPath } from "@/lib/content";
import { languageLabel } from "@/lib/language";

function hasTelugu(name: string) {
  return /[\u0C00-\u0C7F]/.test(name);
}

export default async function HomePage() {
  const library = await loadLibrary();
  return (
    <SitePage wide>
      {library.map((series) => (
        <section key={series.slug} className="series-block">
          <p className="series-kicker">Series</p>
          <h1 className={hasTelugu(series.name) ? "series-title" : "series-en"}>{series.name}</h1>
          {series.days.length === 0 ? <p className="muted">No readings in this series yet.</p> : null}
          <div className="day-grid">
            {series.days.map((day) => (
              <article key={`${series.slug}-${day.dayNumber}`} className="day-card">
                {day.coverUrl ? <img src={day.coverUrl} alt="" /> : null}
                <p className="uk-text-meta">Day {day.dayNumber}</p>
                <h2 className={hasTelugu(day.title) ? "lang-te" : undefined}>{day.title}</h2>
                <div className="uk-margin-small-top">
                  {day.languages.map((language) => (
                    <Link
                      key={`${series.slug}-${day.dayNumber}-${language}`}
                      className="uk-button uk-button-primary uk-button-small uk-margin-small-right"
                      href={readingPath(series.slug, day.dayNumber, language)}
                    >
                      {language === "te" ? "Telugu" : "English"}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </SitePage>
  );
}

import Link from "next/link";
import { SitePage } from "@/components/SitePage";
import { loadDashboard } from "@/lib/dashboard";

export const metadata = { title: "Highlights" };

export default async function HighlightsPage() {
  const data = await loadDashboard();
  return (
    <SitePage>
      <h1>Highlights</h1>
      {data.highlights.length === 0 ? (
        <p className="muted">
          No saved highlights yet. <Link href="/series/devi-navaratrula-jnanam/day/8?lang=te">Open day 8</Link> and select a passage.
        </p>
      ) : (
        <div className="uk-grid uk-child-width-1-1" data-uk-grid>
          {data.highlights.map((item) => (
            <article key={item.id} className="uk-card uk-card-default uk-card-body">
              <p className="uk-text-meta">
                Day {item.dayNumber}
                {item.sectionTitle ? ` · ${item.sectionTitle}` : ""}
              </p>
              <p className="passage">{item.selectedText}</p>
              {item.noteText ? <p>{item.noteText}</p> : null}
              {item.voiceNoteUrl ? <audio controls src={item.voiceNoteUrl} /> : null}
            </article>
          ))}
        </div>
      )}
    </SitePage>
  );
}

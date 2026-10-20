import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { SitePage } from "@/components/SitePage";
import { loadDay } from "@/lib/content";
import type { Language } from "@/types/content";

type Props = {
  params: Promise<{ day: string; section: string }>;
  searchParams: Promise<{ lang?: string; series?: string }>;
};

export default async function EditSectionPage({ params, searchParams }: Props) {
  const { day, section } = await params;
  const query = await searchParams;
  const dayNumber = Number(day);
  const sectionOrder = Number(section);
  const language: Language = query.lang === "en" ? "en" : "te";
  if (!Number.isInteger(dayNumber) || !Number.isInteger(sectionOrder)) notFound();

  const series = query.series || "jnanodayam";
  const content = await loadDay(series, dayNumber, language);
  const found = content?.sections.find((item) => item.sectionOrder === sectionOrder);
  if (!content || !found) notFound();

  return (
    <SitePage wide>
      <div className="admin-shell">
        <AdminNav />
        <header className="admin-page-head">
          <h1 className={language === "te" ? "lang-te" : undefined}>{found.title}</h1>
          <p className="muted">
            {content.seriesName} · Day {dayNumber} · {language === "te" ? "Telugu" : "English"}
          </p>
        </header>
        <SectionEditor
          key={`${series}-${dayNumber}-${language}-${found.sectionOrder}`}
          series={series}
          dayNumber={dayNumber}
          language={language}
          youtubeId={content.youtubeId}
          section={found}
          sections={content.sections}
        />
      </div>
    </SitePage>
  );
}

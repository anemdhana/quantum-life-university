import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { loadDayOutline, loadSection } from "@/lib/content";
import { parseLanguage } from "@/lib/language";
import type { Language } from "@/types/content";

type Props = {
  params: Promise<{ day: string; section: string }>;
  searchParams: Promise<{ lang?: string; series?: string }>;
};

async function EditBody({ params, searchParams }: Props) {
  const { day, section } = await params;
  const query = await searchParams;
  const dayNumber = Number(day);
  const sectionOrder = Number(section);
  const language: Language = parseLanguage(query.lang);
  if (!Number.isInteger(dayNumber) || !Number.isInteger(sectionOrder)) notFound();

  const series = query.series || "devi-navaratrula-jnanam";
  const [outline, active] = await Promise.all([
    loadDayOutline(series, dayNumber, language),
    loadSection(series, dayNumber, language, sectionOrder),
  ]);

  if (!outline || !active) notFound();

  return (
    <SectionEditor
      key={`${series}-${dayNumber}-${language}`}
      series={series}
      seriesName={outline.seriesName}
      dayNumber={dayNumber}
      language={language}
      coverUrl={outline.coverUrl}
      youtubeId={outline.youtubeId}
      section={active}
      sections={outline.sections}
    />
  );
}

export default function EditSectionPage(props: Props) {
  return (
    <Suspense fallback={<p className="muted">Loading section…</p>}>
      <EditBody {...props} />
    </Suspense>
  );
}

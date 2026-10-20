import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/SitePage";
import { TwoPageReader } from "@/components/reader/TwoPageReader";
import { loadDay } from "@/lib/content";
import type { Language } from "@/types/content";

type Props = {
  params: Promise<{ series: string; day: string }>;
  searchParams: Promise<{ lang?: string; section?: string; spread?: string }>;
};

function languageOf(value: string | undefined): Language {
  return value === "en" ? "en" : "te";
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { series, day } = await params;
  const query = await searchParams;
  const content = await loadDay(series, Number(day), languageOf(query.lang));
  if (!content) return { title: `Day ${day}` };
  return { title: `${content.seriesName} · Day ${content.dayNumber}` };
}

export default async function SeriesDayPage({ params, searchParams }: Props) {
  const { series, day } = await params;
  const query = await searchParams;
  const dayNumber = Number(day);
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) notFound();

  const language = languageOf(query.lang);
  const content = await loadDay(series, dayNumber, language);
  if (!content) {
    return (
      <SitePage>
        <h1>Day {dayNumber}</h1>
        <p className="muted">This reading is not in the library yet.</p>
        <Link className="uk-button uk-button-primary" href="/">
          Back to the library
        </Link>
      </SitePage>
    );
  }

  const [telugu, english] = await Promise.all([
    language === "te" ? content : loadDay(series, dayNumber, "te"),
    language === "en" ? content : loadDay(series, dayNumber, "en"),
  ]);
  const languages = [telugu ? "te" : null, english ? "en" : null].filter((item): item is Language => item !== null);
  const section = Number(query.section ?? "1");
  const spread = Number(query.spread ?? "0");

  return (
    <TwoPageReader
      day={content}
      languages={languages}
      initialSection={Number.isFinite(section) ? section : 1}
      initialSpread={Number.isFinite(spread) ? spread : 0}
    />
  );
}

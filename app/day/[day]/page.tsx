import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ day: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DayRedirect({ params, searchParams }: Props) {
  const { day } = await params;
  const query = await searchParams;
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") next.set(key, value);
  }
  if (!next.has("lang")) next.set("lang", "te");
  const series = day === "8" || day === "7" ? "devi-navaratrula-jnanam" : "jnanodayam";
  redirect(`/series/${series}/day/${day}?${next}`);
}

export type HtmlChapter = {
  title: string;
  content: string[];
  minutes: number | null;
};

export function extractChaptersFromHtml(html: string): HtmlChapter[] {
  const marker = "const chapters=";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("Could not find const chapters= in the HTML.");

  const jsonStart = start + marker.length;
  const navAt = html.indexOf("const nav=", jsonStart);
  const end = navAt > 0 ? html.lastIndexOf("];", navAt) : html.indexOf("];", jsonStart);
  if (end < 0) throw new Error("Could not find the end of the chapters array.");

  const chapters = JSON.parse(html.slice(jsonStart, end + 1)) as Array<{
    title?: unknown;
    paras?: unknown;
    minutes?: unknown;
  }>;

  if (!Array.isArray(chapters) || chapters.length === 0) {
    throw new Error("The HTML chapters array is empty.");
  }

  return chapters.map((chapter, index) => {
    const title = typeof chapter.title === "string" ? chapter.title.trim() : `Section ${index + 1}`;
    const content = Array.isArray(chapter.paras)
      ? chapter.paras.filter((paragraph): paragraph is string => typeof paragraph === "string" && paragraph.trim().length > 0)
      : [];
    if (content.length === 0) throw new Error(`Section ${index + 1} has no paragraphs.`);
    return {
      title,
      content,
      minutes: typeof chapter.minutes === "number" ? chapter.minutes : null,
    };
  });
}

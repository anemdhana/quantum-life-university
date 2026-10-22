import { NextRequest, NextResponse } from "next/server";
import { listNewsletterAssets, listNewsletterSectionSettings } from "@/lib/actions/newsletter";
import { getSessionProfile } from "@/lib/auth/profile";
import { defaultCoverageRange } from "@/lib/newsletter/coverage";
import { buildNewsletterExportZip } from "@/lib/newsletter/exportPack";

export const runtime = "nodejs";

function isoDateOrNull(value: string | null) {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can export newsletter resources." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const all = searchParams.get("all") === "1";
  const defaults = defaultCoverageRange();
  const takenOnFrom = all ? null : isoDateOrNull(searchParams.get("takenOnFrom")) ?? defaults.takenOnFrom;
  const takenOnTo = all ? null : isoDateOrNull(searchParams.get("takenOnTo")) ?? defaults.takenOnTo;
  const issueMonth =
    searchParams.get("issueMonth")?.match(/^\d{4}-\d{2}$/)?.[0] ?? defaults.issueMonth;

  const [assets, sectionSettings] = await Promise.all([
    listNewsletterAssets({
      takenOnFrom: takenOnFrom ?? undefined,
      takenOnTo: takenOnTo ?? undefined,
      limit: 500,
    }),
    listNewsletterSectionSettings(),
  ]);

  const pack = await buildNewsletterExportZip({
    assets,
    sectionSettings,
    takenOnFrom: takenOnFrom ?? undefined,
    takenOnTo: takenOnTo ?? undefined,
    issueMonth,
    allAssets: all,
  });

  return new NextResponse(Buffer.from(pack.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${pack.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

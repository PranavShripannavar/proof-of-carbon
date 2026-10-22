import { getReport } from "@/lib/storage";
import { canonical } from "@/lib/canonical";
import { reportPayload } from "@/lib/pipeline";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^0x[0-9a-f]{64}$/.test(id))
    return Response.json({ error: "Invalid report ID" }, { status: 400 });
  try {
    const r = await getReport(id);
    if (!r)
      return Response.json({ error: "Report not found" }, { status: 404 });
    const kind = new URL(req.url).searchParams.get("kind");
    return new Response(
      canonical(kind === "claim" ? r.claim : reportPayload(r)),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${kind === "claim" ? "claim" : "report"}-${id.slice(2, 10)}.json"`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Report storage unavailable" },
      { status: 503 },
    );
  }
}

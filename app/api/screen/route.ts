import { runPipeline } from "@/lib/pipeline";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const text = await req.text();
    if (text.length > 16000)
      return Response.json({ error: "Submission too large." }, { status: 413 });
    const report = await runPipeline(JSON.parse(text));
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Screening failed." },
      { status: 400 },
    );
  }
}

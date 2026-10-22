import { submission, makeClaim, hash } from "./canonical";
import { fixtures, scenarios } from "./fixtures";
import { liveAdapter } from "./live";
import { screen } from "./scoring";
import { explain } from "./explain";
import { saveReport } from "./storage";
import type { Report } from "./domain";
export function reportPayload(r: Report) {
  return {
    version: r.version,
    createdAt: r.createdAt,
    mode: r.mode,
    scenario: r.scenario,
    claim: r.claim,
    claimHash: r.claimHash,
    evidence: r.evidence,
    screening: r.screening,
    explanation: r.explanation,
  };
}
export async function runPipeline(raw: unknown) {
  const input = submission.parse(raw);
  // Demo fixtures belong to their exact seeded year and geometry, never arbitrary polygons.
  if (input.mode === "demo") {
    const s = scenarios[input.scenario];
    input.polygon = s.polygon;
    input.year = 2025;
  }
  const claim = makeClaim(input);
  const evidence = await (
    input.mode === "demo" ? fixtures(input.scenario) : liveAdapter
  ).collect(claim);
  const screening = screen(evidence);
  const explanation = await explain(evidence, screening);
  const core = {
    version: "report-v1" as const,
    createdAt: new Date().toISOString(),
    mode: input.mode,
    scenario: input.mode === "demo" ? input.scenario : "custom",
    claim,
    claimHash: hash(claim),
    evidence,
    screening,
    explanation,
  };
  const reportHash = hash(core);
  const report: Report = {
    ...core,
    id: reportHash,
    reportHash,
    storage:
      process.env.DATABASE_URL?.startsWith("libsql://") ||
      process.env.DATABASE_URL?.startsWith("https://")
        ? "durable"
        : "local",
  };
  await saveReport(report);
  return report;
}

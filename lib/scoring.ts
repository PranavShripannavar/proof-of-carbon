import type { Evidence, Screening } from "./domain";
export function screen(evidence: Evidence[]): Screening {
  const fire = evidence.find((e) => e.id === "fire");
  const weather = evidence.find((e) => e.id === "weather");
  const sufficient =
    fire?.availability === "available" &&
    /^\d{4}-01-01$/.test(fire.period.start) &&
    fire.period.end === fire.period.start.slice(0, 4) + "-12-31" &&
    Number.isInteger(fire.values.hotspots) &&
    fire.values.hotspots! >= 0;
  const n = sufficient ? fire!.values.hotspots! : 0;
  const score = n >= 3 ? 70 : n >= 1 ? 40 : 0;
  return {
    version: "screen-v1",
    score,
    outcome: !sufficient
      ? "review required"
      : score >= 60
        ? "high detected risk"
        : score >= 30
          ? "review required"
          : "low detected risk",
    completeness:
      (sufficient ? 75 : 0) + (weather?.availability === "available" ? 25 : 0),
    requiredEvidenceSufficient: !!sufficient,
    findings: [
      {
        rule: "FIRE-01",
        title: sufficient
          ? n === 0
            ? "No hotspots in supplied evidence"
            : `${n} fire hotspots in supplied evidence`
          : "Annual fire evidence insufficient",
        detail: sufficient
          ? "Annual hotspot count: 0 → +0; 1–2 → +40; 3+ → +70. Detections are a screening signal, not burned area or carbon loss."
          : "Rule disabled. Partial or missing annual coverage cannot establish low detected risk.",
        evidenceIds: ["fire"],
        contribution: score,
        enabled: !!sufficient,
      },
      {
        rule: "WEATHER-CONTEXT",
        title:
          weather?.availability === "available"
            ? "Weather context available"
            : "Weather context unavailable",
        detail:
          "Annual reanalysis precipitation provides context only. No drought baseline, forest loss, or verified tonnes are inferred.",
        evidenceIds: ["weather"],
        contribution: 0,
        enabled: weather?.availability === "available",
      },
    ],
  };
}

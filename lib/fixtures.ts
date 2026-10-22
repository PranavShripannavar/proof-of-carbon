import type { Point, Claim, Evidence } from "./domain";
export const scenarios = {
  quiet: {
    name: "Tapajós stewardship",
    tag: "Low detected risk",
    polygon: [
      [-55.041, -3.031],
      [-55.021, -3.031],
      [-55.021, -3.011],
      [-55.041, -3.011],
    ] as Point[],
    tonnes: "1250",
  },
  fire: {
    name: "Xingu restoration",
    tag: "Elevated fire signal",
    polygon: [
      [-52.531, -12.331],
      [-52.511, -12.331],
      [-52.511, -12.311],
      [-52.531, -12.311],
    ] as Point[],
    tonnes: "2800",
  },
  duplicate: {
    name: "Tapajós duplicate attempt",
    tag: "Same coverage · same year",
    polygon: [
      [-55.041, -3.031],
      [-55.021, -3.031],
      [-55.021, -3.011],
      [-55.041, -3.011],
    ] as Point[],
    tonnes: "1250",
  },
};
export interface EvidenceAdapter {
  collect(claim: Claim): Promise<Evidence[]>;
}
export function fixtures(scenario: string): EvidenceAdapter {
  return {
    async collect(c) {
      const common = {
        period: { start: `${c.year}-01-01`, end: `${c.year}-12-31` },
        fetchedAt: "2026-01-15T00:00:00.000Z",
        demo: true,
        availability: "available" as const,
        coverage:
          "Synthetic evidence for the submitted polygon; not an actual observation",
      };
      return [
        {
          ...common,
          id: "fire",
          source: "NASA FIRMS-shaped fixture",
          url: "https://firms.modaps.eosdis.nasa.gov/api/",
          values: { hotspots: scenario === "fire" ? 5 : 0 },
          limitations: [
            "Demo data: synthetic annual coverage and hotspot count. No NASA response was retrieved.",
            "No detections does not prove absence of fire.",
          ],
        },
        {
          ...common,
          id: "weather",
          source: "Open-Meteo-shaped fixture",
          url: "https://open-meteo.com/en/docs/historical-weather-api",
          values: {
            precipitationMmTenths: scenario === "fire" ? 12340 : 21480,
            days: c.year % 4 === 0 ? 366 : 365,
          },
          limitations: [
            "Demo data: invented annual precipitation for demonstration.",
            "Weather cannot establish carbon removals or permanence.",
          ],
        },
      ];
    },
  };
}

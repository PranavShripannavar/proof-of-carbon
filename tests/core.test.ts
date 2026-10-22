import { describe, it, expect, vi, afterEach } from "vitest";
import { canonical, hash, makeClaim, submission } from "../lib/canonical";
import { normalizePolygon, polygonCells, inside } from "../lib/geo";
import { fixtures, scenarios } from "../lib/fixtures";
import { screen } from "../lib/scoring";
import { liveAdapter } from "../lib/live";
import { explain } from "../lib/explain";
import type { Point } from "../lib/domain";
const input = {
  project: "Test forest",
  year: 2025,
  tonnes: "1250.001",
  polygon: scenarios.quiet.polygon,
  supportingText: "",
  mode: "demo" as const,
  scenario: "quiet" as const,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("canonical claim integrity", () => {
  it("sorts keys recursively and rejects float numbers", () => {
    expect(canonical({ z: 1, a: { y: 2, b: 3 } })).toBe(
      '{"a":{"b":3,"y":2},"z":1}',
    );
    expect(() => canonical({ a: 1.2 })).toThrow();
    expect(() => canonical(undefined)).toThrow();
  });
  it("normalizes rotation, closure and winding and preserves exact kg", () => {
    const a = makeClaim(input);
    const reversed = [...input.polygon].reverse();
    const rotated = [...reversed.slice(2), ...reversed.slice(0, 2)];
    expect(hash(a)).toBe(
      hash(makeClaim({ ...input, polygon: [...rotated, rotated[0]] })),
    );
    expect(a.claimedKgCO2e).toBe(1250001);
    expect(hash(a)).not.toBe(hash({ ...a, year: 2024 }));
  });
  it("normalizes Unicode and quantizes geometry before hashing", () => {
    expect(makeClaim({ ...input, project: "Cafe\u0301" }).project).toBe("Café");
    const a = makeClaim(input);
    const p = input.polygon.map(([x, y]) => [x + 0.0000001, y] as Point);
    expect(hash(a)).toBe(hash(makeClaim({ ...input, polygon: p })));
  });
  it("validates monetary-like integer tonne precision and bounded metadata", () => {
    expect(submission.safeParse({ ...input, tonnes: "1e6" }).success).toBe(
      false,
    );
    expect(submission.safeParse({ ...input, tonnes: "1.0001" }).success).toBe(
      false,
    );
    expect(() => makeClaim({ ...input, tonnes: "0" })).toThrow();
    expect(submission.safeParse({ ...input, year: NaN }).success).toBe(false);
  });
});
describe("conservative bounded geometry", () => {
  it("rejects bowties, repeated vertices, tiny polygons and invalid coordinates", () => {
    for (const p of [
      [
        [0, 0],
        [0.01, 0.01],
        [0, 0.01],
        [0.01, 0],
      ],
      [
        [0, 0],
        [0.01, 0],
        [0.01, 0],
        [0, 0.01],
      ],
      [
        [0, 0],
        [0.000001, 0],
        [0, 0.000001],
      ],
      [
        [181, 0],
        [181, 0.01],
        [181.01, 0],
      ],
      [
        [0, 81],
        [0.01, 81],
        [0, 81.01],
      ],
    ] as Point[][])
      expect(() => normalizePolygon(p)).toThrow();
  });
  it("includes both sides of grid edges and all corner-touching cells", () => {
    const p = normalizePolygon([
      [0, 0],
      [0.01, 0],
      [0.01, 0.01],
      [0, 0.01],
    ]);
    const cells = polygonCells(p);
    expect(cells).toHaveLength(9);
    const center = 9000 * 36000 + 18000 + 1;
    expect(cells).toContain(center);
    expect(cells).toContain(center - 36001);
    expect(cells).toContain(center + 36001);
  });
  it("covers interior cells and produces unique numerically sorted reservations", () => {
    const p = normalizePolygon([
      [-0.021, -0.021],
      [0.021, -0.021],
      [0.021, 0.021],
      [-0.021, 0.021],
    ]);
    const cells = polygonCells(p);
    expect(cells).toHaveLength(36);
    expect(cells).toEqual([...new Set(cells)].sort((a, b) => a - b));
    expect(inside([0, 0], p)).toBe(true);
  });
  it("includes cells crossed by an edge with no polygon vertex inside the cell", () => {
    const p = normalizePolygon([
      [0.001, 0.001],
      [0.031, 0.001],
      [0.031, 0.006],
      [0.001, 0.006],
    ]);
    const cells = polygonCells(p);
    expect(cells).toContain(9000 * 36000 + 18002 + 1);
  });
  it("rejects huge area, excessive extent, collinear vertices and too many cells", () => {
    expect(() =>
      normalizePolygon([
        [0, 0],
        [1, 0],
        [0, 1],
      ]),
    ).toThrow();
    expect(() =>
      normalizePolygon([
        [0, 0],
        [0.1, 0],
        [0.1, 0.1],
        [0, 0.1],
      ]),
    ).toThrow();
    expect(() =>
      normalizePolygon([
        [0, 0],
        [0.01, 0],
        [0.02, 0],
        [0, 0.01],
      ]),
    ).toThrow();
    const narrow: Point[] = [
      [0.001, 0.001],
      [0.145, 0.145],
      [0.146, 0.145],
      [0.002, 0.001],
    ];
    expect(() => polygonCells(normalizePolygon(narrow))).not.toThrow();
    const many: Point[] = [
      [0.001, 79.001],
      [0.141, 79.001],
      [0.141, 79.071],
      [0.001, 79.071],
    ];
    expect(() => polygonCells(normalizePolygon(many))).toThrow(/64 cells/);
  });
  it("never drops edge-adjacent reservations when winding changes", () => {
    const p = scenarios.quiet.polygon;
    expect(polygonCells(normalizePolygon(p))).toEqual(
      polygonCells(normalizePolygon([...p].reverse())),
    );
  });
});
describe("deterministic risk and missing evidence", () => {
  it("screens low risk and fire fixture consistently", async () => {
    const c = makeClaim(input);
    const quiet = await fixtures("quiet").collect(c),
      fire = await fixtures("fire").collect(c);
    expect(screen(quiet)).toMatchObject({
      score: 0,
      outcome: "low detected risk",
      completeness: 100,
    });
    expect(screen(fire)).toMatchObject({
      score: 70,
      outcome: "high detected risk",
      completeness: 100,
    });
    expect(screen(quiet)).toEqual(screen(quiet));
  });
  it("missing or partial fire always requires review even if observed sample has hotspots", async () => {
    const e = await fixtures("fire").collect(makeClaim(input));
    e[0].availability = "partial";
    expect(screen(e)).toMatchObject({
      outcome: "review required",
      score: 0,
      completeness: 25,
      requiredEvidenceSufficient: false,
    });
    expect(screen([])).toMatchObject({
      outcome: "review required",
      completeness: 0,
    });
  });
  it("thresholds 1–2 add40 and 3+ add70, weather contributes zero", async () => {
    const e = await fixtures("quiet").collect(makeClaim(input));
    for (const n of [1, 2, 3, 999]) {
      e[0].values.hotspots = n;
      expect(screen(e).score).toBe(n < 3 ? 40 : 70);
    }
    e[0].values.hotspots = 0;
    e[1].values.precipitationMmTenths = 0;
    expect(screen(e).score).toBe(0);
  });
  it("does not turn negative counts into valid annual evidence", async () => {
    const e = await fixtures("quiet").collect(makeClaim(input));
    e[0].values.hotspots = -1;
    expect(screen(e).requiredEvidenceSufficient).toBe(false);
  });
  it("requires an annual period even when an adapter incorrectly labels a sample available", async () => {
    const e = await fixtures("quiet").collect(makeClaim(input));
    e[0].period.start = "2025-12-22";
    expect(screen(e)).toMatchObject({
      outcome: "review required",
      requiredEvidenceSufficient: false,
    });
  });
});
describe("source failures and explanation guardrails", () => {
  it("filters a FIRMS sample to the polygon and never treats the sample as annual", async () => {
    vi.stubEnv("FIRMS_MAP_KEY", "test-map-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async (url: string) =>
          String(url).includes("firms.modaps")
            ? new Response(
                "latitude,longitude,acq_date\n-3.02,-55.03,2025-12-29\n-4,-56,2025-12-29",
              )
            : new Response("{}"),
        ),
    );
    const e = await liveAdapter.collect(makeClaim(input));
    expect(e[0]).toMatchObject({
      availability: "partial",
      demo: false,
      values: { hotspots: 1 },
    });
    expect(screen(e).requiredEvidenceSufficient).toBe(false);
  });
  it("accepts constrained Gemini statements but rejects mismatched evidence citations", async () => {
    const e = await fixtures("quiet").collect(makeClaim(input));
    vi.stubEnv("GEMINI_API_KEY", "");
    const template = await explain(e, screen(e));
    vi.stubEnv("GEMINI_API_KEY", "test");
    const { summary, findings, limitations, nextChecks } = template;
    const response = (facts: typeof findings) =>
      new Response(
        JSON.stringify({
          status: "completed",
          steps: [
            {
              type: "model_output",
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    summary,
                    findings: facts,
                    limitations,
                    nextChecks,
                  }),
                },
              ],
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(findings)));
    expect((await explain(e, screen(e))).origin).toBe("Gemini");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response([{ text: findings[0].text, evidenceIds: ["weather"] }]),
        ),
    );
    expect((await explain(e, screen(e))).origin).toBe("Template");
  });
  it("rejects incomplete/null historical data without scoring absence as safety", async () => {
    vi.stubEnv("FIRMS_MAP_KEY", "");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            daily: { time: ["2025-01-01"], precipitation_sum: [null] },
          }),
        ),
      ),
    );
    const e = await liveAdapter.collect(makeClaim(input));
    expect(e[1].availability).toBe("unavailable");
    expect(screen(e).outcome).toBe("review required");
  });
  it("returns no fixtures when live weather fails, and explains missing FIRMS access", async () => {
    vi.stubEnv("FIRMS_MAP_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Error("Offline")));
    const e = await liveAdapter.collect(makeClaim(input));
    expect(e.every((x) => !x.demo)).toBe(true);
    expect(e.every((x) => x.availability === "unavailable")).toBe(true);
    expect(e.every((x) => !!x.error)).toBe(true);
  });
  it("accepts a full historical weather year and keeps the annual fire rule disabled", async () => {
    vi.stubEnv("FIRMS_MAP_KEY", "");
    const time = Array.from({ length: 365 }, (_, i) =>
      new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            daily: { time, precipitation_sum: time.map(() => 1) },
          }),
        ),
      ),
    );
    const e = await liveAdapter.collect(makeClaim(input));
    expect(e[1]).toMatchObject({
      availability: "available",
      values: { precipitationMmTenths: 3650, days: 365 },
    });
    expect(screen(e).outcome).toBe("review required");
  });
  it("uses a labeled template without Gemini and rejects invented model facts", async () => {
    const e = await fixtures("quiet").collect(makeClaim(input));
    vi.stubEnv("GEMINI_API_KEY", "");
    expect((await explain(e, screen(e))).origin).toBe("Template");
    vi.stubEnv("GEMINI_API_KEY", "test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "completed",
            steps: [
              {
                type: "model_output",
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      summary: "This is certified.",
                      findings: [],
                      limitations: [],
                      nextChecks: [],
                    }),
                  },
                ],
              },
            ],
          }),
        ),
      ),
    );
    expect((await explain(e, screen(e))).origin).toBe("Template");
  });
});

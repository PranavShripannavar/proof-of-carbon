import { z } from "zod";
import type { Claim, Evidence } from "./domain";
import type { EvidenceAdapter } from "./fixtures";
import { inside } from "./geo";
const weatherSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    precipitation_sum: z.array(z.number().nullable()),
  }),
});
async function weather(c: Claim): Promise<Evidence> {
  const base: Evidence = {
    id: "weather",
    source: "Open-Meteo ERA5 reanalysis",
    url: "https://open-meteo.com/en/docs/historical-weather-api",
    period: { start: `${c.year}-01-01`, end: `${c.year}-12-31` },
    fetchedAt: new Date().toISOString(),
    coverage:
      "Single reanalysis grid point at polygon bounding-box center; not polygon-wide measurements",
    availability: "unavailable",
    values: {},
    limitations: [
      "Reanalysis is modeled weather, not a forest observation.",
      "Precipitation alone does not establish drought, removals, additionality or permanence.",
    ],
    demo: false,
  };
  try {
    const xs = c.polygonE6.map((p) => p[0]),
      ys = c.polygonE6.map((p) => p[1]);
    const params = new URLSearchParams({
      latitude: String((Math.min(...ys) + Math.max(...ys)) / 2e6),
      longitude: String((Math.min(...xs) + Math.max(...xs)) / 2e6),
      start_date: base.period.start,
      end_date: base.period.end,
      daily: "precipitation_sum",
      timezone: "UTC",
      models: "era5",
    });
    if (
      new Date(base.period.end + "T23:59:59Z").getTime() >
      Date.now() - 7 * 864e5
    )
      throw Error(
        "A complete historical year is not yet available. Choose a completed reporting year.",
      );
    const res = await fetch(
      "https://archive-api.open-meteo.com/v1/archive?" + params,
      { signal: AbortSignal.timeout(18000), cache: "no-store" },
    );
    if (!res.ok) throw Error(`Weather source returned HTTP ${res.status}.`);
    const data = weatherSchema.parse(await res.json());
    const expected = Math.round(
      (Date.parse(`${c.year + 1}-01-01`) - Date.parse(`${c.year}-01-01`)) /
        864e5,
    );
    const valid = data.daily.precipitation_sum.filter(
      (n): n is number => n !== null && n >= 0,
    );
    if (
      data.daily.time.length !== expected ||
      valid.length !== expected ||
      new Set(data.daily.time).size !== expected ||
      data.daily.time[0] !== base.period.start ||
      data.daily.time.at(-1) !== base.period.end ||
      !data.daily.time.every(
        (day, i) =>
          day ===
          new Date(Date.UTC(c.year, 0, i + 1)).toISOString().slice(0, 10),
      )
    )
      throw Error("Incomplete historical weather coverage.");
    return {
      ...base,
      availability: "available",
      values: {
        precipitationMmTenths: Math.round(
          valid.reduce((a, b) => a + b, 0) * 10,
        ),
        days: valid.length,
      },
    };
  } catch (e) {
    return {
      ...base,
      error: e instanceof Error ? e.message : "Weather unavailable",
    };
  }
}
async function firms(c: Claim): Promise<Evidence> {
  const base: Evidence = {
    id: "fire",
    source: "NASA FIRMS VIIRS SNPP standard processing",
    url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
    period: { start: `${c.year}-12-27`, end: `${c.year}-12-31` },
    fetchedAt: new Date().toISOString(),
    coverage:
      "Bounding-box query, detections filtered to polygon; only a 5-day sample",
    availability: "unavailable",
    values: {},
    limitations: [
      "Annual FIRE-01 disabled: this adapter samples only the last 5 days of the reporting year.",
      "Sensor availability, clouds and satellite overpass timing limit detections.",
      "Hotspots do not quantify burned area or carbon loss.",
    ],
    demo: false,
  };
  if (!process.env.FIRMS_MAP_KEY)
    return {
      ...base,
      error:
        "FIRMS_MAP_KEY is not configured. Annual fire screening unavailable.",
    };
  if (c.year < 2012 || Date.parse(base.period.end) > Date.now() - 60 * 864e5)
    return {
      ...base,
      error:
        "Requested period unsupported or standard-processing availability uncertain. No present-day substitute used.",
    };
  try {
    const xs = c.polygonE6.map((p) => p[0] / 1e6),
      ys = c.polygonE6.map((p) => p[1] / 1e6);
    const bbox = [
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs),
      Math.max(...ys),
    ].join(",");
    const r = await fetch(
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(process.env.FIRMS_MAP_KEY)}/VIIRS_SNPP_SP/${bbox}/5/${base.period.start}`,
      { signal: AbortSignal.timeout(18000), cache: "no-store" },
    );
    if (!r.ok) throw Error(`FIRMS returned HTTP ${r.status}.`);
    const csv = await r.text();
    if (csv.length > 2e6) throw Error("FIRMS response too large.");
    const lines = csv.trim().split(/\r?\n/),
      header = lines[0].split(",");
    const lat = header.indexOf("latitude"),
      lon = header.indexOf("longitude"),
      date = header.indexOf("acq_date");
    if (lat < 0 || lon < 0 || date < 0)
      throw Error(
        "FIRMS response did not contain a supported CSV schema; access or coverage may be unavailable.",
      );
    let count = 0;
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const a = line.split(",");
      const x = Number(a[lon]),
        y = Number(a[lat]);
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        a[date] < base.period.start ||
        a[date] > base.period.end
      )
        throw Error("FIRMS returned invalid or out-of-period rows.");
      if (inside([Math.round(x * 1e6), Math.round(y * 1e6)], c.polygonE6))
        count++;
    }
    return { ...base, availability: "partial", values: { hotspots: count } };
  } catch {
    return {
      ...base,
      error:
        "FIRMS request failed or response unsupported. Check source access and historical availability. No fixture substituted.",
    };
  }
}
export const liveAdapter: EvidenceAdapter = {
  async collect(c) {
    return Promise.all([firms(c), weather(c)]);
  },
};

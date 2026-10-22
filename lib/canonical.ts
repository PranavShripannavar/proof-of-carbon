import { keccak256, toBytes } from "viem";
import { z } from "zod";
import { normalizePolygon, polygonCells } from "./geo";
import type { Claim } from "./domain";
export function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value))
      throw Error("Canonical numbers must be safe integers.");
    return String(value === 0 ? 0 : value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (typeof value === "object" && value)
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ":" +
            canonical((value as Record<string, unknown>)[k]),
        )
        .join(",") +
      "}"
    );
  throw Error("Unsupported canonical value.");
}
export const hash = (value: unknown) => keccak256(toBytes(canonical(value)));
export const submission = z
  .object({
    project: z.string().trim().min(2).max(100),
    year: z.number().int().min(2000).max(2100),
    tonnes: z.string().regex(/^\d{1,9}(\.\d{1,3})?$/),
    polygon: z
      .array(z.tuple([z.number(), z.number()]))
      .min(3)
      .max(65),
    supportingText: z.string().max(2000).default(""),
    mode: z.enum(["live", "demo"]),
    scenario: z.enum(["quiet", "fire", "duplicate"]).default("quiet"),
  })
  .strict();
export function makeClaim(input: z.infer<typeof submission>): Claim {
  const polygonE6 = normalizePolygon(input.polygon);
  const [whole, fraction = ""] = input.tonnes.split(".");
  const kg = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  if (kg <= 0) throw Error("Claimed tonnes must be positive.");
  return {
    version: "claim-v1",
    project: input.project.normalize("NFC"),
    year: input.year,
    claimedKgCO2e: kg,
    polygonE6,
    supportingText: input.supportingText.normalize("NFC"),
    cells: polygonCells(polygonE6),
    grid: "degree-0.01-v1",
  };
}

export type Point = [number, number]; // longitude, latitude, decimal degrees at input
export type Claim = {
  version: "claim-v1";
  project: string;
  year: number;
  claimedKgCO2e: number;
  polygonE6: Point[];
  supportingText: string;
  cells: number[];
  grid: "degree-0.01-v1";
};
export type Evidence = {
  id: string;
  source: string;
  url: string;
  period: { start: string; end: string };
  fetchedAt: string;
  coverage: string;
  availability: "available" | "partial" | "unavailable";
  values: { hotspots?: number; precipitationMmTenths?: number; days?: number };
  limitations: string[];
  error?: string;
  demo: boolean;
};
export type Finding = {
  rule: string;
  title: string;
  detail: string;
  evidenceIds: string[];
  contribution: number;
  enabled: boolean;
};
export type Screening = {
  version: "screen-v1";
  score: number;
  outcome: "low detected risk" | "review required" | "high detected risk";
  completeness: number;
  requiredEvidenceSufficient: boolean;
  findings: Finding[];
};
export type Explanation = {
  origin: "Gemini" | "Template";
  summary: string;
  findings: { text: string; evidenceIds: string[] }[];
  limitations: string[];
  nextChecks: string[];
  notice?: string;
};
export type Report = {
  version: "report-v1";
  id: string;
  createdAt: string;
  mode: "demo" | "live";
  scenario: string;
  claim: Claim;
  claimHash: `0x${string}`;
  reportHash: `0x${string}`;
  evidence: Evidence[];
  screening: Screening;
  explanation: Explanation;
  storage: "durable" | "local";
};

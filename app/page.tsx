"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  ArrowRight,
  Leaf,
  LayoutDashboard,
  ScanLine,
  Layers,
  ShieldCheck,
  Flame,
  CloudRain,
  FileDown,
  Check,
  ChevronDown,
  Info,
  Hexagon,
  BookOpen,
  Link2,
} from "lucide-react";
import { scenarios } from "@/lib/fixtures";
import type { Point, Report } from "@/lib/domain";
import { normalizePolygon } from "@/lib/geo";
import RegistryPanel from "@/components/RegistryPanel";
const ProjectMap = dynamic(() => import("@/components/ProjectMap"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading project map…</div>,
});
type Scenario = keyof typeof scenarios;
export default function Home() {
  const [scenario, setScenario] = useState<Scenario>("quiet"),
    [mode, setMode] = useState<"demo" | "live">("demo"),
    [polygon, setPolygon] = useState<Point[]>(scenarios.quiet.polygon),
    [project, setProject] = useState(scenarios.quiet.name),
    [year, setYear] = useState(2025),
    [tonnes, setTonnes] = useState("1250"),
    [support, setSupport] = useState(""),
    [report, setReport] = useState<Report | null>(null),
    [busy, setBusy] = useState(false),
    [stage, setStage] = useState(0),
    [error, setError] = useState(""),
    [coordinates, setCoordinates] = useState(""),
    [showCoordinates, setShowCoordinates] = useState(false),
    [tab, setTab] = useState("screen");
  function select(id: Scenario) {
    const s = scenarios[id];
    setScenario(id);
    setPolygon(s.polygon);
    setProject(s.name);
    setTonnes(s.tonnes);
    setYear(2025);
    setMode("demo");
    setReport(null);
    setError("");
  }
  function changeMode(m: "demo" | "live") {
    setMode(m);
    setReport(null);
    setError("");
    if (m === "demo") select(scenario);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setReport(null);
    setStage(0);
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, 2)), 1300);
    try {
      const r = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          year,
          tonnes,
          polygon,
          supportingText: support,
          mode,
          scenario,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Screening failed.");
      setStage(3);
      setReport(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to reach screening service.",
      );
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  }
  function applyCoordinates() {
    try {
      const p = JSON.parse(coordinates);
      if (
        !Array.isArray(p) ||
        p.length < 3 ||
        p.some(
          (a) =>
            !Array.isArray(a) ||
            a.length !== 2 ||
            a.some(
              (n: unknown) => typeof n !== "number" || !Number.isFinite(n),
            ),
        )
      )
        throw Error();
      setPolygon(normalizePolygon(p).map(([x, y]) => [x / 1e6, y / 1e6]));
      setReport(null);
      setShowCoordinates(false);
      setError("");
    } catch {
      setError(
        "Enter at least three [longitude, latitude] pairs as a JSON array. Full geometry validation runs on submission.",
      );
    }
  }
  const s = report?.screening;
  const fire = report?.evidence.find((e) => e.id === "fire");
  const weather = report?.evidence.find((e) => e.id === "weather");
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-icon">
            <Leaf size={24} />
          </span>
          <span>
            ProofOf<span>Carbon</span>
            <small>EVIDENCE BEFORE ASSURANCE</small>
          </span>
        </a>
        <div className="workspace-label">
          WORKSPACE <ChevronDown size={13} />
        </div>
        <nav aria-label="Main navigation">
          <button
            className={tab === "screen" ? "nav-item active" : "nav-item"}
            onClick={() => setTab("screen")}
          >
            <LayoutDashboard size={18} /> Claim screening <span>01</span>
          </button>
          <button
            className={tab === "audit" ? "nav-item active" : "nav-item"}
            onClick={() => setTab("audit")}
          >
            <Link2 size={18} /> Audit registry
          </button>
          <button
            className={tab === "method" ? "nav-item active" : "nav-item"}
            onClick={() => setTab("method")}
          >
            <BookOpen size={18} /> Methodology
          </button>
        </nav>
        <div className="sidebar-note">
          <Hexagon size={26} />
          <strong>Proof, with perspective.</strong>
          <p>
            A transparent first look at forest carbon claims. Built for better
            questions.
          </p>
          <span>
            HACKATHON PROTOTYPE <span className="live-dot" />
          </span>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">PC</span>
          <div>
            Public workspace<small>No wallet required to explore</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            Workspace <span>/</span>{" "}
            {tab === "screen"
              ? "Claim screening"
              : tab === "audit"
                ? "Audit registry"
                : "Methodology"}
          </div>
          <span className="network">
            <span className="live-dot" /> Prototype ·{" "}
            {process.env.NEXT_PUBLIC_CHAIN_ID === "31337"
              ? "Local EVM"
              : "Base Sepolia target"}
          </span>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">FOREST CARBON INTELLIGENCE</div>
              <h1>
                Evidence before assurance<span>.</span>
              </h1>
              <p>Screen a claim. Understand the signals. Leave a trace.</p>
            </div>
            <a
              className="button"
              href="#methodology"
              onClick={() => setTab("method")}
            >
              How screening works <ArrowUpRight size={16} />
            </a>
          </div>
          {tab === "screen" && (
            <>
              <div className="positioning">
                <ShieldCheck size={19} />
                <p>
                  Screening supports due diligence. It does not certify credits
                  or verify carbon removals.
                </p>
                <span>KNOW THE DIFFERENCE</span>
              </div>
              <div className="section-heading examples-heading">
                <div>
                  <span className="eyebrow">START WITH A SCENARIO</span>
                  <h2>A small forest. A clearer picture.</h2>
                </div>
                <span className="demo-label">DEMO DATA</span>
              </div>
              <div className="scenario-grid">
                {(Object.keys(scenarios) as Scenario[]).map((id, i) => (
                  <button
                    key={id}
                    className={`scenario ${scenario === id && mode === "demo" ? "selected" : ""}`}
                    onClick={() => select(id)}
                    disabled={busy}
                  >
                    <div className={`scenario-icon icon-${id}`}>
                      {i === 0 ? (
                        <Leaf size={21} />
                      ) : i === 1 ? (
                        <Flame size={21} />
                      ) : (
                        <Layers size={21} />
                      )}
                    </div>
                    <div>
                      <small>SCENARIO 0{i + 1}</small>
                      <strong>{scenarios[id].name}</strong>
                      <span>{scenarios[id].tag}</span>
                    </div>
                    {scenario === id && mode === "demo" ? (
                      <span className="selected-check">
                        <Check size={14} />
                      </span>
                    ) : (
                      <ArrowUpRight size={17} className="scenario-arrow" />
                    )}
                  </button>
                ))}
              </div>
              <div className="workbench">
                <section className="card project-card">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">01 / PROJECT AREA</span>
                      <h2>Put the claim on the map</h2>
                    </div>
                    <div className="segmented" aria-label="Evidence mode">
                      <button
                        className={mode === "demo" ? "chosen" : ""}
                        onClick={() => changeMode("demo")}
                        disabled={busy}
                      >
                        Demo
                      </button>
                      <button
                        className={mode === "live" ? "chosen" : ""}
                        onClick={() => changeMode("live")}
                        disabled={busy}
                      >
                        Live
                      </button>
                    </div>
                  </div>
                  <ProjectMap
                    key={mode}
                    polygon={
                      report
                        ? report.claim.polygonE6.map((p) => [
                            p[0] / 1e6,
                            p[1] / 1e6,
                          ])
                        : polygon
                    }
                    onChange={(p) => {
                      setPolygon(p);
                      setReport(null);
                    }}
                    editable={mode === "live" && !busy}
                  />
                  <div className="map-caption">
                    <span>
                      <span className="square" /> Submitted boundary
                    </span>
                    <span>
                      {mode === "demo"
                        ? "Seeded example · synthetic evidence"
                        : "Custom polygon · live sources"}{" "}
                      · {polygon.length} vertices
                    </span>
                  </div>
                  <form onSubmit={submit} className="claim-form">
                    <div className="form-grid">
                      <label className="wide">
                        Project name
                        <input
                          value={project}
                          onChange={(e) => {
                            setProject(e.target.value);
                            setReport(null);
                          }}
                          required
                          minLength={2}
                          maxLength={100}
                          disabled={busy}
                        />
                      </label>
                      <label>
                        Reporting year
                        <input
                          type="number"
                          min={2000}
                          max={2100}
                          value={year}
                          onChange={(e) => {
                            setYear(+e.target.value);
                            setReport(null);
                          }}
                          disabled={mode === "demo" || busy}
                          required
                        />
                      </label>
                      <label>
                        Claimed tonnes CO₂e{" "}
                        <span title="User-provided and unverified">ⓘ</span>
                        <input
                          inputMode="decimal"
                          value={tonnes}
                          onChange={(e) => {
                            setTonnes(e.target.value);
                            setReport(null);
                          }}
                          required
                          pattern="[0-9]{1,9}(\.[0-9]{1,3})?"
                          disabled={busy}
                        />
                      </label>
                      <label className="wide">
                        Supporting notes{" "}
                        <span className="optional">
                          Optional · treated as untrusted
                        </span>
                        <textarea
                          value={support}
                          onChange={(e) => {
                            setSupport(e.target.value);
                            setReport(null);
                          }}
                          maxLength={2000}
                          placeholder="Add context for human review…"
                          rows={2}
                          disabled={busy}
                        />
                      </label>
                    </div>
                    {mode === "live" && (
                      <>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            setShowCoordinates(!showCoordinates);
                            setCoordinates(JSON.stringify(polygon));
                          }}
                        >
                          Edit coordinates with keyboard
                        </button>
                        {showCoordinates && (
                          <div className="coordinate-editor">
                            <label>
                              JSON array: [[longitude, latitude], …]
                              <textarea
                                rows={4}
                                value={coordinates}
                                onChange={(e) => setCoordinates(e.target.value)}
                              />
                            </label>
                            <button
                              type="button"
                              className="button"
                              onClick={applyCoordinates}
                            >
                              Apply boundary
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    <div className="submit-row">
                      <small>
                        {mode === "demo"
                          ? "Demo data · fixed location and 2025 reporting year"
                          : "Live retrieval · no automatic fixture fallback"}
                      </small>
                      <button
                        className="button dark"
                        type="submit"
                        disabled={busy}
                      >
                        <ScanLine size={17} />
                        {busy ? "Screening…" : "Screen this claim"}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </form>
                  {error && (
                    <div className="error form-error" role="alert">
                      {error}
                    </div>
                  )}
                </section>
                <section className="card score-card">
                  <div className="eyebrow">02 / SCREENING RESULT</div>
                  <div className="score-top">
                    <h2>
                      {report
                        ? "The evidence at a glance"
                        : "A first look, with context"}
                    </h2>
                    {report && (
                      <span
                        className={
                          report.mode === "demo" ? "demo-label" : "live-label"
                        }
                      >
                        {report.mode === "demo" ? "DEMO DATA" : "LIVE SOURCES"}
                      </span>
                    )}
                  </div>
                  {busy ? (
                    <div className="progress" role="status">
                      <span className="spinner" />
                      <h3>Building your evidence trail</h3>
                      {[
                        "Collecting source evidence",
                        "Applying deterministic rules",
                        "Preparing explanation & saving report",
                      ].map((t, i) => (
                        <div key={t} className={i <= stage ? "current" : ""}>
                          <span>{i < stage ? "✓" : `0${i + 1}`}</span>
                          {t}
                        </div>
                      ))}
                      <small>
                        Stages are indicative. A report appears only after
                        processing and persistence succeed.
                      </small>
                    </div>
                  ) : report ? (
                    <>
                      <div
                        className={`score-ring ${s!.score >= 60 ? "risk" : ""}`}
                        style={
                          { "--score": `${s!.score}%` } as React.CSSProperties
                        }
                      >
                        <div>
                          <strong>
                            {s!.score}
                            <span>/100</span>
                          </strong>
                          <small>SCREENING SCORE</small>
                        </div>
                      </div>
                      <div
                        className={`outcome ${s!.score >= 60 ? "red" : !s!.requiredEvidenceSufficient ? "amber" : ""}`}
                      >
                        <span className="live-dot" />
                        {s!.outcome}
                      </div>
                      <p className="score-description">
                        Higher scores mean more detected risk. Zero means no
                        points triggered by supported rules; it is not a safety
                        rating.
                      </p>
                      <div className="confidence">
                        <div>
                          <strong>Evidence completeness</strong>
                          <b>{s!.completeness}%</b>
                        </div>
                        <div className="meter">
                          <span style={{ width: s!.completeness + "%" }} />
                        </div>
                        <small>
                          {s!.requiredEvidenceSufficient
                            ? "Required annual fixture evidence supplied."
                            : "Annual fire evidence insufficient → review required."}{" "}
                          Input coverage is separate from claim validity.
                        </small>
                      </div>
                      <div className="claimed">
                        <Leaf size={18} />
                        <div>
                          <strong>
                            {(
                              report.claim.claimedKgCO2e / 1000
                            ).toLocaleString()}{" "}
                            tCO₂e
                          </strong>
                          <small>USER-PROVIDED · UNVERIFIED</small>
                        </div>
                      </div>
                      <div className="download-row">
                        <a
                          href={`/api/reports/${report.id}?kind=report`}
                          className="button"
                        >
                          <FileDown size={15} /> Report JSON
                        </a>
                        <a
                          href={`/api/reports/${report.id}?kind=claim`}
                          className="text-button"
                        >
                          Claim JSON <ArrowUpRight size={14} />
                        </a>
                      </div>
                      <div className="hash-preview">
                        <span>REPORT HASH · KECCAK-256</span>
                        <code>
                          {report.reportHash.slice(0, 18)}…
                          {report.reportHash.slice(-8)}
                        </code>
                      </div>
                      <small className="muted">
                        Saved to{" "}
                        {report.storage === "durable"
                          ? "durable remote storage"
                          : "development SQLite"}
                        . {report.claim.cells.length} conservative grid cells.
                      </small>
                    </>
                  ) : (
                    <div className="result-empty">
                      <div className="empty-orbit">
                        <ScanLine size={38} />
                      </div>
                      <h3>A claim is a starting point.</h3>
                      <p>
                        Choose a scenario or draw a small project boundary, then
                        run a screening to inspect the evidence.
                      </p>
                      <div>
                        <Check size={16} /> Reproducible rules
                      </div>
                      <div>
                        <Check size={16} /> Sources and limitations
                      </div>
                      <div>
                        <Check size={16} /> Downloadable audit trail
                      </div>
                      <span>
                        No wallet needed to screen <ArrowUpRight size={14} />
                      </span>
                    </div>
                  )}
                </section>
              </div>
              <section className="evidence-section">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">03 / FOLLOW THE SIGNALS</span>
                    <h2>Evidence, with its edges visible.</h2>
                  </div>
                  <span className="pill">
                    {report
                      ? "screen-v1 · deterministic"
                      : "Two source adapters"}
                  </span>
                </div>
                <div className="evidence-grid">
                  {[
                    {
                      icon: <Flame size={20} />,
                      title: "Fire activity",
                      e: fire,
                    },
                    {
                      icon: <CloudRain size={20} />,
                      title: "Weather context",
                      e: weather,
                    },
                  ].map(({ icon, title, e }, i) => (
                    <article className="card evidence-card" key={title}>
                      <div className="evidence-heading">
                        <span
                          className={`evidence-icon ${i === 0 ? "fire-icon" : ""}`}
                        >
                          {icon}
                        </span>
                        <h3>{title}</h3>
                        <span
                          className={`availability ${e?.availability || ""}`}
                        >
                          {e ? e.availability : "Awaiting screening"}
                        </span>
                      </div>
                      {e ? (
                        <>
                          <div className="evidence-value">
                            {i === 0 ? (
                              e.values.hotspots !== undefined ? (
                                <>
                                  {e.values.hotspots}
                                  <span>hotspot detections</span>
                                </>
                              ) : (
                                "No annual coverage"
                              )
                            ) : e.values.precipitationMmTenths !== undefined ? (
                              <>
                                {(
                                  e.values.precipitationMmTenths / 10
                                ).toLocaleString()}
                                <span>mm / year</span>
                              </>
                            ) : (
                              "Unavailable"
                            )}
                          </div>
                          <div className="evidence-source">
                            <a href={e.url} target="_blank" rel="noreferrer">
                              {e.source} <ArrowUpRight size={13} />
                            </a>
                            {e.demo && (
                              <span className="demo-label">DEMO DATA</span>
                            )}
                          </div>
                          <p>
                            {e.period.start} → {e.period.end}
                          </p>
                          <p>{e.coverage}</p>
                          {e.error && (
                            <div className="error" role="alert">
                              {e.error}
                            </div>
                          )}
                          <div className="rule-row">
                            <strong>
                              {report!.screening.findings[i].rule}
                            </strong>
                            <span>
                              {report!.screening.findings[i].enabled
                                ? `+${report!.screening.findings[i].contribution} risk points`
                                : "Rule disabled"}
                            </span>
                          </div>
                          <p>{report!.screening.findings[i].detail}</p>
                          <details>
                            <summary>Source limitations & retrieval</summary>
                            <ul>
                              {e.limitations.map((t) => (
                                <li key={t}>{t}</li>
                              ))}
                            </ul>
                            <small>
                              Evidence ID: {e.id} · Fetched:{" "}
                              {new Date(e.fetchedAt).toISOString()}
                            </small>
                          </details>
                        </>
                      ) : (
                        <>
                          <p>
                            {i === 0
                              ? "Hotspot detections can flag a potential disturbance requiring closer inspection."
                              : "Historical precipitation adds context, without inferring verified carbon tonnes."}
                          </p>
                          <div className="placeholder-line" />
                          <div className="placeholder-line short" />
                          <small className="muted">
                            Sources, dates and rule contributions appear here.
                          </small>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              </section>
              <section className="card explanation">
                <div className="explanation-icon">
                  <ShieldCheck size={23} />
                </div>
                <div>
                  <div className="eyebrow">
                    EVIDENCE EXPLANATION{" "}
                    {report && (
                      <span className="pill">
                        {report.explanation.origin === "Gemini"
                          ? "Gemini · constrained JSON"
                          : "Template explanation"}
                      </span>
                    )}
                  </div>
                  <h2>
                    {report
                      ? report.explanation.summary
                      : "Transparent reasoning. No invented assurance."}
                  </h2>
                  {report ? (
                    <>
                      <p>{report.explanation.notice}</p>
                      {report.explanation.findings.map((f, i) => (
                        <p key={i}>
                          {f.text}{" "}
                          <span className="citation">
                            {f.evidenceIds.join(", ")}
                          </span>
                        </p>
                      ))}
                      <details>
                        <summary>Limitations & recommended next checks</summary>
                        <ul>
                          {report.explanation.limitations.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                        <h3>Next checks</h3>
                        <ul>
                          {report.explanation.nextChecks.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </details>
                    </>
                  ) : (
                    <p>
                      AI explains the supplied evidence within a validated
                      schema. The versioned rule engine owns the score. A
                      readable template is always available.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
          {tab !== "method" && <RegistryPanel report={report} />}
          {tab === "method" && (
            <section className="card methodology" id="methodology">
              <span className="eyebrow">METHOD & TRUST BOUNDARIES</span>
              <h2>Designed to make uncertainty visible.</h2>
              <div className="method-grid">
                <article>
                  <Flame />
                  <h3>One supported risk rule</h3>
                  <p>
                    FIRE-01 uses supplied annual hotspot counts: zero adds 0
                    points, 1–2 adds 40, and 3+ adds 70. Outcomes: below 30 low
                    detected risk, 30–59 review required, 60+ high detected
                    risk. Missing required annual evidence always forces review
                    required.
                  </p>
                </article>
                <article>
                  <CloudRain />
                  <h3>Coverage is not confidence in truth</h3>
                  <p>
                    Completeness allocates 75% to full annual fire input and 25%
                    to complete annual weather context. These prototype weights
                    are heuristic, not scientifically calibrated. Weather
                    contributes zero risk points. Live fire sampling is only 10
                    days and cannot satisfy the annual rule.
                  </p>
                </article>
                <article>
                  <Layers />
                  <h3>Bounded geographic reservations</h3>
                  <p>
                    A 0.01° grid conservatively includes cells touched at edges
                    and corners. Limit: 25 km², 64 cells and 64 vertices;
                    latitude ±80°, extent 0.15°. Resolution varies with
                    latitude. Nearby non-overlapping areas may conflict. Cells
                    are sorted, unique and remain reserved after retirement.
                  </p>
                </article>
                <article>
                  <Link2 />
                  <h3>Integrity, with a trust boundary</h3>
                  <p>
                    The caller submits hashes, cells and score. The contract
                    cannot verify that cells match a polygon, that evidence is
                    true, or that a score was computed by this app. No global
                    duplicate prevention is claimed. Download canonical JSON to
                    retain reports; hashes do not preserve availability.
                  </p>
                </article>
              </div>
              <div className="trust-note">
                <Info size={19} />
                This prototype does not verify removals, additionality,
                permanence or eligibility for recognized carbon credits. A
                retired prototype record is not a retired carbon credit.
              </div>
            </section>
          )}
          <footer>
            <span className="footer-brand">
              <Leaf size={17} /> ProofOfCarbon
            </span>
            <span>A clearer signal. A traceable decision.</span>
            <span>
              Prototype v1.0 <span className="live-dot" />
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

# ProofOfCarbon — submission draft

**Intended user.** Carbon procurement and project due-diligence teams deciding where to spend scarce review time.

**Problem.** A claim combines a location, a reporting period and a promised climate outcome. Environmental warning signals, uncertainty and supporting material are often scattered. A tidy score can conceal missing evidence.

**Prototype.** Submit a small polygon, year and unverified claimed tonnes. ProofOfCarbon normalizes environmental evidence, applies a versioned deterministic screen, separates detected risk from input completeness, explains source limitations, and provides downloadable canonical JSON. Three visibly synthetic scenarios demonstrate quiet evidence, elevated fire signals, and a conflicting geographic/year registration.

**AI's role.** Gemini returns schema-validated JSON by selecting supplied evidence-grounded statements and references. It cannot change the deterministic score or invent a factual statement outside the allowed vocabulary. The interface labels template fallback when the model is unavailable. User-provided notes are untrusted and excluded from model instructions.

**Blockchain's role.** A small non-upgradeable Base Sepolia-targeted registry stores hashes, owner, score, year and bounded cell reservations. It rejects conflicts in caller-submitted cells for the same year and preserves them after owner retirement. The chain provides an integrity commitment and audit events; it does not attest evidence, polygon-to-cell accuracy, credit validity or truth. No tokens, trading or credit issuance.

**Adoption path.** Pilot with an internal review team using a protected deployment. Validate thresholds and annual datasets with domain specialists, add independently verified forest-change data, improve evidence availability, and evaluate coarse-cell conflicts. Further production work would require access control, abuse prevention, operational backups and an explicit trust model for who may submit scores/cells.

**Limitations.** Fixture observations are invented. Live weather is single-grid-point modeled context; the bounded FIRMS sample cannot satisfy annual fire screening and therefore forces review. Prototype scoring is heuristic, not scientifically calibrated. Hashes do not guarantee report availability or truth. Geographic enforcement is limited to submitted cells, and nearby non-overlapping projects can conflict. Record retirement is not carbon-credit retirement.

**Deployment status.** See HANDOFF.md for checks actually executed and current local/testnet status. Do not describe a target network as a deployment.

**Track mapping.** Provisional: climate/public-good infrastructure, transparent AI explanations, and on-chain auditability may be relevant. Final mapping depends on the actual event brief; none was supplied.

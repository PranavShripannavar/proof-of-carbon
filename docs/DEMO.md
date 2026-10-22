# Four-minute demo

Prepare: `npm run deploy:local` in terminal one; configure its public address and local chain in `.env.local`; `npm run dev` in terminal two. Fresh chain, no earlier registrations. For Base Sepolia use your actually deployed contract and funded browser wallet instead. Keep the methodology and trust boundaries visible when explaining the product.

**0:00–0:35 — The problem and scope**

“Carbon buyers and due-diligence teams need to know which project claims deserve a closer look. ProofOfCarbon screens a submitted location and reporting year. It does not certify carbon credits or calculate verified removals. These claims and tonnes are user-provided and unverified.” Show the dashboard and Demo data badges.

**0:35–1:20 — Plausible claim**

Choose Tapajós stewardship, leave 2025 and 1,250 tonnes, click Screen this claim. Show the polygon, 0/100 screening score, low detected risk and 100% fixture input completeness. “Zero is no risk points triggered in available _synthetic_ inputs, not proof of safety. Completeness is input coverage, not confidence that the claim is true.” Open fire-source limitations. Download the claim and report JSON.

**1:20–1:55 — Fire scenario**

Choose Xingu restoration and screen. Show five invented fixture hotspots, +70 points, high detected risk. “The deterministic rule owns the score. Weather is context and adds zero points. Gemini selects grounded explanation statements when configured; this deployment explicitly labels the template if Gemini is unavailable.” No assertion of fraud or inferred carbon loss.

**1:55–2:50 — The on-chain trail**

Screen Tapajós again, connect the configured wallet, click Register report. Wait for real confirmation. Show the activity entry, report hash and actual transaction link on Base Sepolia—or explicitly say local EVM if using the local demo. “The blockchain commits to hashes, score, year, owner and submitted grid cells. It does not store the report or prove it true.” Optionally register Xingu as well.

**2:50–3:25 — Duplicate rejection**

Choose Tapajós duplicate attempt, screen, connect if needed, click Register report. The contract simulation rejects a reserved cell for 2025. “The registration would revert. We simulate before spending gas. This is enforcement for cells supplied to the contract, not independent verification of a polygon or global duplicate prevention.” Explain coarse-grid false conflicts and the 64-cell bound.

**3:25–4:00 — Retirement and honest uncertainty**

Retire the original record as owner. Show confirmed retirement. Try the duplicate again; it remains blocked. “This retires a prototype registry record, not a recognized carbon credit.” Switch to Live mode and screen a completed year: Open-Meteo may return annual context; missing/partial annual FIRMS input visibly forces review required. Conclude with the path to validated annual forest evidence, independent review and durable hosted availability.

If any live source is unavailable, show the source error, then deliberately choose a demo scenario. Never narrate fixtures or local transactions as live observations or Base Sepolia writes.

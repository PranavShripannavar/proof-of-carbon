# Verification handoff — 22 October 2026

## Implemented and exercised

- Next.js App Router dashboard, Leaflet polygon display/drawing, keyboard coordinate entry, responsive layout and explicit live/demo modes.
- Three synthetic 2025 scenarios: quiet evidence, elevated fire evidence and overlapping geographic/year registration.
- Versioned deterministic screening, separate completeness, missing annual evidence → review required, source dates/errors/limitations, no verified tonnes.
- Server-side Open-Meteo historical ERA5 integration: a real 2024 check returned 366 daily values and 1,937.9 mm annual precipitation at the fixture-area center. A separate browser live-mode check for Xingu in 2025 returned 1,181.3 mm. These modeled values were actually retrieved, not fixtures; neither receives risk points.
- FIRMS 5-day sample adapter with polygon filtering and disabled annual scoring. The supplied MAP key was subsequently configured server-side and verified against NASA: HTTP 200 with valid CSV and zero returned detections for the seeded Tapajós bounding box, 27–31 December 2025. NASA rejected the original ten-day request, so the adapter was corrected to its current five-day limit. All 21 application tests passed again. This sample does not satisfy annual screening.
- Gemini structured explanation adapter, exact allowed factual statements, evidence-reference validation, and labeled template fallback. Mocked success, invented facts and mismatched citations were tested. The supplied Gemini key was subsequently configured server-side and authenticated successfully. A real explanation request initially returned HTTP 503 (high demand), correctly triggering the labeled template; one retry returned HTTP 200, and the actual application validated the Gemini explanation and evidence references. The opt-in live verification test passed. Default model is configurable `gemini-3.5-flash-lite`, selected from current official model documentation.
- Development SQLite persistence, production guard requiring durable remote libSQL, canonical downloads and reproducible Keccak-256 hashes.
- Solidity registry with sorted unique cell constraints, same-year reservations, owner retirement and permanent reservations after retirement.
- Real local-EVM browser registrations for quiet and fire scenarios. Browser duplicate submission rejected with decoded `CellReserved`; owner retirement confirmed; duplicate still rejected after retirement.
- Audit activity, actual local transaction hashes and download links. Local transactions are explicitly labeled local, with no fake BaseScan links.

## Checks actually run

| Check                               | Result                                                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                      | Passed, no warnings/errors                                                                                                                                |
| `npm run typecheck`                 | Passed                                                                                                                                                    |
| `npm test`                          | 21 application tests passed                                                                                                                               |
| `npm run chain:test`                | 21 checks passed against compiled contract on a real ephemeral local EVM                                                                                  |
| `npm run test:foundry -- --offline` | 8 Foundry tests passed with solc 0.8.30                                                                                                                   |
| `npm run build`                     | Next.js production Webpack build passed                                                                                                                   |
| `npm run smoke -- --live`           | API → persistence → canonical download hashes → quiet/fire EVM writes → duplicate rejection passed; actual live weather available                         |
| Browser checks                      | Quiet/fire results, registration confirmations, duplicate rejection, owner retirement, retained cells, and live review-required/25% completeness verified |

An initial sandbox DNS failure required approved network installation. Turbopack's CSS worker crashed on this Windows environment; scripts use the supported Webpack path, which builds successfully. Ganache uses its JavaScript transport fallback under Node 24 and prints a native µWS compatibility notice; tested EVM functionality passes. Foundry prints a non-fatal missing signature-cache warning. An initial online compiler lookup stalled, so the final Foundry run used its downloaded compiler offline.

The initial local browser was checked at the in-app browser's narrow viewport. The hosted desktop layout was subsequently inspected and captured in hosted-preview.png. Screenshots are included as `audit-preview.png` and `live-preview.png`. Desktop layout is implemented responsively but was not separately resized/captured. Browser-extension wallet signing/rejection and a wrong-network wallet were not exercised with an installed extension; those code paths remain for manual verification.

## Deployment status and precise remaining setup

**Base Sepolia registry and hosted web application deployed and verified.** Public app: https://proof-of-carbon-five.vercel.app. Production deployment dpl_Coe5ahXpgBaMNbRj57JhdgXGdcQk is READY in the Pranav Vercel team. Unauthenticated public GET returns HTTP 200. Hosted API screening, durable Turso write/read, canonical download hashes and actual NASA/Open-Meteo requests passed. The hosted smoke test also registered quiet/fire reports and rejected the duplicate on an ephemeral local EVM; this is not a claim of hosted Base Sepolia wallet-write testing. The original Gemini 3.8 model returned provider HTTP 503. Production was switched to live-tested Gemini 3.5 Flash-Lite. Both quiet and fire hosted checks now return HTTP 200 with origin Gemini, valid evidence-linked explanations, durable storage, and unchanged deterministic scores of 0 and 70. The labeled template remains available for future provider outages. Production-only dependency audit reports zero known vulnerabilities; remaining npm audit warnings are in development dependencies. Registry: `0x19d794c34698d240c56dbf6d61c5508794024af8` on chain 84532. An RPC read confirmed that its full runtime bytecode exactly matches the tested contract compiled with solc 0.8.30, optimizer 200 runs and Shanghai EVM. Read calls confirmed MAX_CELLS=64 and MAX_CELL_ID=648000000. This is an independent bytecode comparison, not a claim of explorer source verification. See base-sepolia-deployment.json. The temporary local chain is stopped; use the hosted app for follow-up testing.

The working checkout's ignored `.env.local` is configured for the verified Base Sepolia registry and durable Turso storage. The source archive excludes `.env.local`, databases, dependency directories, build output and test runtime state. It contains `.env.example` and the lockfile.

To deploy:

1. Contract deployment is complete using the user wallet. No private key was supplied to the app or chat.
2. Public chain settings are configured locally for chain 84532 and the verified address. These settings are also configured on Vercel; no additional registry deployment is needed.
3. The remote Turso database is provisioned and its URL/token are configured and verified locally. Those server-only settings are configured on Vercel. Production screening deliberately refuses the development file database.
4. NASA FIRMS and Gemini keys are configured in ignored local server environment files and have been verified with their official APIs. Template explanation remains available on provider failure. Both secrets are configured as Vercel production Secret environment variables. The 5-day sample does not establish annual coverage.
5. The Next.js application is deployed on Vercel and hosted persistence checks pass. User-approved Base Sepolia wallet registration/retirement remains a manual browser check. See DEPLOYMENT.md.

## Material prototype limits

Risk weights are heuristic and only one scoring rule is enabled for complete annual inputs. Live annual fire/forest verification is not implemented; live screening therefore requires review. Gemini selects constrained statements rather than writing unconstrained narrative. Source coverage and weather do not verify climate outcomes. The contract trusts caller-submitted scores, hashes and cell sets; it is not a polygon oracle or global duplicate detector. Coarse cells can reject nearby non-overlapping projects. Record retirement is not recognized carbon-credit retirement. Reports require independent availability/backup arrangements; hashes do not preserve the underlying files.

Use a protected hackathon deployment. Distributed rate limiting, account access control, independent attestations, production observability and backups remain adoption work, not completed claims.

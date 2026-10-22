# Deployment runbook

## Base Sepolia

Prerequisites: an authorized deployer available securely through the process environment, Base Sepolia test ETH, and a working RPC. Do not paste private keys in chat, commit them, or put them in `NEXT_PUBLIC_*` variables.

1. Run the application and contract checks in the README.
2. In a secure terminal environment set `DEPLOYER_PRIVATE_KEY` and optionally `BASE_SEPOLIA_RPC_URL`. The deploy script reads process environment, not `.env.local`.
3. Run `npm run deploy:base`. It checks chain 84532 and nonzero balance, compiles the registry, submits, waits for success, and prints the actual public address and explorer link.
4. Set `NEXT_PUBLIC_CHAIN_ID=84532`, `NEXT_PUBLIC_RPC_URL=https://sepolia.base.org` (or your authorized RPC), and `NEXT_PUBLIC_REGISTRY_ADDRESS` to the returned address. Public variables are baked into the client build; rebuild after any change.
5. Connect a browser wallet on Base Sepolia with test ETH. Register quiet and fire scenarios, then attempt the overlapping duplicate. Check receipts on BaseScan. Retire as owner and check retained reservations.

Foundry alternative: `forge create --root contracts src/ProofOfCarbon.sol:ProofOfCarbon --rpc-url <rpc> --account <secure-keystore-account> --broadcast`. Use a Foundry keystore or secure signer; no command-line private key. Source verification is optional and requires your own explorer API configuration; never claim verification before the explorer confirms it.

## Web application

Use a Node-capable Next.js host. This app uses Node route handlers and is not a static export. No paid resource provisioning or public deployment is implied by this runbook.

1. Provision durable **remote libSQL** storage. Configure `DATABASE_URL=libsql://<database-host>` and server-only `DATABASE_AUTH_TOKEN`. Tables initialize on first write/read. File URLs are explicitly refused in production.
2. Configure optional server secrets `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-3.5-flash-lite`), `FIRMS_MAP_KEY`. Without Gemini a labeled template is used. Without FIRMS a source error appears. Open-Meteo requires no key.
3. Configure the three public chain variables above before building. Do not deploy local-chain configuration to a hosted website.
4. Install with `npm ci`, build with `npm run build`, run `npm start`. A platform can run those commands directly; a traditional server can front localhost port 3000 with an HTTPS reverse proxy. Supply environment secrets through the host's secret manager.
5. Protect the hackathon deployment with host access control and request limits. API source timeouts and bounded inputs do not substitute for a distributed rate limiter.
6. Verify a demo screening, canonical downloads, report retrieval after a server restart, live weather source status, connected-wallet writes, duplicate rejection and retirement against the configured chain. Ensure logs contain no API keys.

## Local verification versus production

Development SQLite and loopback unlocked EVM accounts are only for local demonstration. The contract is not an oracle: any caller can bypass the application and submit arbitrary hashes/cells/scores. Treat this as an integrity and submitted-cell reservation prototype.

If credentials, a durable database, or testnet funds are unavailable, do not invent an address or deploy link. Finish local verification and record the missing setup in HANDOFF.md.

## Deploy through MetaMask without exporting a private key

Start `npm run dev`, then open `http://127.0.0.1:3000/deploy` in the Chrome browser containing MetaMask. Connect the wallet, switch to Base Sepolia, and approve Deploy registry. This page uses the compiled `lib/registry-artifact.json`; regenerate it after contract changes with `node scripts/build-registry-artifact.mjs`. It shows the real confirmed transaction and address after checking the transaction creation bytecode. Wallet signing remains with the user. Copy the actual address into the public configuration and rebuild the main app. No deployment is claimed until confirmation.

"use client";
import { useState, useEffect, useCallback } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  isAddress,
  type EIP1193Provider,
  type Hex,
} from "viem";
import {
  chain,
  rpc,
  isLocal,
  registryAddress,
  registryAbi,
} from "@/lib/registry";
import type { Report } from "@/lib/domain";
import { contractErrorName } from "@/lib/contract-errors";
import { connectBrowserWallet } from "@/lib/wallet";
import { Link2, Wallet, ExternalLink, RefreshCw } from "lucide-react";
type Entry = {
  id: Hex;
  tx: Hex;
  reportHash: Hex;
  name: string;
  year: number;
  owner: Hex;
  retired: boolean;
  retireTx?: Hex;
};
declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}
export default function RegistryPanel({
  report,
  onAudit,
}: {
  report: Report | null;
  onAudit?: (entries: number) => void;
}) {
  const [account, setAccount] = useState<Hex>(),
    [local, setLocal] = useState(false),
    [status, setStatus] = useState("Connect a wallet to anchor a report."),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState<Entry[]>([]),
    [error, setError] = useState("");
  const client = createPublicClient({ chain, transport: http(rpc) });
  const storageKey = `poc-audit-${chain.id}-${registryAddress || "unconfigured"}`;
  useEffect(() => {
    const load = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
        if (Array.isArray(parsed))
          setHistory(
            parsed.filter(
              (e) =>
                e &&
                /^0x[0-9a-f]{64}$/.test(e.id) &&
                /^0x[0-9a-f]{64}$/.test(e.tx),
            ),
          );
      } catch {
        /* An invalid browser cache is non-authoritative. */
      }
    };
    const timer = window.setTimeout(load, 0);
    window.addEventListener("storage", load);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", load);
    };
  }, [storageKey]);
  useEffect(() => {
    onAudit?.(history.length);
  }, [history.length, onAudit]);
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    const reset = () => {
      setAccount(undefined);
      setStatus("Wallet changed. Reconnect before writing.");
    };
    const p = provider as EIP1193Provider & {
      on?: (event: string, fn: () => void) => void;
      removeListener?: (event: string, fn: () => void) => void;
    };
    p.on?.("accountsChanged", reset);
    p.on?.("chainChanged", reset);
    return () => {
      p.removeListener?.("accountsChanged", reset);
      p.removeListener?.("chainChanged", reset);
    };
  }, []);
  function persist(entries: Entry[]) {
    setHistory(entries);
    localStorage.setItem(storageKey, JSON.stringify(entries));
  }
  async function connect(useLocal = false) {
    setError("");
    setAccount(undefined);
    try {
      if (useLocal) {
        if (
          !isLocal ||
          !/^http:\/\/(127\.0\.0\.1|localhost):8545\/?$/.test(rpc)
        )
          throw Error(
            "Local demo wallet is available only for loopback chain 31337.",
          );
        const w = createWalletClient({ chain, transport: http(rpc) });
        const [a] = await w.getAddresses();
        if (!a) throw Error("No unlocked local accounts.");
        setAccount(a);
        setLocal(true);
        setStatus("Local demo wallet connected · test funds only.");
        return;
      }
      if (!window.ethereum)
        throw Error(
          "No browser wallet found. Install an EIP-1193 wallet, or use the configured local-chain demo.",
        );
      setLocal(false);
      setStatus(`Connecting wallet on ${chain.name}…`);
      const a = await connectBrowserWallet(window.ethereum, chain);
      // Publish connected state only after network/account change events settle.
      setAccount(a);
      setStatus("Wallet connected. Report ready for simulation.");
    } catch (e) {
      setError(message(e));
    }
  }
  function message(e: unknown) {
    const m = e instanceof Error ? e.message : String(e);
    const name = contractErrorName(e);
    if (name === "CellReserved" || m.includes("CellReserved"))
      return "Duplicate rejected by the contract: a submitted cell is already reserved for this reporting year.";
    if (m.includes("rejected") || m.includes("denied"))
      return "Transaction rejected in your wallet. No confirmed registration was recorded.";
    if (name === "InvalidInput" || m.includes("InvalidInput"))
      return "Contract rejected invalid or already-registered input. Use the duplicate scenario for an overlapping claim with a new report hash.";
    return m.slice(0, 500);
  }
  async function write(retire?: Entry) {
    setError("");
    if (!account) return setError("Connect a wallet first.");
    if (!registryAddress || !isAddress(registryAddress))
      return setError(
        "Registry is not deployed/configured. Run the local-chain script or deploy to Base Sepolia, then set NEXT_PUBLIC_REGISTRY_ADDRESS.",
      );
    if (!report && !retire) return;
    setBusy(true);
    try {
      const w = createWalletClient({
        chain,
        transport: local ? http(rpc) : custom(window.ethereum!),
      });
      if ((await w.getChainId()) !== chain.id)
        throw Error(`Wrong network. Switch to ${chain.name}.`);
      const addresses = await w.getAddresses();
      if (!addresses.some((a) => a.toLowerCase() === account.toLowerCase()))
        throw Error("Connected account changed. Reconnect wallet.");
      if (
        (await client.getBytecode({ address: registryAddress })) === "0x" ||
        !(await client.getBytecode({ address: registryAddress }))
      )
        throw Error("No registry contract found at configured address.");
      setStatus("Simulating contract call…");
      let tx: Hex;
      if (retire) {
        const simulation = await client.simulateContract({
          address: registryAddress,
          abi: registryAbi,
          functionName: "retireClaim",
          args: [retire.id],
          account,
        });
        const gas = await client.estimateContractGas(simulation.request);
        setStatus(
          local
            ? "Submitting local transaction…"
            : "Confirm the transaction in your wallet…",
        );
        tx = await w.writeContract({ ...simulation.request, gas });
      } else {
        const simulation = await client.simulateContract({
          address: registryAddress,
          abi: registryAbi,
          functionName: "registerClaim",
          args: [
            report!.claimHash,
            report!.reportHash,
            report!.screening.score,
            report!.claim.year,
            report!.claim.cells,
          ],
          account,
        });
        const gas = await client.estimateContractGas(simulation.request);
        setStatus(
          local
            ? "Submitting local transaction…"
            : "Confirm the transaction in your wallet…",
        );
        tx = await w.writeContract({ ...simulation.request, gas });
      }
      setStatus(`Pending confirmation · ${tx.slice(0, 14)}…`);
      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== "success") throw Error("Transaction reverted.");
      if (retire) {
        persist(
          history.map((e) =>
            e.id === retire.id ? { ...e, retired: true, retireTx: tx } : e,
          ),
        );
        setStatus(
          "Prototype registry record retired. Cell reservations retained.",
        );
      } else {
        const id = keccak256(
          encodeAbiParameters(parseAbiParameters("address,bytes32,bytes32"), [
            account,
            report!.claimHash,
            report!.reportHash,
          ]),
        );
        persist([
          {
            id,
            tx,
            reportHash: report!.reportHash,
            name: report!.claim.project,
            year: report!.claim.year,
            owner: account,
            retired: false,
          },
          ...history,
        ]);
        setStatus("Registration confirmed on " + chain.name + ".");
      }
    } catch (e) {
      setError(message(e));
      setStatus("Write not completed. See the contract or wallet error below.");
    } finally {
      setBusy(false);
    }
  }
  const refresh = useCallback(async () => {
    const address = registryAddress;
    if (!address) return;
    try {
      const c = createPublicClient({ chain, transport: http(rpc) });
      const entries = await Promise.all(
        history.map(async (e) => {
          const r = await c.readContract({
            address,
            abi: registryAbi,
            functionName: "records",
            args: [e.id],
          });
          return { ...e, retired: r[6] };
        }),
      );
      setHistory(entries);
      localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {
      setError(
        "Unable to refresh registry records. Check the RPC and deployed address.",
      );
    }
  }, [history, storageKey]);
  return (
    <section className="registry card" id="audit">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TAMPER-EVIDENT AUDIT</span>
          <h2>
            <Link2 size={21} /> Anchor the evidence
          </h2>
        </div>
        <span className="pill">{chain.name}</span>
      </div>
      <p>
        Register claim and report hashes, score, year and submitted cells.
        Hashes prove integrity, not truth or availability.
      </p>
      <div className="wallet-row">
        <button
          className="button dark"
          onClick={() => connect()}
          disabled={busy}
        >
          <Wallet size={16} />
          {account
            ? account.slice(0, 6) + "…" + account.slice(-4)
            : "Connect wallet"}
        </button>
        {isLocal && (
          <button
            className="button"
            disabled={busy}
            onClick={() => connect(true)}
          >
            Use local demo wallet
          </button>
        )}
        <button
          className="button lime"
          disabled={busy || !report || !account}
          onClick={() => write()}
        >
          {busy ? "Waiting…" : "Register report"}
        </button>
      </div>
      <div className="status" role="status">
        {status}
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="trust-note">
        Contract trust boundary: cells and scores are supplied by the caller.
        The contract cannot verify polygon coverage or attest the screening.
        Coarse cells can conflict for nearby, non-overlapping polygons.
      </div>
      <div className="audit-title">
        <h3>
          Registry activity <span>{history.length}</span>
        </h3>
        <button
          className="icon-button"
          aria-label="Refresh on-chain retirement state"
          onClick={refresh}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {history.length === 0 ? (
        <div className="empty">
          No confirmed transactions in this browser. Screening works without a
          wallet.
        </div>
      ) : (
        history.map((e) => (
          <div className="audit-entry" key={e.id}>
            <div>
              <strong>{e.name}</strong>
              <small>
                {e.year} ·{" "}
                {e.retired ? "Prototype record retired" : "Registered"} ·{" "}
                {e.reportHash.slice(0, 14)}…
              </small>
              <a href={`/api/reports/${e.reportHash}`}>
                Canonical report <ExternalLink size={12} />
              </a>
              {!isLocal ? (
                <a
                  href={`https://sepolia.basescan.org/tx/${e.tx}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Registration transaction <ExternalLink size={12} />
                </a>
              ) : (
                <small className="mono">Local transaction: {e.tx}</small>
              )}
              {e.retireTx &&
                (!isLocal ? (
                  <a
                    href={`https://sepolia.basescan.org/tx/${e.retireTx}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Retirement transaction <ExternalLink size={12} />
                  </a>
                ) : (
                  <small className="mono">Retirement: {e.retireTx}</small>
                ))}
            </div>
            {!e.retired && account?.toLowerCase() === e.owner.toLowerCase() && (
              <button
                className="button"
                disabled={busy}
                onClick={() => write(e)}
              >
                Retire record
              </button>
            )}
          </div>
        ))
      )}
      <small className="muted">
        Activity is a browser-local index of confirmed writes, refreshed against
        the contract. Record retirement is not retirement of a recognized carbon
        credit.
      </small>
    </section>
  );
}

"use client";
import Link from 'next/link';
import { useState } from "react";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  formatEther,
  keccak256,
  type EIP1193Provider,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";
import artifact from "@/lib/registry-artifact.json";
import { Leaf, Wallet, ExternalLink, CheckCircle2 } from "lucide-react";
export default function Deploy() {
  const [account, setAccount] = useState<Hex>(),
    [status, setStatus] = useState("Ready to connect your wallet."),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [address, setAddress] = useState<Hex>(),
    [tx, setTx] = useState<Hex>(),
    [estimate, setEstimate] = useState("");
  function provider() {
    const p = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
    if (!p)
      throw Error(
        "Open this page in the Chrome browser where you installed MetaMask. Codex’s in-app browser does not have your wallet extension.",
      );
    return p;
  }
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });
  async function connect() {
    setError("");
    setBusy(true);
    try {
      const wallet = createWalletClient({
        chain: baseSepolia,
        transport: custom(provider()),
      });
      const [a] = await wallet.requestAddresses();
      if (!a) throw Error("No wallet account selected.");
      if ((await wallet.getChainId()) !== baseSepolia.id) {
        try {
          await wallet.switchChain({ id: baseSepolia.id });
        } catch {
          await wallet.addChain({ chain: baseSepolia });
          await wallet.switchChain({ id: baseSepolia.id });
        }
      }
      setAccount(a);
      const gas = await publicClient.estimateGas({
        account: a,
        data: artifact.bytecode as Hex,
      });
      const fees = await publicClient.estimateFeesPerGas();
      const balance = await publicClient.getBalance({ address: a });
      const upper = ((gas * 120n) / 100n) * (fees.maxFeePerGas || 0n);
      setEstimate(
        `${formatEther(balance)} test ETH available · estimated gas ceiling ${formatEther(upper)} test ETH (network estimate, excludes possible L1 data fee). MetaMask shows the final fee.`,
      );
      setStatus(
        "Connected to Base Sepolia. Review the deployment and approve in MetaMask.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.slice(0, 600)
          : "Wallet connection failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function deploy() {
    if (!account) return;
    setBusy(true);
    setError("");
    try {
      const wallet = createWalletClient({
        chain: baseSepolia,
        transport: custom(provider()),
      });
      if ((await wallet.getChainId()) !== 84532)
        throw Error("Switch MetaMask to Base Sepolia before deploying.");
      const [a] = await wallet.getAddresses();
      if (a?.toLowerCase() !== account.toLowerCase())
        throw Error("Wallet account changed. Reconnect.");
      const gas = await publicClient.estimateGas({
        account,
        data: artifact.bytecode as Hex,
      });
      setStatus("Approve the contract deployment in your MetaMask window.");
      const hash = await wallet.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode as Hex,
        account,
        gas: (gas * 120n) / 100n,
      });
      setTx(hash);
      localStorage.setItem("poc-base-deployment-tx", hash);
      setStatus(
        "Transaction submitted. Waiting for Base Sepolia confirmation…",
      );
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 180000,
      });
      if (receipt.status !== "success" || !receipt.contractAddress)
        throw Error(
          "Deployment transaction reverted or produced no contract address.",
        );
      const transaction = await publicClient.getTransaction({ hash });
      if (
        transaction.to !== null ||
        transaction.input.toLowerCase() !== artifact.bytecode.toLowerCase()
      )
        throw Error(
          "Confirmed transaction does not match the compiled registry.",
        );
      const code = await publicClient.getBytecode({
        address: receipt.contractAddress,
      });
      if (!code || code === "0x")
        throw Error("No deployed code found at the receipt address.");
      setAddress(receipt.contractAddress);
      localStorage.setItem(
        "poc-base-deployment-address",
        receipt.contractAddress,
      );
      setStatus(
        "Deployment confirmed. Send the contract address or transaction link back to this chat so I can configure the app.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message.slice(0, 700) : "Deployment failed.",
      );
      setStatus(
        "No verified deployment recorded by this page. A submitted transaction may still need checking on BaseScan.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      style={{
        margin: "0 auto",
        width: "100%",
        maxWidth: 780,
        padding: "45px 20px",
      }}
    >
      <Link className="brand" href="/">
        <span className="brand-icon">
          <Leaf />
        </span>
        ProofOfCarbon
      </Link>
      <section className="card" style={{ padding: 30, marginTop: 25 }}>
        <span className="eyebrow">TESTNET CONTRACT DEPLOYMENT</span>
        <h1 style={{ fontSize: 34 }}>Deploy the audit registry.</h1>
        <p style={{ margin: "16px 0", color: "#718069" }}>
          Deploys the tested, non-upgradeable registry to{" "}
          <strong>Base Sepolia · chain 84532</strong>. MetaMask signs locally.
          The page never asks for your private key or recovery phrase.
        </p>
        <div className="trust-note">
          The contract records hashes, scores and submitted-cell reservations.
          It does not certify carbon credits or independently verify polygons or
          evidence.
        </div>
        <p className="mono muted" style={{ marginTop: 15 }}>
          Creation bytecode hash: {keccak256(artifact.bytecode as Hex)}
        </p>
        <div className="wallet-row" style={{ marginTop: 25 }}>
          <button
            className="button dark"
            disabled={busy || !!address}
            onClick={connect}
          >
            <Wallet size={16} />
            {account
              ? account.slice(0, 8) + "…" + account.slice(-6)
              : "Connect MetaMask"}
          </button>
          <button
            className="button lime"
            disabled={!account || busy || !!address}
            onClick={deploy}
          >
            {busy ? "Waiting…" : "Deploy registry"}
          </button>
        </div>
        {estimate && (
          <p className="muted" style={{ marginTop: 15 }}>
            {estimate}
          </p>
        )}
        <p className="status" role="status">
          {status}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {tx && (
          <p style={{ marginTop: 18 }}>
            <a
              className="button"
              href={`https://sepolia.basescan.org/tx/${tx}`}
              target="_blank"
              rel="noreferrer"
            >
              View deployment transaction <ExternalLink size={14} />
            </a>
          </p>
        )}
        {address && (
          <div className="trust-note">
            <CheckCircle2 size={20} />
            <strong>Confirmed contract address</strong>
            <p
              className="mono"
              style={{ fontSize: 13, marginTop: 8, overflowWrap: "anywhere" }}
            >
              {address}
            </p>
            <button
              className="button"
              style={{ marginTop: 12 }}
              onClick={() => navigator.clipboard.writeText(address)}
            >
              Copy contract address
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

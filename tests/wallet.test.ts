import { describe, it, expect, vi } from "vitest";
import { baseSepolia } from "viem/chains";
import type { EIP1193Provider } from "viem";
import { connectBrowserWallet } from "../lib/wallet";
const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";
describe("wallet connection ordering", () => {
  it("reads the current account after switching networks instead of returning a stale account", async () => {
    let chain = "0x1",
      account = A;
    const methods: string[] = [];
    const provider = {
      request: vi.fn(async ({ method }: { method: string }) => {
        methods.push(method);
        if (method === "eth_requestAccounts") return [A];
        if (method === "eth_accounts") return [account];
        if (method === "eth_chainId") return chain;
        if (method === "wallet_switchEthereumChain") {
          chain = "0x14a34";
          account = B;
          return null;
        }
        throw Error("Unexpected RPC");
      }),
    } as unknown as EIP1193Provider;
    expect(await connectBrowserWallet(provider, baseSepolia)).toBe(B);
    expect(methods.indexOf("eth_accounts")).toBeGreaterThan(
      methods.indexOf("wallet_switchEthereumChain"),
    );
  });
  it("does not expose a connected account when the wallet refuses the network switch", async () => {
    const provider = {
      request: async ({ method }: { method: string }) => {
        if (method === "eth_requestAccounts") return [A];
        if (method === "eth_chainId") return "0x1";
        throw Object.assign(Error("User rejected switch"), { code: 4001 });
      },
    } as unknown as EIP1193Provider;
    await expect(connectBrowserWallet(provider, baseSepolia)).rejects.toThrow();
  });
  it("verifies the network again when the wallet reports a successful switch", async () => {
    const provider = {
      request: async ({ method }: { method: string }) =>
        method === "eth_requestAccounts"
          ? [A]
          : method === "eth_chainId"
            ? "0x1"
            : null,
    } as unknown as EIP1193Provider;
    await expect(connectBrowserWallet(provider, baseSepolia)).rejects.toThrow(
      /Switch your wallet/,
    );
  });
  it("rejects a disconnected wallet with no exposed account", async () => {
    const provider = {
      request: async ({ method }: { method: string }) =>
        method === "eth_chainId" ? "0x14a34" : [],
    } as unknown as EIP1193Provider;
    await expect(connectBrowserWallet(provider, baseSepolia)).rejects.toThrow(
      /No wallet account/,
    );
  });
});

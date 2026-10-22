import ganache from "ganache";
import { createWalletClient, createPublicClient, http } from "viem";
import { compile } from "./compile.mjs";
const server = ganache.server({
  logging: { quiet: true },
  chain: { chainId: 31337, hardfork: "shanghai" },
  wallet: { deterministic: true },
});
await server.listen(8545, "127.0.0.1");
const wallet = createWalletClient({ transport: http("http://127.0.0.1:8545") });
const client = createPublicClient({ transport: http("http://127.0.0.1:8545") });
const [account] = await wallet.getAddresses();
const hash = await wallet.deployContract({
  ...compile(),
  account,
  chain: null,
  gas: 4000000n,
});
const receipt = await client.waitForTransactionReceipt({ hash });
console.log("Local-only EVM running at http://127.0.0.1:8545 (chain 31337).");
console.log(
  "Set NEXT_PUBLIC_CHAIN_ID=31337, NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545 and NEXT_PUBLIC_REGISTRY_ADDRESS=" +
    receipt.contractAddress +
    " in .env.local; restart Next.js.",
);
console.log(
  "Local funded accounts are intentionally unlocked through loopback RPC. Never expose this server publicly. Use the browser local-chain demo wallet for writes.",
);
await new Promise((resolve) => process.once("SIGINT", resolve));
await server.close();

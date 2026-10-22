import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { compile } from "./compile.mjs";
const key = process.env.DEPLOYER_PRIVATE_KEY;
if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key))
  throw Error(
    "Set DEPLOYER_PRIVATE_KEY securely in this process environment. Never paste a key into chat.",
  );
const rpc = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const account = privateKeyToAccount(key);
const transport = http(rpc);
const client = createPublicClient({ chain: baseSepolia, transport });
if ((await client.getChainId()) !== 84532)
  throw Error("RPC is not Base Sepolia.");
if ((await client.getBalance({ address: account.address })) === 0n)
  throw Error("Deployer needs Base Sepolia test ETH.");
const wallet = createWalletClient({ account, chain: baseSepolia, transport });
const hash = await wallet.deployContract(compile());
console.log("Deployment transaction:", hash);
const r = await client.waitForTransactionReceipt({ hash });
if (r.status !== "success") throw Error("Deployment reverted");
console.log("NEXT_PUBLIC_REGISTRY_ADDRESS=" + r.contractAddress);
console.log("Explorer: https://sepolia.basescan.org/tx/" + hash);

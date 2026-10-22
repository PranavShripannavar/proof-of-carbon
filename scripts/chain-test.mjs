import ganache from "ganache";
import assert from "node:assert/strict";
import {
  createWalletClient,
  createPublicClient,
  custom,
  keccak256,
  toBytes,
  encodeAbiParameters,
  parseAbiParameters,
  decodeErrorResult,
} from "viem";
import { compile } from "./compile.mjs";
const provider = ganache.provider({
  logging: { quiet: true },
  chain: { chainId: 31337, hardfork: "shanghai" },
  wallet: { totalAccounts: 2 },
});
const publicClient = createPublicClient({ transport: custom(provider) });
const wallet = createWalletClient({ transport: custom(provider) });
const accounts = await wallet.getAddresses();
const { abi, bytecode } = compile();
let checks = 0;
async function tx(fn, args, account = accounts[0]) {
  const gas = await publicClient.estimateContractGas({
    address,
    abi,
    functionName: fn,
    args,
    account,
  });
  const hash = await wallet.writeContract({
    address,
    abi,
    functionName: fn,
    args,
    account,
    chain: null,
    gas,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, "success");
  return receipt;
}
async function reject(fn, args, error, account = accounts[0]) {
  await assert.rejects(
    () =>
      publicClient.simulateContract({
        address,
        abi,
        functionName: fn,
        args,
        account,
      }),
    (e) => {
      let current = e;
      for (let i = 0; i < 10 && current; i++) {
        const raw =
          typeof current.data === "string"
            ? current.data
            : current.data?.result || current.data?.data;
        if (raw) {
          try {
            if (decodeErrorResult({ abi, data: raw }).errorName === error)
              return true;
          } catch {}
        }
        current = current.cause;
      }
      return String(e).includes(error);
    },
  );
  checks++;
}
let address;
try {
  const deployment = await wallet.deployContract({
    abi,
    bytecode,
    account: accounts[0],
    chain: null,
    gas: 4000000n,
  });
  address = (await publicClient.waitForTransactionReceipt({ hash: deployment }))
    .contractAddress;
  assert.ok(address);
  checks++;
  const c = keccak256(toBytes("claim")),
    r = keccak256(toBytes("report")),
    other = keccak256(toBytes("other"));
  const id = keccak256(
    encodeAbiParameters(parseAbiParameters("address,bytes32,bytes32"), [
      accounts[0],
      c,
      r,
    ]),
  );
  await tx("registerClaim", [c, r, 70, 2025, [1, 2]]);
  const record = await publicClient.readContract({
    address,
    abi,
    functionName: "records",
    args: [id],
  });
  assert.equal(record[0].toLowerCase(), accounts[0].toLowerCase());
  assert.equal(record[3], 70);
  assert.equal(record[6], false);
  checks++;
  await reject("registerClaim", [other, r, 0, 2025, [2, 3]], "CellReserved");
  await tx("registerClaim", [c, other, 0, 2026, [1, 2]]);
  checks++;
  await reject("retireClaim", [id], "NotOwner", accounts[1]);
  await tx("retireClaim", [id]);
  assert.equal(
    (
      await publicClient.readContract({
        address,
        abi,
        functionName: "records",
        args: [id],
      })
    )[6],
    true,
  );
  checks++;
  await reject("retireClaim", [id], "AlreadyRetired");
  await reject("registerClaim", [other, r, 0, 2025, [1]], "CellReserved");
  assert.equal(
    await publicClient.readContract({
      address,
      abi,
      functionName: "reservations",
      args: [2025, 1],
    }),
    id,
  );
  checks++;
  await reject("registerClaim", [other, r, 101, 2025, [5]], "InvalidInput");
  for (const cells of [
    [],
    [5, 5],
    [6, 5],
    [0],
    [648000001],
    Array.from({ length: 65 }, (_, i) => i + 100),
  ])
    await reject("registerClaim", [other, r, 0, 2025, cells], "InvalidInput");
  await reject("registerClaim", [other, r, 0, 1999, [5]], "InvalidInput");
  await reject(
    "registerClaim",
    ["0x" + "0".repeat(64), r, 0, 2025, [5]],
    "InvalidInput",
  );
  const max = Array.from({ length: 64 }, (_, i) => i + 100);
  await tx("registerClaim", [other, r, 0, 2025, max]);
  checks++;
  // Atomic rollback: cell 4 is visited before a conflict at cell 100.
  await reject(
    "registerClaim",
    [keccak256(toBytes("rollback")), r, 0, 2025, [4, 100]],
    "CellReserved",
  );
  assert.equal(
    await publicClient.readContract({
      address,
      abi,
      functionName: "reservations",
      args: [2025, 4],
    }),
    "0x" + "0".repeat(64),
  );
  checks++;
  console.log(
    `PASS ${checks} contract checks on real local EVM, including registration, duplicate rejection, owner retirement and retained reservations.`,
  );
} finally {
  await provider.disconnect();
}

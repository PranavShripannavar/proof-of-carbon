import solc from "solc";
import { readFileSync } from "node:fs";
export function compile() {
  const source = readFileSync(
    new URL("../contracts/src/ProofOfCarbon.sol", import.meta.url),
    "utf8",
  );
  const input = {
    language: "Solidity",
    sources: { "ProofOfCarbon.sol": { content: source } },
    settings: {
      evmVersion: "shanghai",
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter((e) => e.severity === "error");
  if (errors?.length)
    throw Error(errors.map((e) => e.formattedMessage).join("\n"));
  const c = output.contracts["ProofOfCarbon.sol"].ProofOfCarbon;
  return { abi: c.abi, bytecode: "0x" + c.evm.bytecode.object };
}

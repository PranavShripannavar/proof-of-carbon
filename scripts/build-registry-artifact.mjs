import { writeFileSync } from "node:fs";
import { compile } from "./compile.mjs";
writeFileSync(
  new URL("../lib/registry-artifact.json", import.meta.url),
  JSON.stringify(compile(), null, 2) + "\n",
);
console.log("Compiled ProofOfCarbon wallet deployment artifact.");

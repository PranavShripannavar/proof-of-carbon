import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const windows = new URL(
  "../node_modules/@foundry-rs/forge-win32-amd64/bin/forge.exe",
  import.meta.url,
);
const command =
  process.platform === "win32" && existsSync(windows) ? windows : "forge";
const result = spawnSync(
  command instanceof URL ? fileURLToPath(command) : command,
  ["test", "--root", "contracts", "-vv", ...process.argv.slice(2)],
  { stdio: "inherit", shell: false },
);
if (result.error)
  console.error(
    "Install Foundry from https://getfoundry.sh/introduction/installation, then retry.",
  );
process.exit(result.status ?? 1);

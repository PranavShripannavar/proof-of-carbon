import { decodeErrorResult } from "viem";
import { registryAbi } from "./registry";
// Some local RPCs use -32000 for reverts; viem's automatic decoder expects code 3.
// Decode actual revert bytes rather than guessing from an RPC error message.
export function contractErrorName(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 10 && current && typeof current === "object"; i++) {
    const e = current as {
      data?: unknown;
      cause?: unknown;
      errorName?: string;
    };
    if (e.errorName) return e.errorName;
    const raw =
      typeof e.data === "string"
        ? e.data
        : e.data && typeof e.data === "object"
          ? (e.data as { result?: unknown; data?: unknown }).result ||
            (e.data as { data?: unknown }).data
          : undefined;
    if (typeof raw === "string" && /^0x[0-9a-fA-F]+$/.test(raw)) {
      try {
        return decodeErrorResult({
          abi: registryAbi,
          data: raw as `0x${string}`,
        }).errorName;
      } catch {
        /* Not registry revert data. */
      }
    }
    current = e.cause;
  }
}

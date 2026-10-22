import { parseAbi, defineChain } from "viem";
import { baseSepolia } from "viem/chains";
export const registryAbi = parseAbi([
  "function registerClaim(bytes32 claimHash, bytes32 reportHash, uint8 score, uint16 year, uint32[] cells) returns (bytes32 id)",
  "function retireClaim(bytes32 id)",
  "function records(bytes32) view returns (address owner, bytes32 claimHash, bytes32 reportHash, uint8 score, uint16 year, uint64 registeredAt, bool retired)",
  "function reservations(uint16,uint32) view returns (bytes32)",
  "function getCells(bytes32 id) view returns (uint32[])",
  "event ClaimRegistered(bytes32 indexed id, address indexed owner, bytes32 indexed claimHash, bytes32 reportHash, uint8 score, uint16 year, uint32[] cells)",
  "event ClaimRetired(bytes32 indexed id,address indexed owner)",
  "error InvalidInput()",
  "error CellReserved(uint32 cell,uint16 year,bytes32 existing)",
  "error NotOwner()",
  "error AlreadyRetired()",
]);
export const isLocal = process.env.NEXT_PUBLIC_CHAIN_ID === "31337";
export const chain = isLocal
  ? defineChain({
      id: 31337,
      name: "Local prototype EVM",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
    })
  : baseSepolia;
export const rpc =
  process.env.NEXT_PUBLIC_RPC_URL || chain.rpcUrls.default.http[0];
export const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as
  `0x${string}` | undefined;

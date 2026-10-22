import {
  createWalletClient,
  custom,
  type Chain,
  type EIP1193Provider,
} from "viem";

export async function connectBrowserWallet(
  provider: EIP1193Provider,
  chain: Chain,
) {
  const wallet = createWalletClient({ chain, transport: custom(provider) });
  await wallet.requestAddresses();
  if ((await wallet.getChainId()) !== chain.id)
    await wallet.switchChain({ id: chain.id });
  if ((await wallet.getChainId()) !== chain.id)
    throw Error(
      `Switch your wallet to ${chain.name} (chain ${chain.id}) and reconnect.`,
    );
  // Switching a network can also change the exposed account. Read it afterwards.
  const [account] = await wallet.getAddresses();
  if (!account) throw Error("No wallet account selected. Reconnect MetaMask.");
  return account;
}

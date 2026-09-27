import {
  createPublicClient,
  http,
  isAddress,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { base } from "viem/chains";
import {
  entryPoint07Address,
  toWebAuthnAccount,
} from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { toKernelSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { credentialFromWallet } from "@/lib/passkey-wallet";
import type { PasskeyWallet } from "@/lib/types";

const chain = base;

export function bundlerUrl() {
  const explicit = process.env.NEXT_PUBLIC_BUNDLER_URL;
  if (explicit) return explicit;
  const key = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
  if (!key) return null;
  return `https://api.pimlico.io/v2/${chain.id}/rpc?apikey=${key}`;
}

export function hasBundler() {
  return Boolean(bundlerUrl());
}

function publicClient() {
  return createPublicClient({
    chain,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://mainnet.base.org"),
  });
}

export async function kernelAccountFromPasskey(wallet: PasskeyWallet) {
  const owner = toWebAuthnAccount({
    credential: credentialFromWallet(wallet),
    rpId: window.location.hostname,
  });
  return toKernelSmartAccount({
    client: publicClient(),
    version: "0.3.1",
    owners: [owner],
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    ...(wallet.kernelAddress ? { address: wallet.kernelAddress } : {}),
  });
}

export async function resolveSmartAccountAddress(wallet: PasskeyWallet) {
  const account = await kernelAccountFromPasskey(wallet);
  return account.address;
}

export async function sendEthWithPasskey(input: {
  wallet: PasskeyWallet;
  to: string;
  amount: string;
}) {
  if (!isAddress(input.to)) {
    throw new Error("That is not an Ethereum address.");
  }
  const amount = input.amount.trim();
  if (!amount || Number(amount) <= 0) {
    throw new Error("Enter how much ETH to send.");
  }

  const url = bundlerUrl();
  if (!url) {
    throw new Error(
      "Add NEXT_PUBLIC_PIMLICO_API_KEY to broadcast. Face ID signs the UserOp once the bundler is set.",
    );
  }

  const execution = publicClient();
  const account = await kernelAccountFromPasskey(input.wallet);
  const pimlico = createPimlicoClient({
    chain,
    transport: http(url),
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });
  const client = createSmartAccountClient({
    account,
    client: execution,
    chain,
    bundlerTransport: http(url),
    paymaster: {
      getPaymasterData: (args) => pimlico.getPaymasterData(args),
      getPaymasterStubData: (args) => pimlico.getPaymasterStubData(args),
    },
    userOperation: {
      estimateFeesPerGas: async () =>
        (await pimlico.getUserOperationGasPrice()).fast,
    },
  });

  const hash = await client.sendTransaction({
    calls: [
      {
        to: input.to as Address,
        value: parseEther(amount),
        data: "0x" as Hex,
      },
    ],
  });

  return { hash, account: account.address };
}

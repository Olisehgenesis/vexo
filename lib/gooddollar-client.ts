"use client";

import { createPublicClient, createWalletClient, custom, http } from "viem";
import { celo } from "viem/chains";
import { IdentitySDK } from "@goodsdks/citizen-sdk";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export async function startGoodDollarFace(callbackUrl: string) {
  if (!window.ethereum) {
    throw new Error("No wallet on this device. Use GoodWallet or paste your Celo address.");
  }

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  const account = accounts[0] as `0x${string}`;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xa4ec" }],
    });
  } catch {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0xa4ec",
          chainName: "Celo",
          nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
          rpcUrls: ["https://forno.celo.org"],
          blockExplorerUrls: ["https://celoscan.io"],
        },
      ],
    });
  }

  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: custom(window.ethereum),
  });
  const publicClient = createPublicClient({
    chain: celo,
    transport: http("https://forno.celo.org"),
  });
  const sdk = await IdentitySDK.init({
    publicClient,
    walletClient,
    env: "production",
  });
  const url = await sdk.generateFVLink(false, callbackUrl, 42220);
  return { address: account, url };
}

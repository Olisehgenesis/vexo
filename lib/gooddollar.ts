import {
  createPublicClient,
  http,
  isAddress,
  zeroAddress,
  type Address,
} from "viem";
import { celo } from "viem/chains";
import {
  chainConfigs,
  identityV2ABI,
  SupportedChains,
} from "@goodsdks/citizen-sdk";

const identityAddress =
  chainConfigs[SupportedChains.CELO].contracts.production?.identityContract;

export const GOODDOLLAR_WALLET = "https://wallet.gooddollar.org";
export const GOODDOLLAR_CLAIM = "https://wallet.gooddollar.org/#/Claim";

export async function gooddollarStatus(account: string) {
  if (!isAddress(account)) {
    throw new Error("That is not a wallet address.");
  }
  if (!identityAddress) {
    throw new Error("GoodDollar identity contract is not configured.");
  }

  const client = createPublicClient({
    chain: celo,
    transport: http("https://forno.celo.org"),
  });

  const root = await client.readContract({
    address: identityAddress,
    abi: identityV2ABI,
    functionName: "getWhitelistedRoot",
    args: [account as Address],
  });

  const isWhitelisted = root !== zeroAddress;
  return {
    address: account as Address,
    isWhitelisted,
    root,
  };
}

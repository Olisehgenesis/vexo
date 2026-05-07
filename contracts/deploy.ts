
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoSepolia, celo } from "viem/chains";

// ── Config ──────────────────────────────────────────────────────────────────
const PRIVATE_KEY   = process.env.PRIVATE_KEY   as `0x${string}`;
const RPC_URL       = process.env.RPC_URL       ?? "https://celo-sepolia.infura.io/v3/public";
const NETWORK       = process.env.NETWORK       ?? "celoSepolia"; // "celoSepolia" | "celo"
const IMPL_BYTECODE = process.env.IMPL_BYTECODE as `0x${string}` | undefined;
const PROXY_BYTECODE= process.env.PROXY_BYTECODE as `0x${string}` | undefined;

if (!PRIVATE_KEY)    throw new Error("Set PRIVATE_KEY env variable");
if (!IMPL_BYTECODE)  throw new Error("Set IMPL_BYTECODE  (solc --bin contracts/VexoCore.sol)");
if (!PROXY_BYTECODE) throw new Error("Set PROXY_BYTECODE (solc --bin contracts/VexoProxy.sol)");

const chain = NETWORK === "celo" ? celo : celoSepolia;

// ── ABIs (minimal — only what deploy needs) ──────────────────────────────────
const IMPL_ABI = [] as const; // VexoCore has no constructor args

const PROXY_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_impl",  type: "address" },
      { name: "_admin", type: "address" },
      { name: "_data",  type: "bytes"   },
    ],
    stateMutability: "nonpayable",
  },
] as const;

const INITIALIZE_ABI = [
  {
    name: "initialize",
    type: "function",
    inputs: [{ name: "_owner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ── Deploy ───────────────────────────────────────────────────────────────────
async function deploy() {
  const account = privateKeyToAccount(PRIVATE_KEY);

  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

  console.log(`\nDeploying on ${NETWORK} from ${account.address}\n`);

  // 1 ─ Deploy VexoCore implementation
  console.log("1/2  Deploying VexoCore implementation…");
  const implHash = await walletClient.deployContract({
    abi: IMPL_ABI,
    bytecode: IMPL_BYTECODE as any,
  });
  const implReceipt = await publicClient.waitForTransactionReceipt({ hash: implHash });
  const implAddress = implReceipt.contractAddress!;
  console.log("     ✅ VexoCore implementation:", implAddress);

  // 2 ─ Deploy VexoProxy, calling initialize(deployer) via delegatecall in its constructor
  console.log("\n2/2  Deploying VexoProxy…");
  const initData = encodeFunctionData({
    abi: INITIALIZE_ABI,
    functionName: "initialize",
    args: [account.address],
  });

  const proxyHash = await walletClient.deployContract({
    abi: PROXY_ABI,
    bytecode: PROXY_BYTECODE as any,
    args: [implAddress, account.address, initData],
  });
  const proxyReceipt = await publicClient.waitForTransactionReceipt({ hash: proxyHash });
  const proxyAddress = proxyReceipt.contractAddress!;
  console.log("     ✅ VexoProxy (use this address):", proxyAddress);

  console.log(`
─────────────────────────────────────────────
Add to .env.local:
  NEXT_PUBLIC_VEXO_CONTRACT_ADDRESS=${proxyAddress}

Implementation (for verification / upgrades):
  ${implAddress}
─────────────────────────────────────────────`);
}

deploy().catch(console.error);

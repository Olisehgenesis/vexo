import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { celo } from "viem/chains";

export const config = getDefaultConfig({
  appName: "vexoSocial",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "YOUR_WALLETCONNECT_PROJECT_ID",
  chains: [celo],
  ssr: true,
});

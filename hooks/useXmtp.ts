"use client";

/**
 * XMTP context — use `useXmtp()` in any client component to access the client.
 * The provider lives in components/XmtpProvider.tsx.
 */
import { createContext, useContext } from "react";
import { type Client } from "@xmtp/browser-sdk";

export interface XmtpContextValue {
  client: Client | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const XmtpContext = createContext<XmtpContextValue>({
  client: null,
  isConnecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
});

export function useXmtp() {
  return useContext(XmtpContext);
}

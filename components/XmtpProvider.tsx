"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { type Client } from "@xmtp/browser-sdk";
import { createXmtpClient } from "@/lib/xmtp";
import { XmtpContext } from "@/hooks/useXmtp";

/**
 * XmtpProvider — wraps the app with a single shared XMTP Client.
 *
 * Only ONE client instance per browser tab because the OPFS SQLite VFS
 * does not support multiple simultaneous connections.
 */
export function XmtpProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [client, setClient] = useState<Client | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectingRef = useRef(false);

  const connect = useCallback(async () => {
    if (!address || connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    setError(null);
    try {
      const newClient = await createXmtpClient(address, (msg) =>
        signMessageAsync({ message: msg })
      );
      setClient(newClient);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect XMTP");
    } finally {
      setIsConnecting(false);
      connectingRef.current = false;
    }
  }, [address, signMessageAsync]);

  const disconnect = useCallback(() => {
    setClient(null);
    setError(null);
  }, []);

  // Auto-connect when wallet connects (or on first render if already connected)
  useEffect(() => {
    if (address && !client && !connectingRef.current) {
      connect();
    }
  }, [address, client, connect]);

  return (
    <XmtpContext.Provider value={{ client, isConnecting, error, connect, disconnect }}>
      {children}
    </XmtpContext.Provider>
  );
}

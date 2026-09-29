"use client";

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LocalIdentityProvider } from "@/lib/identity";
import { getState, hydrate, signInLocal, signOut } from "@/lib/store";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function BootScreen() {
  return (
    <div className="phone-shell grid place-items-center">
      <p className="font-[family-name:var(--font-mark)] text-2xl text-orchid">
        Vexo
      </p>
    </div>
  );
}

function LocalBridge({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    hydrate()
      .catch((error) => {
        console.error("Vexo hydrate failed", error);
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(
    () => ({
      ready,
      authenticated: Boolean(getState().currentUserId),
      subject: getState().currentUserId,
      mode: "local" as const,
      login: async () => {
        const { signInWithDevicePasskey } = await import("@/lib/passkey-auth");
        await signInWithDevicePasskey();
        setTick((n) => n + 1);
      },
      logout: async () => {
        signOut();
        setTick((n) => n + 1);
      },
    }),
    [ready, tick],
  );

  if (!ready) return <BootScreen />;
  return <LocalIdentityProvider value={value}>{children}</LocalIdentityProvider>;
}

function PrivyBridge({ children }: { children: ReactNode }) {
  const privy = usePrivy();
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    hydrate()
      .catch((error) => {
        console.error("Vexo hydrate failed", error);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!privy.ready || !privy.authenticated || !privy.user?.id) return;
    signInLocal(privy.user.id).then(() => setTick((n) => n + 1));
  }, [privy.ready, privy.authenticated, privy.user?.id]);

  const value = useMemo(
    () => ({
      ready: ready && privy.ready,
      authenticated: Boolean(privy.authenticated || getState().currentUserId),
      subject: getState().currentUserId,
      mode: "privy" as const,
      login: async () => {
        privy.login();
      },
      logout: async () => {
        signOut();
        if (privy.authenticated) await privy.logout();
        setTick((n) => n + 1);
      },
    }),
    [ready, tick, privy],
  );

  if (!value.ready) return <BootScreen />;
  return <LocalIdentityProvider value={value}>{children}</LocalIdentityProvider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  if (!privyAppId) {
    return <LocalBridge>{children}</LocalBridge>;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#A855F7",
        },
        loginMethods: ["email", "google", "sms", "wallet"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}

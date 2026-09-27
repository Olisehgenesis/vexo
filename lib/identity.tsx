"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

type Identity = {
  ready: boolean;
  authenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  subject: string | null;
  mode: "privy" | "local";
};

const IdentityContext = createContext<Identity | null>(null);

export function useIdentity() {
  const value = useContext(IdentityContext);
  if (!value) throw new Error("Identity missing");
  return value;
}

export function LocalIdentityProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: Identity;
}) {
  const memo = useMemo(() => value, [value]);
  return (
    <IdentityContext.Provider value={memo}>{children}</IdentityContext.Provider>
  );
}

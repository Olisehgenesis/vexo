"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { currentUser } from "@/lib/store";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!currentUser()) router.replace("/");
  }, [router]);

  if (!currentUser()) return null;

  return <AppShell>{children}</AppShell>;
}

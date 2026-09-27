"use client";

import { use } from "react";
import { PublicCardView } from "@/components/public-card-view";

export default function UsernameCardPage({
  params,
}: {
  params: Promise<{ username: string; card: string }>;
}) {
  const { username, card } = use(params);
  return <PublicCardView username={username} slug={card} />;
}

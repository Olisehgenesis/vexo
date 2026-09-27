"use client";

import { use } from "react";
import { PublicCardView } from "@/components/public-card-view";

export default function UsernamePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  return <PublicCardView username={username} />;
}

"use client";

import { Suspense } from "react";
import MintPassPage from "./mint-pass";

export default function MintRoute() {
  return (
    <Suspense fallback={null}>
      <MintPassPage />
    </Suspense>
  );
}

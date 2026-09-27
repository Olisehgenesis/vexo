"use client";

import { useSyncExternalStore } from "react";
import { getState, subscribe } from "@/lib/store";
import type { AppState } from "@/lib/types";

function snapshot() {
  return getState();
}

export function useVexo(): AppState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

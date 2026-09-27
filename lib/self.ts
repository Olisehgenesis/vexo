import { SelfApiError, SelfClient, SelfWebhooks } from "@selfxyz/enterprise-sdk";
import type { SelfDisclosures } from "@/lib/types";

const REVEAL_KEYS = [
  "name",
  "idNumber",
  "dateOfBirth",
  "gender",
  "nationality",
  "expiryDate",
  "issuingState",
] as const;

export function selfClient() {
  const apiKey = process.env.SELF_API_KEY;
  if (!apiKey) {
    throw new Error("SELF_API_KEY is not set");
  }
  return new SelfClient({ apiKey });
}

export function selfFlowId() {
  const id = process.env.SELF_FLOW_ID;
  if (!id) {
    throw new Error(
      "SELF_FLOW_ID is missing. Deploy a Pre-KYC flow with every Additional data reveal on, then set the Live flow id.",
    );
  }
  return id;
}

export function pickSelfReveals(
  attrs: Record<string, unknown> | null | undefined,
): SelfDisclosures {
  const next: SelfDisclosures = {};
  if (!attrs) return next;
  for (const key of REVEAL_KEYS) {
    const value = attrs[key];
    if (typeof value === "string" && value.trim()) {
      next[key] = value.trim();
    } else if (Array.isArray(value)) {
      const joined = value.filter((part) => typeof part === "string").join(" ").trim();
      if (joined) next[key] = joined;
    }
  }
  return next;
}

export function hasSelfReveals(disclosures?: SelfDisclosures) {
  return Boolean(
    disclosures &&
      Object.values(disclosures).some((value) => Boolean(value)),
  );
}

export { SelfApiError, SelfWebhooks };

export function selfClient() {
  const apiKey = process.env.SELF_API_KEY;
  if (!apiKey) {
    throw new Error("SELF_API_KEY is not set");
  }
  return new SelfClient({ apiKey });
}

export function selfFlowId() {
  const id = process.env.SELF_FLOW_ID;
  if (!id) {
    throw new Error(
      "SELF_FLOW_ID is missing. Deploy a Proof of Human flow in the Self dashboard and set it.",
    );
  }
  return id;
}

export { SelfApiError, SelfWebhooks };

import { requestPasskeyAssertion } from "@/lib/passkey-wallet";
import { activatePasskeySession, knownPasskeyIds } from "@/lib/store";

export function passkeyErrorMessage(err: unknown) {
  if (err instanceof DOMException && err.name === "NotAllowedError") {
    return "Passkey was cancelled.";
  }
  if (err instanceof Error) return err.message;
  return "Could not use that passkey.";
}

export async function signInWithDevicePasskey() {
  const { credentialId, vault } = await requestPasskeyAssertion(knownPasskeyIds());
  return activatePasskeySession(credentialId, vault);
}

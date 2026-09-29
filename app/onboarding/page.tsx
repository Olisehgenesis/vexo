"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dices } from "lucide-react";
import { SiteDoodle } from "@/components/doodle-field";
import { VexoCardFace } from "@/components/vexo-card";
import { dicebearUrl, nounLooks, type AvatarGender } from "@/lib/dicebear";
import { usernameSlug, suggestUsername } from "@/lib/username";
import {
  completeOnboarding,
  currentUser,
  prewarmVault,
  userByUsername,
} from "@/lib/store";
import { createPasskeyWallet, sealCardToPasskey } from "@/lib/passkey-wallet";
import { resolveSmartAccountAddress } from "@/lib/smart-account";
import { randomId } from "@/lib/crypto";
import type { DiceStyle, VexoCard } from "@/lib/types";

const genders: { id: AvatarGender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "unspecified", label: "Prefer not to say" },
];

const steps = ["Name", "Portrait", "Handle"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<AvatarGender>("unspecified");
  const [avatarStyle] = useState<DiceStyle>("noun");
  const [avatarSeed, setAvatarSeed] = useState("vexo·1");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const displayName = [firstName, lastName].filter(Boolean).join(" ");
  const seed = usernameSlug(`${firstName}_${lastName}`) || "vexo";
  const looks = useMemo(() => nounLooks(seed), [seed]);

  useEffect(() => {
    prewarmVault();
  }, []);

  useEffect(() => {
    if (currentUser()?.passkeyWallet) router.replace("/app");
  }, [router]);

  useEffect(() => {
    if (!looks.includes(avatarSeed)) setAvatarSeed(looks[0]);
  }, [looks, avatarSeed]);

  const draft = useMemo<VexoCard>(
    () => ({
      id: "draft",
      userId: "draft",
      kind: "personal",
      slug: "personal",
      displayName: displayName || "Your name",
      title: "",
      bio: "",
      avatarStyle,
      avatarSeed,
      avatarGender: gender,
      links: [],
      isPrimary: true,
      updatedAt: new Date().toISOString(),
    }),
    [displayName, avatarStyle, avatarSeed, gender],
  );

  function goNext() {
    setError("");
    if (step === 0) {
      if (!firstName.trim()) {
        setError("First name is enough to start.");
        return;
      }
      setUsername(
        suggestUsername((value) => Boolean(userByUsername(value))),
      );
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
    }
  }

  async function finish() {
    setBusy(true);
    setError("");
    try {
      const userId = randomId(16);
      let passkeyWallet = await createPasskeyWallet({
        userId,
        username: usernameSlug(username),
        displayName,
      });
      try {
        const kernelAddress = await resolveSmartAccountAddress(passkeyWallet);
        passkeyWallet = { ...passkeyWallet, kernelAddress };
      } catch {
        // Address resolves on Send when RPC is available.
      }
      await completeOnboarding({
        userId,
        displayName,
        username,
        avatarStyle,
        avatarSeed,
        avatarGender: gender,
        passkeyWallet,
      });
      try {
        await sealCardToPasskey({
          v: 1,
          wallet: passkeyWallet,
          username: usernameSlug(username),
          displayName,
          avatarStyle,
          avatarSeed,
          avatarGender: gender,
        });
      } catch {
        // Card still lives in this browser. Seal is how other devices restore it.
      }
      router.push("/app/mint");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your card");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-paper p-3 md:p-5">
      <div className="relative min-h-[calc(100dvh-1.5rem)] overflow-hidden border-[3px] border-ink bg-panel">
      <SiteDoodle />
      <div className="relative z-10 mx-auto grid min-h-dvh max-w-6xl items-center gap-8 px-6 py-10 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <p className="font-[family-name:var(--font-mark)] text-2xl text-orchid">
            Vexo
          </p>
          <div className="mt-4 flex gap-2">
            {steps.map((label, i) => (
              <span
                key={label}
                className={`h-1.5 w-10 ${
                  i <= step ? "bg-violet" : "bg-violet/20"
                }`}
              />
            ))}
          </div>

          {step === 0 ? (
            <>
              <h1 className="mt-8 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-none">
                What should we call you?
              </h1>
              <p className="mt-3 text-sm text-ink/60">
                First and last name. That&apos;s all for now.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  First name
                  <input
                    autoFocus
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goNext()}
                    placeholder="Oliseh"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  Last name
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goNext()}
                    placeholder="Genesis"
                  />
                </label>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h1 className="mt-8 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-none">
                Pick a portrait
              </h1>
              <p className="mt-3 text-sm text-ink/60">
                Public Nouns portraits. Pick the one that feels like you.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {genders.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGender(item.id)}
                    className={`border-[3px] border-ink px-4 py-2 text-sm ${
                      gender === item.id
                        ? "bg-violet text-ink"
                        : "bg-mist"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {looks.map((look) => (
                  <button
                    key={look}
                    type="button"
                    onClick={() => setAvatarSeed(look)}
                    className={`bg-mist p-1 ${
                      avatarSeed === look
                        ? "outline outline-[3px] outline-orchid"
                        : ""
                    }`}
                  >
                    <img
                      src={dicebearUrl("noun", look, 96)}
                      alt=""
                      className="h-16 w-16 bg-panel"
                    />
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 className="mt-8 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-none">
                Your Vexo name
              </h1>
              <p className="mt-3 text-sm text-ink/60">
                We made one from a mood and a god — Greek, Nile, Norse, and more. Shuffle until it feels like you. Next, a passkey is created — fingerprint, face, or PIN. That key is the wallet and the sign-in. No seed, no database.
              </p>
              <div className="mt-8 flex gap-2">
                <label className="flex-1 space-y-1 text-sm">
                  Username
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && finish()}
                  />
                </label>
                <button
                  type="button"
                  className="mt-6 grid h-12 w-12 place-items-center border-[3px] border-ink bg-mist"
                  onClick={() =>
                    setUsername(
                      suggestUsername((value) => Boolean(userByUsername(value))),
                    )
                  }
                  aria-label="Shuffle username"
                >
                  <Dices size={18} />
                </button>
              </div>
              <p className="mt-2 font-[family-name:var(--font-mark)] text-lg text-violet">
                vexo.social/{usernameSlug(username) || "you"}
              </p>
            </>
          ) : null}

          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-10 flex items-center gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((n) => n - 1)}
                className="px-5 py-3 text-sm text-ink/60"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => (step === 2 ? finish() : goNext())}
              className="btn btn-fill pressable"
            >
              {busy ? "Waiting for passkey…" : step === 2 ? "Create passkey" : "Continue"}
            </button>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <VexoCardFace card={draft} username={usernameSlug(username) || "you"} />
          <p className="mt-4 text-center font-[family-name:var(--font-mark)] text-xl text-violet">
            Your card fills in as you go
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

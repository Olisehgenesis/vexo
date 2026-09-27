import { NextResponse } from "next/server";
import { selfDisclosures } from "@/db/schema";
import { SelfWebhooks } from "@/lib/self";

export async function POST(request: Request) {
  const secret = process.env.SELF_WEBHOOK_SECRET;
  const raw = await request.text();

  let event: ReturnType<typeof SelfWebhooks.verify> | null = null;
  if (secret) {
    try {
      event = SelfWebhooks.verify(
        raw,
        Object.fromEntries(request.headers),
        secret,
      );
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    try {
      event = JSON.parse(raw) as ReturnType<typeof SelfWebhooks.verify>;
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
  }

  if (
    event &&
    event.type === "verification.completed" &&
    event.status === "valid" &&
    process.env.DATABASE_URL
  ) {
    const { db } = await import("@/lib/db");
    await db
      .insert(selfDisclosures)
      .values({
        sessionId: event.verification_id,
        deviceId: event.external_uuid,
        nullifier: event.nullifier,
        attributes: event.proof_attributes ?? {},
      })
      .onConflictDoUpdate({
        target: selfDisclosures.sessionId,
        set: {
          nullifier: event.nullifier,
          attributes: event.proof_attributes ?? {},
        },
      });
  }

  return new NextResponse("ok", { status: 200 });
}

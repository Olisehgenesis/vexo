import { NextRequest, NextResponse } from "next/server";
import { nounSeeds } from "@/db/turso-schema";
import { getTurso } from "@/lib/turso";
import { parseNounSeed } from "@/lib/noun-seed";
import { usernameSlug } from "@/lib/username";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { username?: string; seedJson?: string };
  const username = usernameSlug(body.username ?? "");
  const seed = parseNounSeed(body.seedJson ?? "");
  if (!username || !seed) {
    return NextResponse.json({ ok: false, error: "Need a username and Noun seed" }, { status: 400 });
  }

  const db = await getTurso();
  if (!db) {
    return NextResponse.json({ ok: true, source: "offline" });
  }

  try {
    await db
      .insert(nounSeeds)
      .values({
        username,
        seedJson: JSON.stringify(seed),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: nounSeeds.username,
        set: { seedJson: JSON.stringify(seed), updatedAt: new Date() },
      });
    return NextResponse.json({ ok: true, source: "turso" });
  } catch {
    return NextResponse.json({ ok: true, source: "offline" });
  }
}

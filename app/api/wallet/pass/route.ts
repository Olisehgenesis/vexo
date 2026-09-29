import { NextRequest, NextResponse } from "next/server";
import { createPass } from "@/lib/pass-store";
import { usernameSlug } from "@/lib/username";

export const runtime = "nodejs";

/** Alias for POST /api/passes */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    platform?: "apple" | "google" | "samsung";
    username?: string;
    displayName?: string;
    bio?: string;
    avatarSeed?: string;
    extra?: Record<string, unknown>;
  };
  const username = usernameSlug(body.username ?? "");
  if (!body.platform || !username || !body.displayName) {
    return NextResponse.json({ error: "Need a card and a wallet" }, { status: 400 });
  }
  const result = await createPass({
    platform: body.platform,
    username,
    displayName: body.displayName,
    bio: body.bio,
    avatarSeed: body.avatarSeed,
    extra: body.extra,
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  return NextResponse.json({
    ok: true,
    source: result.source,
    payload: result.pass,
    pass: result.pass,
    walletUrl: `${appUrl}/pass/${result.pass.serial}`,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createPass, listPasses } from "@/lib/pass-store";
import { usernameSlug } from "@/lib/username";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const username = usernameSlug(req.nextUrl.searchParams.get("username") ?? "");
  if (!username) {
    return NextResponse.json({ error: "Need a username" }, { status: 400 });
  }
  const result = await listPasses(username);
  return NextResponse.json({
    ok: true,
    source: result.source,
    passes: result.passes,
  });
}

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
    pass: result.pass,
    payload: result.pass,
    walletUrl: `${appUrl}/pass/${result.pass.serial}`,
  });
}

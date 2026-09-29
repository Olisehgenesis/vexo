import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { handles } from "@/db/turso-schema";
import { getTurso } from "@/lib/turso";
import { usernameSlug } from "@/lib/username";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const slug = usernameSlug(req.nextUrl.searchParams.get("u") ?? "");
  if (!slug) {
    return NextResponse.json({ available: false, source: "invalid" }, { status: 400 });
  }

  const db = await getTurso();
  if (!db) {
    return NextResponse.json({ available: true, source: "offline" });
  }

  try {
    const rows = await db
      .select({ username: handles.username })
      .from(handles)
      .where(eq(handles.username, slug))
      .limit(1);
    return NextResponse.json({
      available: rows.length === 0,
      source: "turso",
    });
  } catch {
    return NextResponse.json({ available: true, source: "offline" });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { username?: string };
  const slug = usernameSlug(body.username ?? "");
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Choose a username" }, { status: 400 });
  }

  const db = await getTurso();
  if (!db) {
    return NextResponse.json({ ok: true, source: "offline" });
  }

  try {
    const existing = await db
      .select({ username: handles.username })
      .from(handles)
      .where(eq(handles.username, slug))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "That username is taken", source: "turso" },
        { status: 409 },
      );
    }
    await db.insert(handles).values({ username: slug, createdAt: new Date() });
    return NextResponse.json({ ok: true, source: "turso" });
  } catch {
    return NextResponse.json({ ok: true, source: "offline" });
  }
}

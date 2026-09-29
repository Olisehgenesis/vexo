import { NextRequest, NextResponse } from "next/server";
import { getPass, revokePass, updatePass } from "@/lib/pass-store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ serial: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { serial } = await ctx.params;
  const result = await getPass(serial);
  if (!result.pass) {
    return NextResponse.json(
      { ok: false, source: result.source, error: "Pass not found" },
      { status: result.source === "offline" ? 503 : 404 },
    );
  }
  return NextResponse.json({ ok: true, source: result.source, pass: result.pass });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { serial } = await ctx.params;
  const patch = (await req.json()) as Parameters<typeof updatePass>[1];
  const result = await updatePass(serial, patch);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, source: result.source, error: result.error },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, source: result.source, pass: result.pass });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { serial } = await ctx.params;
  const result = await revokePass(serial);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, source: result.source, error: result.error },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, source: result.source, pass: result.pass });
}

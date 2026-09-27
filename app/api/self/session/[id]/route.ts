import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { selfDisclosures } from "@/db/schema";
import { SelfApiError, pickSelfReveals, selfClient } from "@/lib/self";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const detail = await selfClient().sessions.get(id);
    let attributes = detail.proofAttributes ?? {};

    if (process.env.DATABASE_URL) {
      const { db } = await import("@/lib/db");
      const [row] = await db
        .select()
        .from(selfDisclosures)
        .where(eq(selfDisclosures.sessionId, id))
        .limit(1);
      if (row?.attributes) {
        attributes = { ...attributes, ...row.attributes };
      }
    }

    return NextResponse.json({
      sessionId: detail.id,
      status: detail.status,
      completedAt: detail.completedAt,
      disclosures: pickSelfReveals(attributes),
      predicates: {
        minimumAge: attributes.minimumAge,
        ofac: attributes.ofac,
      },
    });
  } catch (error) {
    const message =
      error instanceof SelfApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not read Self session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

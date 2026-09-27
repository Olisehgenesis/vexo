import { NextResponse } from "next/server";
import { SelfApiError, selfClient, selfFlowId } from "@/lib/self";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { deviceId?: string };
    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;
    const deviceId = body.deviceId?.slice(0, 256);
    if (!deviceId) {
      return NextResponse.json({ error: "Missing device id" }, { status: 400 });
    }

    const session = await selfClient().sessions.create({
      flowId: selfFlowId(),
      externalUuid: deviceId,
      successUrl: origin ? `${origin}/app/mint?self=done` : undefined,
      failureUrl: origin ? `${origin}/app/mint?self=fail` : undefined,
      metadata: { product: "vexo-pass" },
    });

    return NextResponse.json({
      sessionId: session.id,
      verificationUrl: session.verificationUrl,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    const message =
      error instanceof SelfApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not start Self verification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

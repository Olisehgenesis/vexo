import { NextResponse } from "next/server";
import { gooddollarStatus } from "@/lib/gooddollar";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }
  try {
    const status = await gooddollarStatus(address);
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not check GoodDollar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

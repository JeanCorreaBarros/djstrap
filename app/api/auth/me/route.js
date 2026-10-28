import { NextResponse } from "next/server";
import { userPayload } from "../../../../lib/db";
import { currentUser } from "../../../../lib/auth";

export async function GET() {
  const u = await currentUser();
  return NextResponse.json({ user: u ? await userPayload(u) : null });
}

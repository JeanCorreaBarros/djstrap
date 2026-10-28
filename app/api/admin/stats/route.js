import { NextResponse } from "next/server";
import { adminStats } from "../../../../lib/db";
import { requireAdmin } from "../../../../lib/auth";

export async function GET() {
  const [, err] = await requireAdmin();
  if (err) return err;
  return NextResponse.json(await adminStats());
}

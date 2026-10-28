import { NextResponse } from "next/server";
import { createUser, userPayload } from "../../../../lib/db";
import { readJson, setSession } from "../../../../lib/auth";

export async function POST(req) {
  const { username, password } = await readJson(req);
  const r = await createUser(username, password);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  const res = NextResponse.json({ user: await userPayload(r.user) });
  await setSession(req, res, r.user.id);
  return res;
}

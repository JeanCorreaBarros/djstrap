import { NextResponse } from "next/server";
import { getState, setState } from "../../../lib/db";
import { readJson, requireUser } from "../../../lib/auth";

export async function GET() {
  const [u, err] = await requireUser();
  if (err) return err;
  return NextResponse.json(await getState(u.id));
}

export async function PUT(req) {
  const [u, err] = await requireUser();
  if (err) return err;
  return NextResponse.json(await setState(u.id, await readJson(req)));
}

import { NextResponse } from "next/server";
import { ops, type OpName } from "@/lib/platform/ops";
import { ApiError, createServiceClient, verifyPrivyRequest } from "@/lib/platform/server";

export const runtime = "nodejs";

/**
 * The platform's authenticated data operations.
 *
 * After verifying the Privy access token sent by the browser, the route performs the requested operation using
 * a service-role Supabase client whose acting user is the verified user id. Public reads bypass this route
 * entirely: the order book, loans and configuration are read straight from the browser with the anon key.
 */
export async function POST(req: Request) {
  try {
    const actor = await verifyPrivyRequest(req);
    const body = (await req.json().catch(() => null)) as { op?: string; args?: Record<string, unknown> } | null;
    const op = body?.op;
    if (!op || !(op in ops)) return NextResponse.json({ error: "Operation not recognised" }, { status: 400 });

    const db = createServiceClient(actor);
    const data = await ops[op as OpName](db, actor, body?.args ?? {});
    return NextResponse.json({ data });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 400;
    const message = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: message }, { status });
  }
}

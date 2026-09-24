import { NextRequest } from "next/server";
import { pairingRedirect } from "@/server/connection";
import { StudioError } from "@/server/storage";

export async function GET(req: NextRequest) {
  try { return Response.redirect(pairingRedirect(req.headers.get("host")), 302); }
  catch (error) {
    const status = error instanceof StudioError ? error.status : 400;
    return Response.json({ error: (error as Error).message }, { status });
  }
}

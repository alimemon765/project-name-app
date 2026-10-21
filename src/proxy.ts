// Runs before rendering (Next 16 "proxy", Node.js runtime). The classifier review tools exist only on the local admin
// server (npm run admin): everywhere else /admin answers a real 404 before any page code runs. The page re-checks too.
import { NextResponse, type NextRequest } from "next/server";
import { isLocalAdmin } from "@/lib/admin/guard";

export function proxy(request: NextRequest): NextResponse {
  if (!isLocalAdmin(request.headers.get("host"), process.env.ADMIN_LABELS)) {
    return new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" } });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };

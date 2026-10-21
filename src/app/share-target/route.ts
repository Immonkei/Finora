import { NextResponse, type NextRequest } from "next/server";

// Fallback for shares that arrive before the service worker is active: the
// worker normally intercepts this POST and keeps the image. Without it the
// file can't be handed to the page, so just open Quick Add.
export function POST(request: NextRequest) {
  return NextResponse.redirect(new URL("/today?add=1", request.url), 303);
}

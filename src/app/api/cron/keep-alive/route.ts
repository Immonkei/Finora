import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


/**
 * Supabase Keep-Alive Heartbeat Scheduler Route
 * Prevents Supabase free-tier project suspension / inactivity pause.
 *
 * Can be triggered by:
 * 1. Vercel Cron (configured in vercel.json)
 * 2. GitHub Actions Scheduled Workflow (.github/workflows/keep-supabase-active.yml)
 * 3. External cron pingers (cron-job.org, Upstash)
 * 4. In-app manual heartbeat trigger from /settings
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const urlKey = request.nextUrl.searchParams.get("key");

    // If CRON_SECRET is strictly configured in production, enforce authentication
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && urlKey !== cronSecret) {
      // If the caller is just pinging for a public health check, allow a minimal pong
      const isPublicPing = request.nextUrl.searchParams.get("public") === "true";
      if (!isPublicPing) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          status: "error",
          error: "Supabase credentials not configured in environment",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // 1. Execute an active database query to ensure Postgres engine is warm & reset inactivity timer
    // Try heartbeat RPC function first, fall back to categories table query
    const { error: rpcError } = await supabase.rpc("supabase_keep_alive", {
      p_source: "cron_scheduler",
    });

    const { count, error: dbError } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true });

    const latencyMs = Date.now() - startTime;

    if (dbError && rpcError) {
      return NextResponse.json(
        {
          status: "degraded",
          error: dbError?.message || rpcError?.message,
          latencyMs,
          timestamp: new Date().toISOString(),
        },
        { status: 502 }
      );
    }

    // 2. Also wake up auth service with a quick ping
    const { error: authError } = await supabase.auth.getSession();

    return NextResponse.json({
      status: "active",
      message: "Supabase project keep-alive ping successful. Inactivity timer refreshed.",
      latencyMs,
      categoriesCount: count ?? 0,
      authStatus: authError ? "warn" : "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : "Failed to execute keep-alive ping",
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

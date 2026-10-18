import { describe, it, expect, vi, beforeEach } from "vitest";
import { triggerKeepAlivePing } from "./keep-alive-action";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("triggerKeepAlivePing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success and latency when Supabase responds positively", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ count: 5, error: null }),
      }),
    };
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await triggerKeepAlivePing();

    expect(result.success).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.message).toContain("Supabase ping successful");
    expect(result.error).toBeUndefined();
  });

  it("handles database query errors gracefully", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          count: null,
          error: { message: "database paused or connecting" },
        }),
      }),
    };
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await triggerKeepAlivePing();

    expect(result.success).toBe(false);
    expect(result.error).toBe("database paused or connecting");
    expect(result.message).toContain("Supabase responded with an error");
  });

  it("handles exception during connection", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network timeout")
    );

    const result = await triggerKeepAlivePing();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network timeout");
  });
});

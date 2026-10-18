import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock createClient
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("AI Chat API Route (/api/ai-chat)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new NextRequest("http://localhost:3000/api/ai-chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Please log in");
  });

  it("returns 400 when no messages are provided", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({ data: { user: { id: "test-user-id" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new NextRequest("http://localhost:3000/api/ai-chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("No messages");
  });
});

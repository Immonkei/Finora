import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processAndUploadReceipt } from "@/features/transactions/receipt-storage";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to upload receipts" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const uploadResult = await processAndUploadReceipt(file, user.id, supabase as any);

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error },
        { status: uploadResult.error?.includes("limit") || uploadResult.error?.includes("type") ? 400 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      path: uploadResult.path,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload receipt";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

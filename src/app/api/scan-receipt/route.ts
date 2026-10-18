import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseReceiptWithGemini,
  parseReceiptText,
  type AvailableCategory,
  type ScannedReceiptResult,
} from "@/features/transactions/receipt-scanner";
import { processAndUploadReceipt } from "@/features/transactions/receipt-storage";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to scan receipts" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const directText = (formData.get("text") as string) || "";

    // Load user's actual categories for optimal semantic matching
    const { data: dbCategories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id);

    const availableCategories: AvailableCategory[] = (dbCategories || []).map((c) => ({
      id: c.id,
      name: c.name,
    }));

    // If client supplied direct OCR text
    if (directText && !file) {
      const result = parseReceiptText(directText, availableCategories);
      return NextResponse.json({ ...result, success: true });
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No receipt file or text provided" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage receipts bucket via shared helper
    const uploadResult = await processAndUploadReceipt(file, user.id, supabase);
    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error },
        { status: 400 }
      );
    }

    const receiptUrl = uploadResult.url;
    const base64Image = uploadResult.buffer!.toString("base64");

    // 2. Perform AI Vision scan if Gemini API key is present
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let scanResult: ScannedReceiptResult;

    if (apiKey) {
      scanResult = await parseReceiptWithGemini(
        base64Image,
        file.type,
        apiKey,
        availableCategories
      );

      // If Gemini returned an error, fallback to filename/heuristic
      if (!scanResult.success) {
        scanResult = parseReceiptText(file.name.replace(/[-_.]/g, " "), availableCategories);
      }
    } else {
      // Heuristic extraction when no Gemini key is provided
      scanResult = parseReceiptText(file.name.replace(/[-_.]/g, " "), availableCategories);
      scanResult.confidence = 0.6;
    }

    // Attach receipt URL and format response
    return NextResponse.json({
      ...scanResult,
      amountMinor: scanResult.amountMinor ? scanResult.amountMinor.toString() : "0",
      receiptUrl,
      success: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scan receipt";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

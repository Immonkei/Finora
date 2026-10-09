import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseReceiptWithGemini,
  parseReceiptText,
  type AvailableCategory,
  type ScannedReceiptResult,
} from "@/features/transactions/receipt-scanner";

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

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File exceeds 10MB size limit" },
        { status: 400 }
      );
    }

    // Validate image mime type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Please upload a JPEG, PNG, or WebP image",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    // 1. Upload to Supabase Storage `receipts` bucket
    const fileExt = file.name.split(".").pop() || "jpg";
    const sanitizedExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, "");
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${sanitizedExt}`;

    let receiptUrl: string | undefined;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(uploadData.path);
      receiptUrl = publicUrlData.publicUrl;
    }

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

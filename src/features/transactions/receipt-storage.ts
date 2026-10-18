/**
 * Shared Supabase Storage Receipt Helper
 */


export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

export const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface ReceiptUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  buffer?: Buffer;
  error?: string;
}

export interface StorageClientLike {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: Buffer,
        options: { contentType: string; upsert: boolean }
      ) => Promise<{ data: { path: string } | null; error: { message: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
}

export async function processAndUploadReceipt(
  file: File,
  userId: string,
  supabase: StorageClientLike
): Promise<ReceiptUploadResult> {
  // Validate size
  if (file.size > MAX_RECEIPT_FILE_SIZE) {
    return {
      success: false,
      error: "File exceeds 10MB size limit",
    };
  }

  // Validate image mime type
  if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Invalid file type. Please upload a JPEG, PNG, or WebP image",
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileExt = file.name.split(".").pop() || "jpg";
  const sanitizedExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, "");
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${sanitizedExt}`;

  // Upload to Supabase Storage receipts bucket
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError || !uploadData) {
    return {
      success: false,
      error: uploadError?.message || "Upload failed",
    };
  }

  const { data: publicUrlData } = supabase.storage
    .from("receipts")
    .getPublicUrl(uploadData.path);

  return {
    success: true,
    url: publicUrlData.publicUrl,
    path: uploadData.path,
    buffer,
  };
}

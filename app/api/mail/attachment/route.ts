import { NextResponse } from "next/server";

import { downloadMailAttachment, isMailApiConfigured } from "@/lib/hostinger-mail";
import { getSessionUserRole } from "@/lib/roles";

function canInlinePreview(contentType: string, filename: string) {
  const type = contentType.toLowerCase();
  if (
    type.startsWith("image/") ||
    type === "application/pdf" ||
    type.startsWith("text/") ||
    type === "application/json"
  ) {
    return true;
  }
  const lower = filename.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".csv")
  );
}

function contentDisposition(filename: string, inline: boolean) {
  const safeAscii = filename.replace(/[^\x20-\x7E]+/g, "_").replace(/"/g, "");
  const encoded = encodeURIComponent(filename);
  const mode = inline ? "inline" : "attachment";
  return `${mode}; filename="${safeAscii || "attachment"}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: Request) {
  const session = await getSessionUserRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMailApiConfigured()) {
    return NextResponse.json(
      { error: "Mail API is not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const mailbox = searchParams.get("mailbox")?.trim() ?? "";
  const folder = searchParams.get("folder")?.trim() ?? "";
  const uid = Number(searchParams.get("uid") ?? "");
  const attachmentId = searchParams.get("attachmentId")?.trim() ?? "";
  const forceDownload = searchParams.get("download") === "1";

  if (!mailbox || !folder || !attachmentId || !Number.isFinite(uid) || uid <= 0) {
    return NextResponse.json({ error: "Invalid attachment request." }, { status: 400 });
  }

  try {
    const file = await downloadMailAttachment(mailbox, folder, uid, attachmentId);
    const inline = !forceDownload && canInlinePreview(file.contentType, file.filename);
    return new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        "Content-Type": file.contentType || "application/octet-stream",
        "Content-Disposition": contentDisposition(file.filename, inline),
        "Content-Length": String(file.data.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to download attachment.",
      },
      { status: 502 },
    );
  }
}

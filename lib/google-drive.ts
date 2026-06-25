import { Readable } from "node:stream";

import { google } from "googleapis";

export const PO_MASUK_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const PO_MASUK_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PoMasukAllowedMimeType = (typeof PO_MASUK_ALLOWED_MIME_TYPES)[number];

export function isAllowedPoMasukMimeType(mimeType: string): mimeType is PoMasukAllowedMimeType {
  return (PO_MASUK_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const folderId = process.env.GOOGLE_DRIVE_PO_MASUK_FOLDER_ID;

  if (!email || !privateKey || !folderId) {
    throw new Error(
      "Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_DRIVE_PO_MASUK_FOLDER_ID.",
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return {
    drive: google.drive({ version: "v3", auth }),
    folderId,
  };
}

export function getPoMasukFileViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export async function uploadPoMasukFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  const { drive, folderId } = getDriveClient();

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id,name,mimeType,webViewLink",
    supportsAllDrives: true,
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error("Google Drive upload failed: missing file id.");
  }

  return {
    fileId,
    fileName: response.data.name ?? fileName,
    mimeType: response.data.mimeType ?? mimeType,
    webViewLink: response.data.webViewLink ?? getPoMasukFileViewUrl(fileId),
  };
}

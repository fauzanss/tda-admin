const GOOGLE_DRIVE_FILE_ID_PATTERN = /\/file\/d\/([a-zA-Z0-9_-]+)/;
const GOOGLE_DRIVE_OPEN_ID_PATTERN = /[?&]id=([a-zA-Z0-9_-]+)/;

export type ParsedGoogleDriveLink = {
  fileId: string;
  webViewLink: string;
  previewUrl: string;
};

export function getGoogleDrivePreviewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/** @deprecated Use getGoogleDrivePreviewUrl */
export const getPoMasukFileViewUrl = getGoogleDrivePreviewUrl;

export function parseGoogleDriveLink(raw: string): ParsedGoogleDriveLink {
  const url = raw.trim();
  if (!url) {
    throw new Error("Google Drive link is required.");
  }

  const fileMatch = url.match(GOOGLE_DRIVE_FILE_ID_PATTERN);
  if (fileMatch) {
    const fileId = fileMatch[1];
    return {
      fileId,
      webViewLink: url.includes("/view") || url.includes("/preview")
        ? url.replace("/preview", "/view")
        : `https://drive.google.com/file/d/${fileId}/view`,
      previewUrl: getGoogleDrivePreviewUrl(fileId),
    };
  }

  const openMatch = url.match(GOOGLE_DRIVE_OPEN_ID_PATTERN);
  if (openMatch) {
    const fileId = openMatch[1];
    return {
      fileId,
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
      previewUrl: getGoogleDrivePreviewUrl(fileId),
    };
  }

  throw new Error(
    "Invalid Google Drive link. Use a share link like https://drive.google.com/file/d/.../view",
  );
}

export function parseGdriveLinkFormFields(
  formData: FormData,
  options?: { required?: boolean },
) {
  const link = String(formData.get("gdriveLink") ?? "").trim();
  const fileName = String(formData.get("gdriveFileName") ?? "").trim();

  if (!link) {
    if (options?.required) {
      throw new Error("Google Drive link is required.");
    }
    return null;
  }

  const parsed = parseGoogleDriveLink(link);
  return {
    gdriveFileId: parsed.fileId,
    gdriveWebViewLink: parsed.webViewLink,
    gdriveFileName: fileName || "Google Drive File",
  };
}

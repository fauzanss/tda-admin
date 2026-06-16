import { DocumentType } from "@/generated/prisma/client";
import QRCode from "qrcode";

const DEFAULT_BASE = "https://admin.transdgital.id";

/** Set NEXT_PUBLIC_QR_VERIFY_BASE_URL to override (e.g. staging). */
export function getDocumentVerifyBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_QR_VERIFY_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return DEFAULT_BASE;
}

/**
 * Public verify path segments, e.g. /qrcode/SPH/:id, /qrcode/PO/:id, /qrcode/DN/:id, /qrcode/INVOICE/:id
 */
function documentTypeToQrPathSegment(type: DocumentType): string {
  switch (type) {
    case "SPH":
      return "SPH";
    case "PURCHASE_ORDER":
      return "PO";
    case "SURAT_JALAN":
      return "DN";
    case "INVOICE":
      return "INVOICE";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function getDocumentVerifyUrl(type: DocumentType, id: string): string {
  const base = getDocumentVerifyBaseUrl();
  const segment = documentTypeToQrPathSegment(type);
  return `${base}/qrcode/${segment}/${encodeURIComponent(id)}`;
}

export async function getDocumentQrDataUrl(verifyUrl: string): Promise<string> {
  return QRCode.toDataURL(verifyUrl, {
    width: 200,
    margin: 0,
    errorCorrectionLevel: "M",
  });
}

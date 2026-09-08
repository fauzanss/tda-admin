import { BillingPhase, DocumentLocale } from "@/generated/prisma/client";

export const billingPhaseOptions: BillingPhase[] = [
  "TERMIN",
  "TERMIN_90",
  "RETENTION_10",
  "FULL",
];

const labelsEn: Record<BillingPhase, string> = {
  FULL: "Full payment",
  TERMIN: "Termin",
  TERMIN_90: "Termin 90%",
  RETENTION_10: "Retention 10%",
};

const labelsId: Record<BillingPhase, string> = {
  FULL: "Pelunasan penuh",
  TERMIN: "Termin",
  TERMIN_90: "Termin 90%",
  RETENTION_10: "Retensi 10%",
};

export function getBillingPhaseLabel(
  phase: BillingPhase,
  locale?: DocumentLocale | null,
): string {
  const labels = locale === "EN" ? labelsEn : labelsId;
  return labels[phase];
}

export function parseBillingPhase(value: string | undefined): BillingPhase {
  if (
    value === "TERMIN" ||
    value === "TERMIN_90" ||
    value === "RETENTION_10" ||
    value === "FULL"
  ) {
    return value;
  }
  return "TERMIN";
}

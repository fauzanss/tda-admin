import { readFile } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";

import type { CompanyProfile, Sph, SphItem } from "@/generated/prisma/client";
import { getDocumentStrings, getSphClosingText } from "@/lib/document-i18n";
import { formatCurrencyAmount, parseNotes } from "@/lib/documents";

type SphWithItems = Sph & { items: SphItem[] };

function formatDateDDMMYYYY(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function sphNameForSalutation(name: string | null | undefined) {
  if (!name?.trim()) {
    return "-";
  }
  const original = name.trim();
  const stripped = original.replace(/^(Yth\.|Yth|Yang Terhormat)[.\s,]*/iu, "").trim();
  return stripped || original;
}

function extractSphNotes(notes: Sph["notes"]) {
  const offerNotes =
    Array.isArray(notes)
      ? notes.map((item) => String(item))
      : notes &&
          typeof notes === "object" &&
          !Array.isArray(notes) &&
          Array.isArray((notes as Record<string, unknown>).offerNotes)
        ? ((notes as Record<string, unknown>).offerNotes as unknown[]).map((item) => String(item))
        : [];
  const additionalNotes =
    notes &&
    typeof notes === "object" &&
    !Array.isArray(notes) &&
    Array.isArray((notes as Record<string, unknown>).additionalNotes)
      ? ((notes as Record<string, unknown>).additionalNotes as unknown[]).map((item) => String(item))
      : [];
  return { offerNotes, additionalNotes };
}

function bulletLines(text: string | null | undefined) {
  if (!text?.trim()) {
    return ["-"];
  }
  const lines = parseNotes(text);
  return lines.length > 0 ? lines.map((line) => `- ${line}`) : ["-"];
}

export async function buildSphExcelBuffer(
  document: SphWithItems,
  company: CompanyProfile | null,
): Promise<Buffer> {
  const locale = document.locale ?? "ID";
  const t = getDocumentStrings(locale, "SPH");
  const { offerNotes, additionalNotes } = extractSphNotes(document.notes);
  const partnerName = (document.recipientCompany || "Netciti").trim();
  const companyName = company?.companyName ?? "PT. TRANSFORMASI DIGITAL ABADI";
  const signerName = "Realdi Adithya Saputra";
  const total = document.items.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
    0,
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName;
  const sheet = workbook.addWorksheet(t.documentTitle, {
    properties: { defaultRowHeight: 18 },
    views: [{ showGridLines: false }],
  });

  sheet.columns = [
    { key: "a", width: 42 },
    { key: "b", width: 10 },
    { key: "c", width: 10 },
    { key: "d", width: 18 },
    { key: "e", width: 18 },
  ];

  const publicDir = path.join(process.cwd(), "public");
  const logoBuffer = await readFile(path.join(publicDir, "tda-logo-transparent.png"));
  const logoId = workbook.addImage({ buffer: logoBuffer as unknown as ExcelJS.Buffer, extension: "png" });
  sheet.addImage(logoId, {
    tl: { col: 0, row: 0 },
    ext: { width: 120, height: 45 },
  });
  sheet.getRow(1).height = 36;

  sheet.mergeCells("B1:E1");
  sheet.getCell("B1").value = companyName;
  sheet.getCell("B1").font = { bold: true, size: 14 };

  sheet.mergeCells("B2:E2");
  sheet.getCell("B2").value = company?.address ?? "-";
  sheet.getCell("B2").alignment = { wrapText: true };

  sheet.mergeCells("B3:E3");
  sheet.getCell("B3").value =
    `${company?.phone ?? "-"} | ${company?.email ?? "-"} | ${company?.website ?? "-"}`;

  let row = 5;
  sheet.mergeCells(`A${row}:E${row}`);
  const titleCell = sheet.getCell(`A${row}`);
  titleCell.value = t.documentTitle;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center" };
  row += 2;

  const meta: Array<[string, string]> = [
    [t.date, formatDateDDMMYYYY(document.issueDate)],
    [t.number, document.documentNumber ?? t.draft],
  ];
  if (document.subject) {
    meta.push([t.subject, document.subject]);
  }
  for (const [label, value] of meta) {
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.mergeCells(`B${row}:E${row}`);
    sheet.getCell(`B${row}`).value = `: ${value}`;
    row += 1;
  }
  row += 1;

  sheet.getCell(`A${row}`).value = t.to;
  sheet.getCell(`A${row}`).font = { bold: true };
  row += 1;
  sheet.mergeCells(`A${row}:E${row}`);
  sheet.getCell(`A${row}`).value = `${t.attnPrefix} ${sphNameForSalutation(document.recipientName)}`;
  row += 1;
  sheet.mergeCells(`A${row}:E${row}`);
  sheet.getCell(`A${row}`).value = document.recipientCompany || "-";
  row += 2;

  sheet.mergeCells(`A${row}:E${row}`);
  sheet.getCell(`A${row}`).value = t.sphIntroGreeting;
  row += 1;
  sheet.mergeCells(`A${row}:E${row}`);
  sheet.getCell(`A${row}`).value = t.sphIntroBody(partnerName);
  sheet.getCell(`A${row}`).alignment = { wrapText: true };
  sheet.getRow(row).height = 36;
  row += 2;

  const headerRow = sheet.getRow(row);
  const headers = [t.itemName, t.qty, t.unit, t.unitPrice, t.total];
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2C3E50" },
    };
    cell.alignment = {
      horizontal: index === 0 ? "left" : index >= 3 ? "right" : "center",
      vertical: "middle",
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  row += 1;

  for (const line of document.items) {
    const lineTotal = Number(line.quantity) * Number(line.unitPrice);
    const description = [line.description, line.detail].filter(Boolean).join("\n");
    const itemRow = sheet.getRow(row);
    const values = [
      description,
      Number(line.quantity),
      line.unit || "-",
      formatCurrencyAmount(Number(line.unitPrice), locale),
      formatCurrencyAmount(lineTotal, locale),
    ];
    values.forEach((value, index) => {
      const cell = itemRow.getCell(index + 1);
      cell.value = value;
      cell.alignment = {
        horizontal: index === 0 ? "left" : index >= 3 ? "right" : "center",
        vertical: "top",
        wrapText: index === 0,
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    if (description.includes("\n")) {
      itemRow.height = Math.min(18 * (description.split("\n").length + 1), 72);
    }
    row += 1;
  }
  row += 1;

  sheet.mergeCells(`A${row}:D${row}`);
  sheet.getCell(`A${row}`).value = `${t.grandTotal} (IDR):`;
  sheet.getCell(`A${row}`).font = { bold: true };
  sheet.getCell(`A${row}`).alignment = { horizontal: "right" };
  sheet.getCell(`E${row}`).value = formatCurrencyAmount(total, locale);
  sheet.getCell(`E${row}`).font = { bold: true };
  sheet.getCell(`E${row}`).alignment = { horizontal: "right" };
  row += 2;

  sheet.getCell(`A${row}`).value = t.paymentTerms;
  sheet.getCell(`A${row}`).font = { bold: true };
  sheet.getCell(`C${row}`).value = t.offerNotes;
  sheet.getCell(`C${row}`).font = { bold: true };
  row += 1;

  const paymentLines = bulletLines(document.paymentTerms);
  const offerLines =
    offerNotes.length > 0 ? offerNotes.map((note) => `- ${note}`) : ["-"];
  const noteRows = Math.max(paymentLines.length, offerLines.length);
  for (let i = 0; i < noteRows; i += 1) {
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = paymentLines[i] ?? "";
    sheet.mergeCells(`C${row}:E${row}`);
    sheet.getCell(`C${row}`).value = offerLines[i] ?? "";
    row += 1;
  }
  row += 1;

  if (additionalNotes.length > 0) {
    sheet.getCell(`A${row}`).value = t.additionalInformation;
    sheet.getCell(`A${row}`).font = { bold: true };
    row += 1;
    for (const note of additionalNotes) {
      sheet.mergeCells(`A${row}:E${row}`);
      sheet.getCell(`A${row}`).value = `- ${note}`;
      row += 1;
    }
    row += 1;
  }

  sheet.mergeCells(`A${row}:E${row}`);
  sheet.getCell(`A${row}`).value = getSphClosingText(locale, document.offerKind);
  sheet.getCell(`A${row}`).alignment = { wrapText: true };
  sheet.getRow(row).height = 48;
  row += 2;

  sheet.getCell(`A${row}`).value = t.yoursSincerely;
  row += 1;
  sheet.getCell(`A${row}`).value = companyName;
  sheet.getCell(`A${row}`).font = { bold: true };
  row += 1;

  if (document.withSignature) {
    const signatureBuffer = await readFile(path.join(publicDir, "tanda-tangan.png"));
    const signatureId = workbook.addImage({
      buffer: signatureBuffer as unknown as ExcelJS.Buffer,
      extension: "png",
    });
    sheet.addImage(signatureId, {
      tl: { col: 0, row: row - 1 },
      ext: { width: 120, height: 50 },
    });
    sheet.getRow(row).height = 40;
    row += 2;
    sheet.getCell(`A${row}`).value = signerName;
    sheet.getCell(`A${row}`).font = { bold: true };
    row += 1;
    sheet.getCell(`A${row}`).value = t.headOfSales;
  } else {
    sheet.getCell(`A${row}`).value = "____________________";
    row += 2;
    sheet.getCell(`A${row}`).value = signerName;
    sheet.getCell(`A${row}`).font = { bold: true };
    row += 1;
    sheet.getCell(`A${row}`).value = t.headOfSales;
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

import { DocumentLocale, DocumentType } from "@/generated/prisma/client";

export type { DocumentLocale };

export type DocumentStrings = {
  documentTitle: string;
  qrLabel: string;
  qrAlt: string;
  draft: string;
  date: string;
  invoiceNo: string;
  poNo: string;
  deliveryNoteNo: string;
  number: string;
  bastSjNo: string;
  taxId: string;
  subject: string;
  billTo: string;
  orderTo: string;
  sentFrom: string;
  sentTo: string;
  deliveredTo: string;
  to: string;
  attnPrefix: string;
  sphIntroGreeting: string;
  sphIntroBody: (partnerName: string) => string;
  itemNo: string;
  itemDescription: string;
  itemName: string;
  quantity: string;
  unit: string;
  condition: string;
  unitPrice: string;
  price: string;
  total: string;
  conditionGood: string;
  subtotal: string;
  ppn: string;
  totalPurchaseOrder: string;
  totalOrder: string;
  grandTotal: string;
  paymentTransfer: string;
  paymentTerms: string;
  deliveryInstructions: string;
  deliveryNotes: string;
  offerNotes: string;
  additionalInformation: string;
  sphClosing: string;
  sender: string;
  receiver: string;
  name: string;
  position: string;
  signature: string;
  notesTitle: string;
  noteDeliveryInclude: string;
  noteInspectBeforeSign: string;
  noteContactCompany: string;
  yoursSincerely: string;
  headOfSales: string;
  signatureAlt: string;
};

const sharedEn: Omit<
  DocumentStrings,
  | "documentTitle"
  | "invoiceNo"
  | "deliveryNoteNo"
  | "number"
  | "billTo"
  | "orderTo"
  | "sentFrom"
  | "sentTo"
  | "deliveredTo"
  | "sphIntroGreeting"
  | "sphIntroBody"
  | "itemDescription"
  | "itemName"
  | "unitPrice"
  | "totalPurchaseOrder"
  | "totalOrder"
  | "paymentTransfer"
  | "paymentTerms"
  | "deliveryInstructions"
  | "deliveryNotes"
> = {
  qrLabel: "Document preview",
  qrAlt: "Document preview QR",
  draft: "(Draft)",
  date: "Date",
  poNo: "PO No.",
  bastSjNo: "BAST / SJ No.",
  taxId: "Tax ID",
  subject: "Subject",
  to: "To",
  attnPrefix: "Attn.",
  itemNo: "No.",
  quantity: "Quantity",
  unit: "Unit",
  condition: "Condition",
  price: "Price",
  total: "Total",
  conditionGood: "Good",
  subtotal: "Subtotal",
  ppn: "PPN 11%",
  grandTotal: "Grand Total",
  offerNotes: "Offer Notes",
  additionalInformation: "Additional Information",
  sphClosing:
    "We appreciate your consideration and look forward to the opportunity to work together on this procurement. Thank you for your attention and cooperation.",
  sender: "Sender",
  receiver: "Receiver",
  name: "Name",
  position: "Position",
  signature: "Signature",
  notesTitle: "Notes:",
  noteDeliveryInclude: "This delivery note must accompany the goods during delivery",
  noteInspectBeforeSign: "The recipient must inspect the goods before signing",
  noteContactCompany:
    "If there is any discrepancy, please contact PT. TRANSFORMASI DIGITAL ABADI immediately",
  yoursSincerely: "Yours sincerely,",
  headOfSales: "Head of Sales & Marketing",
  signatureAlt: "Signature",
};

const sharedId: typeof sharedEn = {
  qrLabel: "Preview dokumen",
  qrAlt: "QR preview dokumen",
  draft: "(Draft)",
  date: "Tanggal",
  poNo: "No. PO",
  bastSjNo: "No. BAST / SJ",
  taxId: "NPWP",
  subject: "Perihal",
  to: "Kepada",
  attnPrefix: "Yth.",
  itemNo: "No.",
  quantity: "Jumlah",
  unit: "Satuan",
  condition: "Kondisi",
  price: "Harga",
  total: "Total",
  conditionGood: "Baik",
  subtotal: "Subtotal",
  ppn: "PPN 11%",
  grandTotal: "Total Keseluruhan",
  offerNotes: "Catatan Penawaran",
  additionalInformation: "Informasi Tambahan",
  sphClosing:
    "Kami menghargai pertimbangan Anda dan berharap dapat bekerja sama dalam pengadaan ini. Terima kasih atas perhatian dan kerja samanya.",
  sender: "Pengirim",
  receiver: "Penerima",
  name: "Nama",
  position: "Jabatan",
  signature: "Tanda Tangan",
  notesTitle: "Catatan:",
  noteDeliveryInclude: "Surat jalan ini harus disertakan saat pengiriman barang",
  noteInspectBeforeSign: "Penerima wajib memeriksa barang sebelum menandatangani",
  noteContactCompany:
    "Jika ada ketidaksesuaian, segera hubungi PT. TRANSFORMASI DIGITAL ABADI",
  yoursSincerely: "Hormat kami,",
  headOfSales: "Head of Sales & Marketing",
  signatureAlt: "Tanda tangan",
};

function buildStrings(
  locale: DocumentLocale,
  type: DocumentType,
): DocumentStrings {
  const shared = locale === "EN" ? sharedEn : sharedId;

  const typeStrings: Record<DocumentType, Partial<DocumentStrings>> = {
    INVOICE: {
      documentTitle: locale === "EN" ? "INVOICE" : "FAKTUR",
      invoiceNo: locale === "EN" ? "Invoice No." : "No. Faktur",
      billTo: locale === "EN" ? "Bill To" : "Ditagihkan Kepada",
      deliveredTo: locale === "EN" ? "Delivered To" : "Dikirim Ke",
      paymentTransfer: locale === "EN" ? "Payment Transfer to Account - IDR" : "Transfer Pembayaran ke Rekening - IDR",
      totalOrder: locale === "EN" ? "Total Order" : "Total Pesanan",
    },
    PURCHASE_ORDER: {
      documentTitle: locale === "EN" ? "PURCHASE ORDER" : "PO KELUAR",
      invoiceNo: locale === "EN" ? "PO No." : "No. PO",
      orderTo: locale === "EN" ? "Order To" : "Pesanan Kepada",
      deliveredTo: locale === "EN" ? "Delivered To" : "Dikirim Ke",
      paymentTerms: locale === "EN" ? "Payment Terms" : "Syarat Pembayaran",
      totalPurchaseOrder: locale === "EN" ? "Total Purchase Order" : "Total Purchase Order",
      itemDescription: locale === "EN" ? "Item Description" : "Deskripsi Barang",
    },
    SURAT_JALAN: {
      documentTitle: locale === "EN" ? "DELIVERY NOTE" : "SURAT JALAN",
      deliveryNoteNo: locale === "EN" ? "Delivery Note No." : "No. Surat Jalan",
      sentFrom: locale === "EN" ? "Sent From" : "Dikirim Dari",
      sentTo: locale === "EN" ? "Sent To" : "Dikirim Ke",
      deliveryInstructions: locale === "EN" ? "Delivery Instructions" : "Instruksi Pengiriman",
      itemDescription: locale === "EN" ? "Item Description" : "Deskripsi Barang",
    },
    SPH: {
      documentTitle: locale === "EN" ? "QUOTATION" : "PENAWARAN",
      number: locale === "EN" ? "Number" : "Nomor",
      itemName: locale === "EN" ? "Item Name" : "Nama Barang",
      unitPrice: locale === "EN" ? "Unit Price (Rp)" : "Harga Satuan (Rp)",
      paymentTerms: locale === "EN" ? "Payment Terms" : "Syarat Pembayaran",
      sphIntroGreeting: locale === "EN" ? "Dear Sir/Madam," : "Dengan hormat,",
      sphIntroBody: (partnerName: string) =>
        locale === "EN"
          ? `We, PT Transformasi Digital Abadi as an official partner of ${partnerName}, would like to submit the following quotation:`
          : `Kami, PT Transformasi Digital Abadi sebagai mitra resmi ${partnerName}, dengan ini mengajukan penawaran sebagai berikut:`,
    },
  };

  const typePart = typeStrings[type];

  return {
    ...shared,
    invoiceNo: "",
    deliveryNoteNo: "",
    number: "",
    billTo: "",
    orderTo: "",
    sentFrom: "",
    sentTo: "",
    deliveredTo: "",
    itemDescription: locale === "EN" ? "Item Description" : "Deskripsi Barang",
    itemName: locale === "EN" ? "Item Name" : "Nama Barang",
    unitPrice: locale === "EN" ? "Unit Price (Rp)" : "Harga Satuan (Rp)",
    totalPurchaseOrder: locale === "EN" ? "Total Purchase Order" : "Total Purchase Order",
    totalOrder: locale === "EN" ? "Total Order" : "Total Pesanan",
    paymentTransfer: locale === "EN" ? "Payment Transfer to Account - IDR" : "Transfer Pembayaran ke Rekening - IDR",
    paymentTerms: locale === "EN" ? "Payment Terms" : "Syarat Pembayaran",
    deliveryInstructions: locale === "EN" ? "Delivery Instructions" : "Instruksi Pengiriman",
    deliveryNotes: locale === "EN" ? "Delivery Notes" : "Catatan Pengiriman",
    sphIntroGreeting: locale === "EN" ? "Dear Sir/Madam," : "Dengan hormat,",
    sphIntroBody: (partnerName: string) =>
      locale === "EN"
        ? `We, PT Transformasi Digital Abadi as an official partner of ${partnerName}, would like to submit the following quotation:`
        : `Kami, PT Transformasi Digital Abadi sebagai mitra resmi ${partnerName}, dengan ini mengajukan penawaran sebagai berikut:`,
    documentTitle: type,
    ...typePart,
  } as DocumentStrings;
}

export function getDocumentStrings(
  locale: DocumentLocale | null | undefined,
  type: DocumentType,
): DocumentStrings {
  return buildStrings(locale ?? "ID", type);
}

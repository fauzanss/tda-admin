import Image from "next/image";

import { asDocumentType } from "@/app/admin/documents/document-type";
import { PrintButton } from "@/app/admin/documents/PrintButton";
import { getDocumentQrDataUrl, getDocumentVerifyUrl } from "@/lib/document-verify-qr";
import { documentTypeLabels } from "@/lib/document-meta";
import { formatCurrency } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

function formatDateDDMMYYYY(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatLongDateID(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Strip "Yth." / "Yang Terhormat" from stored name so "Attn. …" is not duplicated. */
function sphNameForSalutation(name: string | null | undefined): string {
  if (!name?.trim()) {
    return "-";
  }
  const original = name.trim();
  const stripped = original.replace(/^(Yth\.|Yth|Yang Terhormat)[.\s,]*/iu, "").trim();
  return stripped || original;
}

function renderAddress(name?: string | null, address?: string | null) {
  return (
    <>
      <div>{name || "-"}</div>
      {(address || "-")
        .split("\n")
        .filter(Boolean)
        .map((line, index) => (
          <div key={`${line}-${index}`}>{line}</div>
        ))}
    </>
  );
}

function renderDetail(type: string, detail?: string | null) {
  if (!detail) {
    return null;
  }

  if (type === "SPH") {
    const points = detail
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (points.length === 0) {
      return null;
    }

    return (
      <ul className="line-detail mb-0 ps-3">
        {points.map((point, idx) => (
          <li key={`${point}-${idx}`}>{point}</li>
        ))}
      </ul>
    );
  }

  return <div className="line-detail">{detail}</div>;
}

export default async function PreviewDocumentPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const resolved = await params;
  const type = asDocumentType(resolved.type);
  const company = await prisma.companyProfile.findFirst();
  const document =
    type === "INVOICE"
      ? await prisma.invoice.findFirstOrThrow({
          where: { id: resolved.id, ...notDeleted },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        })
      : type === "PURCHASE_ORDER"
        ? await prisma.purchaseOrder.findFirstOrThrow({
            where: { id: resolved.id, ...notDeleted },
            include: { items: { orderBy: { sortOrder: "asc" } } },
          })
        : type === "SURAT_JALAN"
          ? await prisma.suratJalan.findFirstOrThrow({
              where: { id: resolved.id, ...notDeleted },
              include: { items: { orderBy: { sortOrder: "asc" } } },
            })
          : await prisma.sph.findFirstOrThrow({
              where: { id: resolved.id, ...notDeleted },
              include: { items: { orderBy: { sortOrder: "asc" } } },
            });

  const lines = document.items;
  const total = lines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
    0,
  );
  const notePayload =
    "notes" in document
      ? document.notes
      : null;
  const offerNotes =
    Array.isArray(notePayload)
      ? notePayload
      : notePayload &&
          typeof notePayload === "object" &&
          !Array.isArray(notePayload) &&
          Array.isArray((notePayload as Record<string, unknown>).offerNotes)
        ? ((notePayload as Record<string, unknown>).offerNotes as unknown[]).map((item) =>
            String(item),
          )
        : [];
  const additionalNotes =
    notePayload &&
      typeof notePayload === "object" &&
      !Array.isArray(notePayload) &&
      Array.isArray((notePayload as Record<string, unknown>).additionalNotes)
      ? ((notePayload as Record<string, unknown>).additionalNotes as unknown[]).map((item) =>
          String(item),
        )
      : [];
  const referencePoNumber = "referencePoNumber" in document ? document.referencePoNumber : null;
  const referenceBastSjNumber = "referenceBastSjNumber" in document ? document.referenceBastSjNumber : null;
  const subject = "subject" in document ? document.subject : null;
  const billToName =
    "billToName" in document
      ? document.billToName
      : "orderToName" in document
        ? document.orderToName
        : "recipientName" in document
          ? document.recipientName
          : null;
  const billToAddress = "billToAddress" in document ? document.billToAddress : "orderToAddress" in document ? document.orderToAddress : null;
  const deliveredToName =
    "deliveredToName" in document
      ? document.deliveredToName
      : "recipientCompany" in document
        ? document.recipientCompany
        : "toName" in document
          ? document.toName
          : null;
  const deliveredToAddress =
    "deliveredToAddress" in document
      ? document.deliveredToAddress
      : "toAddress" in document
        ? document.toAddress
        : null;
  const fromName = "fromName" in document ? document.fromName : null;
  const fromAddress = "fromAddress" in document ? document.fromAddress : null;
  const paymentTerms = "paymentTerms" in document ? document.paymentTerms : null;
  const deliveryNotes = "deliveryNotes" in document ? document.deliveryNotes : null;
  const salesPerson = "salesPerson" in document ? document.salesPerson : null;
  const withSignature = "withSignature" in document ? document.withSignature : true;
  const signerName =
    type === "PURCHASE_ORDER" && salesPerson
      ? salesPerson
      : "Realdi Adithya Saputra";
  const poTaxId = "taxId" in document ? document.taxId : null;
  const poSubtotal = type === "PURCHASE_ORDER" ? total : 0;
  const poPpn = poSubtotal * 0.11;
  const poGrandTotal = poSubtotal + poPpn;
  const invoiceSubtotal = type === "INVOICE" ? total : 0;
  const invoicePpn = invoiceSubtotal * 0.11;
  const invoiceGrandTotal = invoiceSubtotal + invoicePpn;
  const sphPartnerName = (deliveredToName || "Netciti").trim();
  const verifyUrl = getDocumentVerifyUrl(type, resolved.id);
  const qrDataUrl = await getDocumentQrDataUrl(verifyUrl);

  return (
    <main className="relative bg-slate-200 p-4">
      <PrintButton />
      <article
        className={`doc-preview container${type === "INVOICE" ? " doc-preview--invoice" : ""}`}
      >
        <div className="letterhead">
          <div className="letterhead-content">
            <Image
              src="/tda-logo-transparent.png"
              alt="TDA Logo"
              className="letterhead-logo"
              width={120}
              height={45}
              priority
            />
            <div className="letterhead-text">
              <div className="company-name">{company?.companyName ?? "PT. TRANSFORMASI DIGITAL ABADI"}</div>
              <div className="company-address">{company?.address ?? "-"}</div>
              <div className="company-contact">
                {company?.phone ?? "-"} | {company?.email ?? "-"} | {company?.website ?? "-"}
              </div>
            </div>
          </div>
          <div className="letterhead-qr" title={verifyUrl}>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL from server QRCode */}
            <img src={qrDataUrl} alt="QR verifikasi dokumen" className="doc-qr-img" width={80} height={80} />
            <span className="doc-qr-label">Verifikasi dokumen</span>
          </div>
        </div>

        <div className="invoice-title">{documentTypeLabels[type].toUpperCase()}</div>

        <div className="document-info">
          <div className="info-row"><span className="info-label">Date</span><span className="info-value">: {formatDateDDMMYYYY(document.issueDate)}</span></div>
          <div className="info-row"><span className="info-label">{type === "INVOICE" ? "Invoice No." : type === "PURCHASE_ORDER" ? "PO No." : type === "SURAT_JALAN" ? "Delivery Note No." : "Number"}</span><span className="info-value">: {document.documentNumber ?? "(Draft)"}</span></div>
          {(referencePoNumber || type === "SURAT_JALAN") && (
            <div className="info-row">
              <span className="info-label">PO No.</span>
              <span className="info-value">: {referencePoNumber ?? "-"}</span>
            </div>
          )}
          {referenceBastSjNumber && <div className="info-row"><span className="info-label">BAST / SJ No.</span><span className="info-value">: {referenceBastSjNumber}</span></div>}
          {poTaxId && (type === "INVOICE" || type === "PURCHASE_ORDER") && <div className="info-row"><span className="info-label">Tax ID</span><span className="info-value">: {poTaxId}</span></div>}
          {subject && <div className="info-row"><span className="info-label">Subject</span><span className="info-value">: {subject}</span></div>}
        </div>

        {(type === "INVOICE" || type === "PURCHASE_ORDER" || type === "SURAT_JALAN") && (
          <div className="address-section">
            <div className="address-box">
              <div className="address-title">
                {type === "INVOICE" ? "Bill To" : type === "PURCHASE_ORDER" ? "Order To" : "Sent From"}
              </div>
              {renderAddress(type === "SURAT_JALAN" ? fromName : billToName, type === "SURAT_JALAN" ? fromAddress : billToAddress)}
            </div>
            <div className="address-box">
              <div className="address-title">{type === "SURAT_JALAN" ? "Sent To" : "Delivered To"}</div>
              {renderAddress(deliveredToName, deliveredToAddress)}
            </div>
          </div>
        )}

        {type === "SPH" && (
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <div className="payment-title">To</div>
            <div>Attn. {sphNameForSalutation(billToName)}</div>
            <div>{deliveredToName || "-"}</div>
          </div>
        )}

        {type === "SPH" && (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <p>Dear Sir/Madam,</p>
            <p style={{ marginTop: 8 }}>
              We, PT Transformasi Digital Abadi as an official partner of{" "}
              {sphPartnerName}, would like to submit the following quotation:
            </p>
          </div>
        )}

        <table className="item-table">
          <thead>
            {type === "SURAT_JALAN" ? (
              <tr>
                <th>No.</th>
                <th>Deskripsi Barang</th>
                <th className="text-center">Quantity</th>
                <th className="text-center">Unit</th>
                <th className="text-center">Kondisi</th>
              </tr>
            ) : (
              <tr>
                <th>{type === "SPH" ? "Item Name" : "Item Description"}</th>
                <th className="text-center">Quantity</th>
                <th className="text-center">Unit</th>
                <th className="text-right">{type === "SPH" ? "Harga Satuan (Rp)" : "Price"}</th>
                <th className="text-right">Total</th>
              </tr>
            )}
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const lineTotal = Number(line.quantity) * Number(line.unitPrice);
              if (type === "SURAT_JALAN") {
                return (
                  <tr key={line.id}>
                    <td className="text-center">{index + 1}</td>
                    <td>
                      <div>{line.description}</div>
                      {line.detail && <div className="line-detail">{line.detail}</div>}
                    </td>
                    <td className="text-center">{Number(line.quantity)}</td>
                    <td className="text-center">{line.unit}</td>
                    <td className="text-center">{line.detail ? "Baik" : "-"}</td>
                  </tr>
                );
              }

              return (
                <tr key={line.id}>
                  <td>
                    <div>{line.description}</div>
                    {renderDetail(type, line.detail)}
                  </td>
                  <td className="text-center">{Number(line.quantity)}</td>
                  <td className="text-center">{line.unit}</td>
                  <td className="text-right">
                    {formatCurrency(Number(line.unitPrice))}
                  </td>
                  <td className="text-right">
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {type === "PURCHASE_ORDER" ? (
          <table className="item-table" style={{ marginTop: 20, width: 400, marginLeft: "auto" }}>
            <tbody>
              <tr>
                <td style={{ border: "none", padding: "8px 10px", fontWeight: "bold" }}>Subtotal</td>
                <td style={{ border: "none", padding: "8px 10px", textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(poSubtotal)}
                </td>
              </tr>
              <tr>
                <td style={{ border: "none", padding: "8px 10px", fontWeight: "bold" }}>PPN 11%</td>
                <td style={{ border: "none", padding: "8px 10px", textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(poPpn)}
                </td>
              </tr>
              <tr style={{ borderTop: "2px solid #2c3e50" }}>
                <td style={{ border: "none", padding: "12px 10px", fontWeight: "bold", fontSize: 16 }}>
                  Total Purchase Order
                </td>
                <td style={{ border: "none", padding: "12px 10px", textAlign: "right", fontWeight: "bold", fontSize: 16 }}>
                  {formatCurrency(poGrandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        ) : type === "INVOICE" ? (
          <table className="item-table" style={{ marginTop: 20, width: 400, marginLeft: "auto" }}>
            <tbody>
              <tr>
                <td style={{ border: "none", padding: "8px 10px", fontWeight: "bold" }}>Subtotal</td>
                <td style={{ border: "none", padding: "8px 10px", textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(invoiceSubtotal)}
                </td>
              </tr>
              <tr>
                <td style={{ border: "none", padding: "8px 10px", fontWeight: "bold" }}>PPN 11%</td>
                <td style={{ border: "none", padding: "8px 10px", textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(invoicePpn)}
                </td>
              </tr>
              <tr style={{ borderTop: "2px solid #2c3e50" }}>
                <td style={{ border: "none", padding: "12px 10px", fontWeight: "bold", fontSize: 16 }}>
                  Total Order
                </td>
                <td style={{ border: "none", padding: "12px 10px", textAlign: "right", fontWeight: "bold", fontSize: 16 }}>
                  {formatCurrency(invoiceGrandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        ) : type !== "SURAT_JALAN" && (
          <div className="total-section">
            <div className="total-row">Grand Total: {formatCurrency(total)}</div>
          </div>
        )}

        {paymentTerms && type !== "SURAT_JALAN" && (
          <div className="payment-info">
            <div className="payment-title">{type === "INVOICE" ? "Payment Transfer to Account - IDR" : "Payment Terms"}</div>
            <div style={{ whiteSpace: "pre-line" }}>{paymentTerms}</div>
          </div>
        )}

        {deliveryNotes && type === "SURAT_JALAN" && (
          <div className="payment-info">
            <div className="payment-title">{type === "SURAT_JALAN" ? "Delivery Instructions" : "Delivery Notes"}</div>
            <div style={{ whiteSpace: "pre-line" }}>{deliveryNotes}</div>
          </div>
        )}

        {offerNotes.length > 0 && type === "SPH" && (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <div className="payment-title">Offer Notes</div>
            {offerNotes.map((note) => (
              <div key={String(note)}>- {String(note)}</div>
            ))}
          </div>
        )}

        {additionalNotes.length > 0 && type === "SPH" && (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <div className="payment-title">Additional Information</div>
            {additionalNotes.map((note) => (
              <div key={String(note)}>- {String(note)}</div>
            ))}
          </div>
        )}

        {type === "SPH" && (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <p>
              We appreciate your consideration and look forward to the
              opportunity to work together on this procurement. Thank you for
              your attention and cooperation.
            </p>
          </div>
        )}

        <div className="signature-section">
          <div className="signature-content">
            {type === "SURAT_JALAN" ? (
              withSignature ? (
              <div style={{ width: "100%" }}>
                <div className="row g-4">
                  <div className="col-6">
                    <div style={{ fontWeight: 600 }}>Sender</div>
                    <div style={{ border: "1px solid #000", height: 110, marginTop: 8, marginBottom: 10 }} />
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>Name</span>: Realdi Adithya Saputra
                    </div>
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>Position</span>: Sales &amp; Marketing
                    </div>
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>Date</span>: {formatLongDateID(document.issueDate)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div style={{ fontWeight: 600 }}>Receiver</div>
                    <div style={{ border: "1px solid #000", height: 110, marginTop: 8, marginBottom: 10 }} />
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>Name</span>:
                    </div>
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>Position</span>:
                    </div>
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>Date</span>:
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 14, fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>Catatan:</div>
                  <div style={{ fontStyle: "italic" }}>• Surat jalan ini harus disertakan saat pengiriman barang</div>
                  <div style={{ fontStyle: "italic" }}>• Penerima wajib memeriksa barang sebelum menandatangani</div>
                  <div style={{ fontStyle: "italic" }}>• Jika ada ketidaksesuaian, segera hubungi PT. TRANSFORMASI DIGITAL ABADI</div>
                </div>
              </div>
              ) : (
                <div style={{ width: "100%" }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Signature</div>
                  <div style={{ border: "1px solid #000", height: 120 }} />
                </div>
              )
            ) : (
              <div className="signature-left">
                <div>Yours sincerely,</div>
                <div style={{ marginTop: 16, fontWeight: 600 }}>
                  {company?.companyName ?? "PT. TRANSFORMASI DIGITAL ABADI"}
                </div>
                {withSignature ? (
                  <>
                    <Image
                      src="/tanda-tangan.png"
                      alt="Tanda tangan"
                      className="signature-image"
                      width={120}
                      height={50}
                    />
                    <div className="signature-line" />
                    <div style={{ marginTop: 6 }}>{signerName}</div>
                    <div>Head of Sales &amp; Marketing</div>
                  </>
                ) : (
                  <div style={{ marginTop: 8, border: "1px solid #000", width: 220, height: 90 }} />
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    </main>
  );
}

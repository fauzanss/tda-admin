import Image from "next/image";

import { PrintButton } from "@/app/admin/documents/PrintButton";
import { DocumentLocale, DocumentType } from "@/generated/prisma/client";
import { getDocumentStrings } from "@/lib/document-i18n";
import { getDocumentQrDataUrl, getRequestUrlForPath } from "@/lib/document-verify-qr";
import { getDocumentPreviewPath } from "@/lib/document-paths";
import { formatCurrency, formatLongDate } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

function formatDateDDMMYYYY(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Strip "Yth." / "Yang Terhormat" from stored name so salutation prefix is not duplicated. */
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
          <li key={`${idx}-${String(point)}`}>{String(point)}</li>
        ))}
      </ul>
    );
  }

  return <div className="line-detail">{detail}</div>;
}

function documentNumberLabel(type: DocumentType, t: ReturnType<typeof getDocumentStrings>) {
  if (type === "INVOICE") {
    return t.invoiceNo;
  }
  if (type === "PURCHASE_ORDER") {
    return t.poNo;
  }
  if (type === "SURAT_JALAN") {
    return t.deliveryNoteNo;
  }
  return t.number;
}

export async function DocumentPreviewView({
  type,
  id,
}: Readonly<{
  type: DocumentType;
  id: string;
}>) {
  const company = await prisma.companyProfile.findFirst();
  const document =
    type === "INVOICE"
      ? await prisma.invoice.findFirstOrThrow({
          where: { id, ...notDeleted },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        })
      : type === "PURCHASE_ORDER"
        ? await prisma.purchaseOrder.findFirstOrThrow({
            where: { id, ...notDeleted },
            include: { items: { orderBy: { sortOrder: "asc" } } },
          })
        : type === "SURAT_JALAN"
          ? await prisma.suratJalan.findFirstOrThrow({
              where: { id, ...notDeleted },
              include: { items: { orderBy: { sortOrder: "asc" } } },
            })
          : await prisma.sph.findFirstOrThrow({
              where: { id, ...notDeleted },
              include: { items: { orderBy: { sortOrder: "asc" } } },
            });

  const locale = (document.locale ?? "ID") as DocumentLocale;
  const t = getDocumentStrings(locale, type);
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
  const previewUrl = await getRequestUrlForPath(getDocumentPreviewPath(type, id));
  const qrDataUrl = await getDocumentQrDataUrl(previewUrl);

  return (
    <main className="relative bg-slate-200 p-4">
      <PrintButton />
      <article
        className={`doc-preview container${type === "INVOICE" ? " doc-preview--invoice" : ""}`}
        data-doc-locale={locale}
      >
        <div className="letterhead">
          <div className="letterhead-content">
            <Image
              src="/tda-logo-transparent.png"
              alt="TDA Logo"
              className="letterhead-logo"
              width={96}
              height={36}
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
          <div className="letterhead-qr" title={previewUrl}>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL from server QRCode */}
            <img src={qrDataUrl} alt={t.qrAlt} className="doc-qr-img" width={54} height={54} />
            <span className="doc-qr-label">{t.qrLabel}</span>
          </div>
        </div>

        <div className="invoice-title">{t.documentTitle}</div>

        <div className="document-info">
          <div className="info-row"><span className="info-label">{t.date}</span><span className="info-value">: {formatDateDDMMYYYY(document.issueDate)}</span></div>
          <div className="info-row"><span className="info-label">{documentNumberLabel(type, t)}</span><span className="info-value">: {document.documentNumber ?? t.draft}</span></div>
          {(referencePoNumber || type === "SURAT_JALAN") && (
            <div className="info-row">
              <span className="info-label">{t.poNo}</span>
              <span className="info-value">: {referencePoNumber ?? "-"}</span>
            </div>
          )}
          {referenceBastSjNumber && <div className="info-row"><span className="info-label">{t.bastSjNo}</span><span className="info-value">: {referenceBastSjNumber}</span></div>}
          {poTaxId && (type === "INVOICE" || type === "PURCHASE_ORDER") && <div className="info-row"><span className="info-label">{t.taxId}</span><span className="info-value">: {poTaxId}</span></div>}
          {subject && <div className="info-row"><span className="info-label">{t.subject}</span><span className="info-value">: {subject}</span></div>}
        </div>

        {(type === "INVOICE" || type === "PURCHASE_ORDER" || type === "SURAT_JALAN") && (
          <div className="address-section">
            <div className="address-box">
              <div className="address-title">
                {type === "INVOICE" ? t.billTo : type === "PURCHASE_ORDER" ? t.orderTo : t.sentFrom}
              </div>
              {renderAddress(type === "SURAT_JALAN" ? fromName : billToName, type === "SURAT_JALAN" ? fromAddress : billToAddress)}
            </div>
            <div className="address-box">
              <div className="address-title">{type === "SURAT_JALAN" ? t.sentTo : t.deliveredTo}</div>
              {renderAddress(deliveredToName, deliveredToAddress)}
            </div>
          </div>
        )}

        {type === "SPH" && (
          <div className="doc-section">
            <div className="payment-title">{t.to}</div>
            <div>{t.attnPrefix} {sphNameForSalutation(billToName)}</div>
            <div>{deliveredToName || "-"}</div>
          </div>
        )}

        {type === "SPH" && (
          <div className="doc-section">
            <p>{t.sphIntroGreeting}</p>
            <p>{t.sphIntroBody(sphPartnerName)}</p>
          </div>
        )}

        <table className="item-table">
          <thead>
            {type === "SURAT_JALAN" ? (
              <tr>
                <th>{t.itemNo}</th>
                <th>{t.itemDescription}</th>
                <th className="text-center">{t.quantity}</th>
                <th className="text-center">{t.unit}</th>
                <th className="text-center">{t.condition}</th>
              </tr>
            ) : (
              <tr>
                <th>{type === "SPH" ? t.itemName : t.itemDescription}</th>
                <th className="text-center">{t.quantity}</th>
                <th className="text-center">{t.unit}</th>
                <th className="text-right">{type === "SPH" ? t.unitPrice : t.price}</th>
                <th className="text-right">{t.total}</th>
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
                    <td className="text-center">{line.detail ? t.conditionGood : "-"}</td>
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
                    {formatCurrency(Number(line.unitPrice), locale)}
                  </td>
                  <td className="text-right">
                    {formatCurrency(lineTotal, locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {type === "PURCHASE_ORDER" ? (
          <table className="item-table doc-totals-table">
            <tbody>
              <tr>
                <td style={{ fontWeight: "bold" }}>{t.subtotal}</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(poSubtotal, locale)}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold" }}>{t.ppn}</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(poPpn, locale)}
                </td>
              </tr>
              <tr style={{ borderTop: "2px solid #2c3e50" }}>
                <td style={{ fontWeight: "bold" }}>{t.totalPurchaseOrder}</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(poGrandTotal, locale)}
                </td>
              </tr>
            </tbody>
          </table>
        ) : type === "INVOICE" ? (
          <table className="item-table doc-totals-table">
            <tbody>
              <tr>
                <td style={{ fontWeight: "bold" }}>{t.subtotal}</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(invoiceSubtotal, locale)}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold" }}>{t.ppn}</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(invoicePpn, locale)}
                </td>
              </tr>
              <tr style={{ borderTop: "2px solid #2c3e50" }}>
                <td style={{ fontWeight: "bold" }}>{t.totalOrder}</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(invoiceGrandTotal, locale)}
                </td>
              </tr>
            </tbody>
          </table>
        ) : type !== "SURAT_JALAN" && (
          <div className="total-section">
            <div className="total-row">{t.grandTotal}: {formatCurrency(total, locale)}</div>
          </div>
        )}

        {paymentTerms && type !== "SURAT_JALAN" && (
          <div className="payment-info">
            <div className="payment-title">{type === "INVOICE" ? t.paymentTransfer : t.paymentTerms}</div>
            <div style={{ whiteSpace: "pre-line" }}>{paymentTerms}</div>
          </div>
        )}

        {deliveryNotes && type === "SURAT_JALAN" && (
          <div className="payment-info">
            <div className="payment-title">{t.deliveryInstructions}</div>
            <div style={{ whiteSpace: "pre-line" }}>{deliveryNotes}</div>
          </div>
        )}

        {offerNotes.length > 0 && type === "SPH" && (
          <div className="doc-section">
            <div className="payment-title">{t.offerNotes}</div>
            {offerNotes.map((note) => (
              <div key={String(note)}>- {String(note)}</div>
            ))}
          </div>
        )}

        {additionalNotes.length > 0 && type === "SPH" && (
          <div className="doc-section">
            <div className="payment-title">{t.additionalInformation}</div>
            {additionalNotes.map((note) => (
              <div key={String(note)}>- {String(note)}</div>
            ))}
          </div>
        )}

        {type === "SPH" && (
          <div className="doc-section">
            <p>{t.sphClosing}</p>
          </div>
        )}

        <div className="signature-section">
          <div className="signature-content">
            {type === "SURAT_JALAN" ? (
              withSignature ? (
              <div style={{ width: "100%" }}>
                <div className="row g-4">
                  <div className="col-6">
                    <div style={{ fontWeight: 600 }}>{t.sender}</div>
                    <div className="signature-box" />
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>{t.name}</span>: Realdi Adithya Saputra
                    </div>
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>{t.position}</span>: Sales &amp; Marketing
                    </div>
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>{t.date}</span>: {formatLongDate(document.issueDate, locale)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div style={{ fontWeight: 600 }}>{t.receiver}</div>
                    <div className="signature-box" />
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>{t.name}</span>:
                    </div>
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>{t.position}</span>:
                    </div>
                    <div>
                      <span style={{ display: "inline-block", width: 72 }}>{t.date}</span>:
                    </div>
                  </div>
                </div>
                <div className="doc-section">
                  <div style={{ fontWeight: 600 }}>{t.notesTitle}</div>
                  <div style={{ fontStyle: "italic" }}>• {t.noteDeliveryInclude}</div>
                  <div style={{ fontStyle: "italic" }}>• {t.noteInspectBeforeSign}</div>
                  <div style={{ fontStyle: "italic" }}>• {t.noteContactCompany}</div>
                </div>
              </div>
              ) : (
                <div style={{ width: "100%" }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.signature}</div>
                  <div className="signature-box signature-box-lg" />
                </div>
              )
            ) : (
              <div className="signature-left">
                <div>{t.yoursSincerely}</div>
                <div className="signature-name" style={{ fontWeight: 600 }}>
                  {company?.companyName ?? "PT. TRANSFORMASI DIGITAL ABADI"}
                </div>
                {withSignature ? (
                  <>
                    <Image
                      src="/tanda-tangan.png"
                      alt={t.signatureAlt}
                      className="signature-image"
                      width={100}
                      height={42}
                    />
                    <div className="signature-line" />
                    <div className="signature-name">{signerName}</div>
                    <div>{t.headOfSales}</div>
                  </>
                ) : (
                  <div className="signature-box" style={{ width: 220 }} />
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    </main>
  );
}

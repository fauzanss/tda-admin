"use client";

import { DocumentLocale, DocumentType, PaymentTermType } from "@/generated/prisma/client";
import { useState } from "react";

import { PaymentTermSection } from "@/app/admin/po/PaymentTermSection";
import { GoogleDriveLinkFields } from "@/app/admin/po/GoogleDriveLinkFields";
import { PoLinkOption, PoLinkSelector } from "@/app/admin/po/PoLinkSelector";
import type { InstallmentInput } from "@/lib/po-payment";

type FormLine = {
  description: string;
  detail: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

function formatPriceInput(value: number) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parsePriceInput(raw: string) {
  const sanitized = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const numeric = Number(sanitized);
  return Number.isNaN(numeric) ? 0 : numeric;
}

function extractSphNotes(notes: unknown) {
  if (Array.isArray(notes)) {
    return {
      offerNotes: notes.map((item) => String(item)).join("\n"),
      additionalNotes: "",
    };
  }

  if (notes && typeof notes === "object") {
    const noteObject = notes as Record<string, unknown>;
    const offerNotes = Array.isArray(noteObject.offerNotes)
      ? noteObject.offerNotes.map((item) => String(item)).join("\n")
      : "";
    const additionalNotes = Array.isArray(noteObject.additionalNotes)
      ? noteObject.additionalNotes.map((item) => String(item)).join("\n")
      : "";

    return { offerNotes, additionalNotes };
  }

  return { offerNotes: "", additionalNotes: "" };
}

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

type DocumentWithLines = {
  locale?: DocumentLocale | null;
  duplicatedFromNumber?: string | null;
  withSignature?: boolean | null;
  issueDate: Date;
  dueDate: Date | null;
  documentNumber: string | null;
  referencePoNumber: string | null;
  referenceBastSjNumber: string | null;
  customerReference: string | null;
  salesPerson: string | null;
  taxId: string | null;
  paymentTerms: string | null;
  paymentTermType?: PaymentTermType;
  installments?: InstallmentInput[];
  linkedPoMasukIds?: string[];
  gdriveWebViewLink?: string | null;
  gdriveFileName?: string | null;
  deliveryNotes: string | null;
  billToName: string | null;
  billToAddress: string | null;
  deliveredToName: string | null;
  deliveredToAddress: string | null;
  fromName: string | null;
  fromAddress: string | null;
  toName: string | null;
  toAddress: string | null;
  subject: string | null;
  notes: unknown;
  lines: Array<{
    description: string;
    detail: string | null;
    quantity: number;
    unit: string | null;
    unitPrice: number;
  }>;
};

type CompanyOption = {
  id: string;
  companyName: string;
  companyAlias: string | null;
  address: string;
  isActive: boolean;
};

type PurchaseOrderOption = {
  id: string;
  documentNumber: string | null;
  orderToName: string | null;
  orderToAddress: string | null;
  deliveredToName: string | null;
  deliveredToAddress: string | null;
  items?: Array<{
    description: string;
    detail: string | null;
    quantity: number;
    unit: string | null;
    unitPrice: number;
  }>;
};

type SuratJalanOption = {
  id: string;
  documentNumber: string | null;
};

function emptyLine(): FormLine {
  return {
    description: "",
    detail: "",
    quantity: 1,
    unit: "pcs",
    unitPrice: 0,
  };
}

export function DocumentForm({
  type,
  companies,
  purchaseOrders,
  suratJalans,
  incomingPoOptions = [],
  defaultValue,
  duplicateInfo,
  onSubmit,
  submitLabel,
}: {
  type: DocumentType;
  companies: CompanyOption[];
  purchaseOrders?: PurchaseOrderOption[];
  suratJalans?: SuratJalanOption[];
  incomingPoOptions?: PoLinkOption[];
  defaultValue?: DocumentWithLines;
  duplicateInfo?: string | null;
  onSubmit: (formData: FormData) => void;
  submitLabel: string;
}) {
  const [lines, setLines] = useState<FormLine[]>(
    defaultValue?.lines.map((line) => ({
      description: line.description,
      detail: line.detail ?? "",
      quantity: Number(line.quantity),
      unit: line.unit ?? "",
      unitPrice: Number(line.unitPrice),
    })) ?? [emptyLine()],
  );
  const [priceInputs, setPriceInputs] = useState<string[]>(
    (defaultValue?.lines.map((line) => formatPriceInput(Number(line.unitPrice))) ?? [
      formatPriceInput(0),
    ]),
  );

  function updateLine(index: number, patch: Partial<FormLine>) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
    setPriceInputs((current) =>
      current.filter((_, lineIndex) => lineIndex !== index),
    );
  }

  const isInvoice = type === "INVOICE";
  const isPo = type === "PURCHASE_ORDER";
  const isSuratJalan = type === "SURAT_JALAN";
  const isSph = type === "SPH";
  const sphNotes = extractSphNotes(defaultValue?.notes);

  function applyCompanyToFields(
    companyId: string,
    nameField: string,
    addressField?: string,
  ) {
    const company = companies.find((item) => item.id === companyId);
    if (!company) return;

    const nameElement = document.querySelector<HTMLInputElement>(
      `input[name="${nameField}"]`,
    );
    if (nameElement) {
      nameElement.value = company.companyName;
    }

    if (addressField) {
      const addressElement = document.querySelector<HTMLTextAreaElement>(
        `textarea[name="${addressField}"]`,
      );
      if (addressElement) {
        addressElement.value = company.address;
      }
    }
  }

  function getCompanyIdByName(name?: string | null) {
    const target = normalizeText(name);
    if (!target) return "";

    const matched = companies.find((company) => {
      const byName = normalizeText(company.companyName) === target;
      const byAlias = normalizeText(company.companyAlias) === target;
      return byName || byAlias;
    });

    return matched?.id ?? "";
  }

  function applyTextValue(name: string, value?: string | null, isTextArea?: boolean) {
    if (isTextArea) {
      const element = document.querySelector<HTMLTextAreaElement>(`textarea[name="${name}"]`);
      if (element && value) element.value = value;
      return;
    }

    const element = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (element && value) element.value = value;
  }

  function applyPoReference(poId: string) {
    const selected = purchaseOrders?.find((item) => item.id === poId);
    if (!selected) return;

    applyTextValue("referencePoNumber", selected.documentNumber ?? "");
    applyTextValue("fromName", selected.orderToName ?? "");
    applyTextValue("fromAddress", selected.orderToAddress ?? "", true);
    applyTextValue("toName", selected.deliveredToName ?? "");
    applyTextValue("toAddress", selected.deliveredToAddress ?? "", true);
  }

  function applyDocumentNumberToField(fieldName: string, value: string) {
    const element = document.querySelector<HTMLInputElement>(`input[name="${fieldName}"]`);
    if (element) {
      element.value = value;
    }
  }

  function applyInvoiceFromPo(poId: string) {
    const selected = purchaseOrders?.find((item) => item.id === poId);
    if (!selected) return;

    applyDocumentNumberToField("referencePoNumber", selected.documentNumber ?? "");

    if (selected.items && selected.items.length > 0) {
      const mappedLines = selected.items.map((item) => ({
        description: item.description,
        detail: item.detail ?? "",
        quantity: Number(item.quantity),
        unit: item.unit ?? "",
        unitPrice: Number(item.unitPrice),
      }));
      setLines(mappedLines);
      setPriceInputs(mappedLines.map((item) => formatPriceInput(item.unitPrice)));
    }
  }

  return (
    <form action={onSubmit} className="card">
      <div className="card-body">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      {duplicateInfo && (
        <div className="alert alert-info py-2 mb-3">
          Duplicated from document No: {duplicateInfo}
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Document Language</label>
          <select
            name="locale"
            className="form-select"
            defaultValue={defaultValue?.locale ?? "ID"}
          >
            <option value="EN">English</option>
            <option value="ID">Indonesian</option>
          </select>
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Create with Signature</label>
          <select
            name="withSignature"
            className="form-select"
            defaultValue={defaultValue?.withSignature === false ? "false" : "true"}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <Field name="issueDate" label="Document Date" type="date" defaultValue={defaultValue ? defaultValue.issueDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)} required />
        {isInvoice && (
          <Field
            name="dueDate"
            label="Due Date"
            type="date"
            defaultValue={defaultValue?.dueDate ? defaultValue.dueDate.toISOString().slice(0, 10) : ""}
          />
        )}
        <Field name="documentNumber" label="Document Number (optional for draft)" defaultValue={defaultValue?.documentNumber ?? ""} />
        {isInvoice && (
          <div className="col-12 col-md-6">
            <label className="form-label">Select PO Reference</label>
            <select
              className="form-select"
              defaultValue={
                purchaseOrders?.find((item) => item.documentNumber === defaultValue?.referencePoNumber)?.id ??
                ""
              }
              onChange={(event) => applyInvoiceFromPo(event.target.value)}
            >
              <option value="">Select PO Reference</option>
              {(purchaseOrders ?? []).map((po) => (
                <option key={po.id} value={po.id}>
                  {po.documentNumber ?? "(Draft PO)"}
                </option>
              ))}
            </select>
          </div>
        )}
        {isInvoice && (
          <Field name="referencePoNumber" label="PO Reference" defaultValue={defaultValue?.referencePoNumber ?? ""} />
        )}
        {isInvoice && (
          <div className="col-12 col-md-6">
            <label className="form-label">Select BAST/SJ Reference</label>
            <select
              className="form-select"
              defaultValue={
                suratJalans?.find(
                  (item) => item.documentNumber === defaultValue?.referenceBastSjNumber,
                )?.id ?? ""
              }
              onChange={(event) => {
                const selected = suratJalans?.find((item) => item.id === event.target.value);
                applyDocumentNumberToField("referenceBastSjNumber", selected?.documentNumber ?? "");
              }}
            >
              <option value="">Select BAST/SJ Reference</option>
              {(suratJalans ?? []).map((sj) => (
                <option key={sj.id} value={sj.id}>
                  {sj.documentNumber ?? "(Draft SJ)"}
                </option>
              ))}
            </select>
          </div>
        )}
        {isInvoice && (
          <>
            <Field name="referenceBastSjNumber" label="BAST/SJ Reference" defaultValue={defaultValue?.referenceBastSjNumber ?? ""} />
            <Field name="customerReference" label="Customer Reference" defaultValue={defaultValue?.customerReference ?? ""} />
          </>
        )}
        {isPo && (
          <Field name="salesPerson" label="Sales Person" defaultValue={defaultValue?.salesPerson ?? ""} />
        )}
        {(isInvoice || isPo) && <Field name="taxId" label="Tax ID" defaultValue={defaultValue?.taxId ?? ""} />}
      </div>

      {(isInvoice || isPo) && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-6">
            <label className="form-label">
              {isPo ? "Select Order To Company" : "Select Bill To Company"}
            </label>
            <select
              className="form-select"
              defaultValue={getCompanyIdByName(defaultValue?.billToName)}
              onChange={(event) =>
                applyCompanyToFields(event.target.value, "billToName", "billToAddress")
              }
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName}
                </option>
              ))}
            </select>
          </div>
          <Field
            name="billToName"
            label={isPo ? "Order To" : "Bill To"}
            defaultValue={defaultValue?.billToName ?? ""}
          />
          <TextArea
            name="billToAddress"
            label={isPo ? "Order To Address" : "Bill To Address"}
            defaultValue={defaultValue?.billToAddress ?? ""}
          />
          <Field name="deliveredToName" label="Delivered To" defaultValue={defaultValue?.deliveredToName ?? ""} />
          <div className="col-12 col-md-6">
            <label className="form-label">Select Delivered To Company</label>
            <select
              className="form-select"
              defaultValue={getCompanyIdByName(defaultValue?.deliveredToName)}
              onChange={(event) =>
                applyCompanyToFields(
                  event.target.value,
                  "deliveredToName",
                  "deliveredToAddress",
                )
              }
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName}
                </option>
              ))}
            </select>
          </div>
          <TextArea name="deliveredToAddress" label="Delivered To Address" defaultValue={defaultValue?.deliveredToAddress ?? ""} />
        </div>
      )}

      {isSuratJalan && (
        <div className="row g-3 mb-3">
          <input
            type="hidden"
            name="referencePoNumber"
            defaultValue={defaultValue?.referencePoNumber ?? ""}
          />
          <div className="col-12 col-md-6">
            <label className="form-label">PO Reference</label>
            <select
              className="form-select"
              defaultValue={
                purchaseOrders?.find((item) => item.documentNumber === defaultValue?.referencePoNumber)?.id ??
                ""
              }
              onChange={(event) => applyPoReference(event.target.value)}
            >
              <option value="">Select PO Reference</option>
              {(purchaseOrders ?? []).map((po) => (
                <option key={po.id} value={po.id}>
                  {po.documentNumber ?? "(Draft PO)"}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Select From Company</label>
            <select
              className="form-select"
              defaultValue={getCompanyIdByName(defaultValue?.fromName)}
              onChange={(event) =>
                applyCompanyToFields(event.target.value, "fromName", "fromAddress")
              }
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName}
                </option>
              ))}
            </select>
          </div>
          <Field name="fromName" label="Sent From" defaultValue={defaultValue?.fromName ?? ""} />
          <TextArea name="fromAddress" label="From Address" defaultValue={defaultValue?.fromAddress ?? ""} />
          <div className="col-12 col-md-6">
            <label className="form-label">Select To Company</label>
            <select
              className="form-select"
              defaultValue={getCompanyIdByName(defaultValue?.toName)}
              onChange={(event) =>
                applyCompanyToFields(event.target.value, "toName", "toAddress")
              }
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName}
                </option>
              ))}
            </select>
          </div>
          <Field name="toName" label="Sent To" defaultValue={defaultValue?.toName ?? ""} />
          <TextArea name="toAddress" label="To Address" defaultValue={defaultValue?.toAddress ?? ""} />
        </div>
      )}

      {isSph && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Select Company</label>
            <select
              className="form-select"
              defaultValue={getCompanyIdByName(defaultValue?.deliveredToName)}
              onChange={(event) =>
                applyCompanyToFields(event.target.value, "deliveredToName")
              }
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName}
                </option>
              ))}
            </select>
          </div>
          <Field name="billToName" label="Recipient (Name)" defaultValue={defaultValue?.billToName ?? ""} />
          <Field name="deliveredToName" label="Company" defaultValue={defaultValue?.deliveredToName ?? ""} />
        </div>
      )}

      <div className="row g-3 mb-3">
        {isSph && (
          <div className="col-12">
            <label className="form-label">Subject</label>
            <input
              name="subject"
              className="form-control"
              defaultValue={defaultValue?.subject ?? ""}
            />
          </div>
        )}
      </div>

      {isSph && (
        <div className="row g-3 mb-3">
          <TextArea
            name="paymentTerms"
            label="Payment Terms"
            defaultValue={defaultValue?.paymentTerms ?? ""}
          />
          <TextArea
            name="notesText"
            label="Offer Notes (1 line = 1 point)"
            defaultValue={sphNotes.offerNotes}
          />
        </div>
      )}

      <div className="row g-3 mb-3">
        {(isInvoice) && (
          <TextArea name="paymentTerms" label="Payment Terms" defaultValue={defaultValue?.paymentTerms ?? ""} />
        )}
        {isPo && (
          <>
            <PaymentTermSection
              initial={{
                paymentTermType: defaultValue?.paymentTermType ?? "LUMP_SUM",
                paymentTerms: defaultValue?.paymentTerms,
                installments: defaultValue?.installments,
              }}
            />
            <PoLinkSelector
              name="linkedPoMasukIds"
              label="Link to Incoming PO"
              options={incomingPoOptions}
              initialSelectedIds={defaultValue?.linkedPoMasukIds ?? []}
            />
            <div className="col-12">
              <GoogleDriveLinkFields
                initialLink={defaultValue?.gdriveWebViewLink}
                initialFileName={defaultValue?.gdriveFileName}
              />
            </div>
          </>
        )}
        {isSuratJalan && (
          <TextArea name="deliveryNotes" label="Delivery Instructions / Notes" defaultValue={defaultValue?.deliveryNotes ?? ""} />
        )}
        {isSph && (
          <TextArea
            name="additionalNotesText"
            label="Additional Information (1 line = 1 point)"
            defaultValue={sphNotes.additionalNotes}
            columnClass="col-12"
          />
        )}
      </div>

      <section>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h2 className="h5 fw-semibold mb-0">Items</h2>
          <button
            type="button"
            onClick={() => {
              setLines((current) => [...current, emptyLine()]);
              setPriceInputs((current) => [...current, formatPriceInput(0)]);
            }}
            className="btn btn-outline-primary btn-sm"
          >
            + Add Row
          </button>
        </div>
        {lines.map((line, index) => (
          <div key={index} className="border rounded p-3 mb-3">
            <div className="mb-2">
              <label className="form-label mb-1">{isSph ? "Item Name" : "Description"}</label>
              <input
                className="form-control"
                placeholder={isSph ? "Item Name" : "Description"}
                value={line.description}
                onChange={(event) => updateLine(index, { description: event.target.value })}
                required
              />
            </div>
            <div className="mb-2">
              <label className="form-label mb-1">Detail</label>
              <textarea
                className="form-control"
                placeholder={
                  isSph
                    ? "Details (1 line per point)"
                    : isSuratJalan
                      ? "Details / Serial / Condition"
                      : "Details"
                }
                rows={4}
                value={line.detail}
                onChange={(event) => updateLine(index, { detail: event.target.value })}
              />
            </div>
            <div className="mb-2">
              <label className="form-label mb-1">Qty</label>
              <input
                className="form-control"
                type="number"
                min={1}
                step={1}
                value={line.quantity}
                onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })}
              />
            </div>
            <div className="mb-2">
              <label className="form-label mb-1">Unit</label>
              <input
                className="form-control"
                placeholder="Unit"
                value={line.unit}
                onChange={(event) => updateLine(index, { unit: event.target.value })}
              />
            </div>
            <div className="mb-2">
              <label className="form-label mb-1">Price</label>
              <input
                className="form-control"
                type="text"
                inputMode="decimal"
                value={priceInputs[index] ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  setPriceInputs((current) =>
                    current.map((item, lineIndex) =>
                      lineIndex === index ? raw : item,
                    ),
                  );
                  updateLine(index, { unitPrice: parsePriceInput(raw) });
                }}
                onBlur={() => {
                  setPriceInputs((current) =>
                    current.map((item, lineIndex) =>
                      lineIndex === index ? formatPriceInput(lines[index].unitPrice) : item,
                    ),
                  );
                }}
                disabled={isSuratJalan}
              />
            </div>
            <div className="d-flex justify-content-end">
              <button
                type="button"
                onClick={() => removeLine(index)}
                className="btn btn-outline-danger"
                disabled={lines.length === 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </section>

      <button className="btn btn-primary mt-3" type="submit">
        {submitLabel}
      </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="col-12 col-md-6">
      <label className="form-label">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        type={type}
        className="form-control"
      />
    </div>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
  columnClass = "col-12 col-md-6",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  columnClass?: string;
}) {
  return (
    <div className={columnClass}>
      <label className="form-label">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="form-control"
      />
    </div>
  );
}

"use client";

import { DocumentLocale, DocumentType, PaymentTermType, SphOfferKind } from "@/generated/prisma/client";
import { useState } from "react";

import { PaymentTermSection } from "@/app/admin/po/PaymentTermSection";
import { GoogleDriveLinkFields } from "@/app/admin/po/GoogleDriveLinkFields";
import { PoLinkOption, PoLinkSelector } from "@/app/admin/po/PoLinkSelector";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { CompanySelect } from "@/components/admin/CompanySelect";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
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
  offerKind?: SphOfferKind;
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
    <form action={onSubmit}>
      <Card>
        <CardBody className="space-y-6">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="lines" value={JSON.stringify(lines)} />
          {duplicateInfo && (
            <Alert variant="info">
              Duplicated from document No: {duplicateInfo}
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="locale">Document Language</Label>
              <Select
                id="locale"
                name="locale"
                defaultValue={defaultValue?.locale ?? "ID"}
              >
                <option value="EN">English</option>
                <option value="ID">Indonesian</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="withSignature">Create with Signature</Label>
              <Select
                id="withSignature"
                name="withSignature"
                defaultValue={defaultValue?.withSignature === false ? "false" : "true"}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
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
            {isSph ? (
              defaultValue?.documentNumber ? (
                <div>
                  <Label>Document Number</Label>
                  <Input
                    value={defaultValue.documentNumber}
                    readOnly
                    disabled
                  />
                  <input type="hidden" name="documentNumber" value={defaultValue.documentNumber} />
                </div>
              ) : (
                <div>
                  <Label>Document Number</Label>
                  <Input
                    value="Auto-generated on save"
                    readOnly
                    disabled
                  />
                </div>
              )
            ) : (
              <Field
                name="documentNumber"
                label="Document Number (optional for draft)"
                defaultValue={defaultValue?.documentNumber ?? ""}
              />
            )}
            {isInvoice && (
              <div>
                <Label htmlFor="po-reference-select">Select PO Reference</Label>
                <Select
                  id="po-reference-select"
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
                </Select>
              </div>
            )}
            {isInvoice && (
              <Field name="referencePoNumber" label="PO Reference" defaultValue={defaultValue?.referencePoNumber ?? ""} />
            )}
            {isInvoice && (
              <div>
                <Label htmlFor="bast-sj-reference-select">Select BAST/SJ Reference</Label>
                <Select
                  id="bast-sj-reference-select"
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
                </Select>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="bill-to-company-select">
                  {isPo ? "Select Order To Company" : "Select Bill To Company"}
                </Label>
                <CompanySelect
                  id="bill-to-company-select"
                  companies={companies}
                  defaultValue={getCompanyIdByName(defaultValue?.billToName)}
                  onChange={(companyId) =>
                    applyCompanyToFields(companyId, "billToName", "billToAddress")
                  }
                />
              </div>
              <Field
                name="billToName"
                label={isPo ? "Order To" : "Bill To"}
                defaultValue={defaultValue?.billToName ?? ""}
              />
              <FormTextArea
                name="billToAddress"
                label={isPo ? "Order To Address" : "Bill To Address"}
                defaultValue={defaultValue?.billToAddress ?? ""}
              />
              <Field name="deliveredToName" label="Delivered To" defaultValue={defaultValue?.deliveredToName ?? ""} />
              <div>
                <Label htmlFor="delivered-to-company-select">Select Delivered To Company</Label>
                <CompanySelect
                  id="delivered-to-company-select"
                  companies={companies}
                  defaultValue={getCompanyIdByName(defaultValue?.deliveredToName)}
                  onChange={(companyId) =>
                    applyCompanyToFields(
                      companyId,
                      "deliveredToName",
                      "deliveredToAddress",
                    )
                  }
                />
              </div>
              <FormTextArea name="deliveredToAddress" label="Delivered To Address" defaultValue={defaultValue?.deliveredToAddress ?? ""} />
            </div>
          )}

          {isSuratJalan && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="hidden"
                name="referencePoNumber"
                defaultValue={defaultValue?.referencePoNumber ?? ""}
              />
              <div>
                <Label htmlFor="sj-po-reference-select">PO Reference</Label>
                <Select
                  id="sj-po-reference-select"
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
                </Select>
              </div>
              <div>
                <Label htmlFor="from-company-select">Select From Company</Label>
                <CompanySelect
                  id="from-company-select"
                  companies={companies}
                  defaultValue={getCompanyIdByName(defaultValue?.fromName)}
                  onChange={(companyId) =>
                    applyCompanyToFields(companyId, "fromName", "fromAddress")
                  }
                />
              </div>
              <Field name="fromName" label="Sent From" defaultValue={defaultValue?.fromName ?? ""} />
              <FormTextArea name="fromAddress" label="From Address" defaultValue={defaultValue?.fromAddress ?? ""} />
              <div>
                <Label htmlFor="to-company-select">Select To Company</Label>
                <CompanySelect
                  id="to-company-select"
                  companies={companies}
                  defaultValue={getCompanyIdByName(defaultValue?.toName)}
                  onChange={(companyId) =>
                    applyCompanyToFields(companyId, "toName", "toAddress")
                  }
                />
              </div>
              <Field name="toName" label="Sent To" defaultValue={defaultValue?.toName ?? ""} />
              <FormTextArea name="toAddress" label="To Address" defaultValue={defaultValue?.toAddress ?? ""} />
            </div>
          )}

          {isSph && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="sph-company-select">Select Company</Label>
                <CompanySelect
                  id="sph-company-select"
                  companies={companies}
                  defaultValue={getCompanyIdByName(defaultValue?.deliveredToName)}
                  onChange={(companyId) =>
                    applyCompanyToFields(companyId, "deliveredToName")
                  }
                />
              </div>
              <Field name="billToName" label="Recipient (Name)" defaultValue={defaultValue?.billToName ?? ""} />
              <Field name="deliveredToName" label="Company" defaultValue={defaultValue?.deliveredToName ?? ""} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isSph && (
              <>
                <div>
                  <Label htmlFor="offerKind">Offer Kind</Label>
                  <Select
                    id="offerKind"
                    name="offerKind"
                    defaultValue={defaultValue?.offerKind ?? "PROCUREMENT"}
                  >
                    <option value="PROCUREMENT">Pengadaan (Procurement)</option>
                    <option value="SERVICE">Jasa (Service)</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    defaultValue={defaultValue?.subject ?? ""}
                  />
                </div>
              </>
            )}
          </div>

          {isSph && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormTextArea
                name="paymentTerms"
                label="Payment Terms"
                defaultValue={defaultValue?.paymentTerms ?? ""}
              />
              <FormTextArea
                name="notesText"
                label="Offer Notes (1 line = 1 point)"
                defaultValue={sphNotes.offerNotes}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(isInvoice) && (
              <FormTextArea name="paymentTerms" label="Payment Terms" defaultValue={defaultValue?.paymentTerms ?? ""} />
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
                <div className="md:col-span-2">
                  <GoogleDriveLinkFields
                    initialLink={defaultValue?.gdriveWebViewLink}
                    initialFileName={defaultValue?.gdriveFileName}
                  />
                </div>
              </>
            )}
            {isSuratJalan && (
              <FormTextArea name="deliveryNotes" label="Delivery Instructions / Notes" defaultValue={defaultValue?.deliveryNotes ?? ""} />
            )}
            {isSph && (
              <FormTextArea
                name="additionalNotesText"
                label="Additional Information (1 line = 1 point)"
                defaultValue={sphNotes.additionalNotes}
                className="md:col-span-2"
              />
            )}
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-tda-navy">Items</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setLines((current) => [...current, emptyLine()]);
                  setPriceInputs((current) => [...current, formatPriceInput(0)]);
                }}
              >
                + Add Row
              </Button>
            </div>
            {lines.map((line, index) => (
              <div key={index} className="mb-4 rounded-lg border border-slate-200 p-4">
                <div className="mb-3">
                  <Label className="mb-1">{isSph ? "Item Name" : "Description"}</Label>
                  <Input
                    placeholder={isSph ? "Item Name" : "Description"}
                    value={line.description}
                    onChange={(event) => updateLine(index, { description: event.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <Label className="mb-1">Detail</Label>
                  <Textarea
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
                <div className="mb-3">
                  <Label className="mb-1">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={line.quantity}
                    onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })}
                  />
                </div>
                <div className="mb-3">
                  <Label className="mb-1">Unit</Label>
                  <Input
                    placeholder="Unit"
                    value={line.unit}
                    onChange={(event) => updateLine(index, { unit: event.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <Label className="mb-1">Price</Label>
                  <Input
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
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => removeLine(index)}
                    disabled={lines.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </section>

          <SubmitButton pendingLabel="Saving...">{submitLabel}</SubmitButton>
        </CardBody>
      </Card>
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
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        type={type}
      />
    </div>
  );
}

function FormTextArea({
  name,
  label,
  defaultValue,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        rows={3}
      />
    </div>
  );
}

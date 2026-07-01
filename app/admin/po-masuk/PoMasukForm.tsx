"use client";

import { PaymentTermType } from "@/generated/prisma/client";
import { useState } from "react";

import { GoogleDriveLinkFields } from "@/app/admin/po/GoogleDriveLinkFields";
import { PaymentTermSection } from "@/app/admin/po/PaymentTermSection";
import { PoLinkOption, PoLinkSelector } from "@/app/admin/po/PoLinkSelector";
import type { InstallmentInput } from "@/lib/po-payment";

type PoMasukFormProps = Readonly<{
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  outgoingPoOptions: PoLinkOption[];
  initial?: {
    id?: string;
    poNumber?: string | null;
    issueDate?: Date | null;
    distributorName?: string;
    notes?: string | null;
    paymentTermType?: PaymentTermType;
    paymentTerms?: string | null;
    totalAmount?: number | null;
    installments?: InstallmentInput[];
    linkedPurchaseOrderIds?: string[];
    gdriveWebViewLink?: string | null;
    gdriveFileName?: string | null;
  };
  requireGdriveLink?: boolean;
}>;

function formatDateInput(date: Date | null | undefined) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PoMasukForm({
  action,
  submitLabel,
  outgoingPoOptions,
  initial,
  requireGdriveLink = false,
}: PoMasukFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      action={async (formData) => {
        setError(null);
        setIsSubmitting(true);
        try {
          await action(formData);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save Incoming PO.");
          setIsSubmitting(false);
        }
      }}
      className="card"
    >
      <div className="card-body">
        {initial?.id && <input type="hidden" name="id" value={initial.id} />}

        <div className="mb-3">
          <label htmlFor="distributorName" className="form-label">
            Distributor Name <span className="text-danger">*</span>
          </label>
          <input
            id="distributorName"
            name="distributorName"
            type="text"
            className="form-control"
            defaultValue={initial?.distributorName ?? ""}
            required
          />
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="poNumber" className="form-label">
              PO Number
            </label>
            <input
              id="poNumber"
              name="poNumber"
              type="text"
              className="form-control"
              defaultValue={initial?.poNumber ?? ""}
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="issueDate" className="form-label">
              Issue Date
            </label>
            <input
              id="issueDate"
              name="issueDate"
              type="date"
              className="form-control"
              defaultValue={formatDateInput(initial?.issueDate)}
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="totalAmount" className="form-label">
              Total Amount (for termin calculation)
            </label>
            <input
              id="totalAmount"
              name="totalAmount"
              type="number"
              min={0}
              step={1}
              className="form-control"
              defaultValue={initial?.totalAmount ?? ""}
            />
          </div>
        </div>

        <div className="row g-3 mt-1">
          <PaymentTermSection
            initial={{
              paymentTermType: initial?.paymentTermType ?? "LUMP_SUM",
              paymentTerms: initial?.paymentTerms,
              installments: initial?.installments,
            }}
          />
          <PoLinkSelector
            name="linkedPurchaseOrderIds"
            label="Link to Outgoing PO"
            options={outgoingPoOptions}
            initialSelectedIds={initial?.linkedPurchaseOrderIds ?? []}
          />
        </div>

        <div className="mt-3">
          <GoogleDriveLinkFields
            initialLink={initial?.gdriveWebViewLink}
            initialFileName={initial?.gdriveFileName}
            required={requireGdriveLink}
          />
        </div>

        <div className="mb-3 mt-3">
          <label htmlFor="notes" className="form-label">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            className="form-control"
            rows={3}
            defaultValue={initial?.notes ?? ""}
          />
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

"use client";

import { PaymentTermType } from "@/generated/prisma/client";
import { useState } from "react";

import { GoogleDriveLinkFields } from "@/app/admin/po/GoogleDriveLinkFields";
import { PaymentTermSection } from "@/app/admin/po/PaymentTermSection";
import { PoLinkOption, PoLinkSelector } from "@/app/admin/po/PoLinkSelector";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  return (
    <form
      action={async (formData) => {
        setError(null);
        try {
          await action(formData);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save Incoming PO.");
        }
      }}
    >
      <Card>
        <CardBody className="space-y-4">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="distributorName">
              Distributor Name <span className="text-red-600">*</span>
            </Label>
            <Input
              id="distributorName"
              name="distributorName"
              type="text"
              defaultValue={initial?.distributorName ?? ""}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="poNumber">PO Number</Label>
              <Input
                id="poNumber"
                name="poNumber"
                type="text"
                defaultValue={initial?.poNumber ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                name="issueDate"
                type="date"
                defaultValue={formatDateInput(initial?.issueDate)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalAmount">Total Amount (for termin calculation)</Label>
              <Input
                id="totalAmount"
                name="totalAmount"
                type="number"
                min={0}
                step={1}
                defaultValue={initial?.totalAmount ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-4">
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

          <GoogleDriveLinkFields
            initialLink={initial?.gdriveWebViewLink}
            initialFileName={initial?.gdriveFileName}
            required={requireGdriveLink}
          />

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={initial?.notes ?? ""}
            />
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <SubmitButton pendingLabel="Saving...">{submitLabel}</SubmitButton>
        </CardBody>
      </Card>
    </form>
  );
}

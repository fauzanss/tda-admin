"use client";

import { PaymentTermType } from "@/generated/prisma/client";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { InstallmentInput } from "@/lib/po-payment";

export type PaymentTermInitial = {
  paymentTermType: PaymentTermType;
  paymentTerms?: string | null;
  installments?: InstallmentInput[];
};

function emptyInstallment(): InstallmentInput {
  return {
    label: "",
    percentage: 0,
    amount: undefined,
    dueDate: "",
    notes: "",
  };
}

function formatDateInput(value: string | Date) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function PaymentTermSection({
  initial,
  showPaymentTermsTextarea = true,
}: Readonly<{
  initial?: PaymentTermInitial;
  showPaymentTermsTextarea?: boolean;
}>) {
  const [paymentTermType, setPaymentTermType] = useState<PaymentTermType>(
    initial?.paymentTermType ?? "LUMP_SUM",
  );
  const [installments, setInstallments] = useState<InstallmentInput[]>(
    initial?.installments?.map((row) => ({
      ...row,
      dueDate: formatDateInput(row.dueDate),
    })) ?? [emptyInstallment()],
  );

  const percentageTotal = useMemo(
    () => installments.reduce((sum, row) => sum + (Number(row.percentage) || 0), 0),
    [installments],
  );

  function updateInstallment(index: number, patch: Partial<InstallmentInput>) {
    setInstallments((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="col-span-full space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="paymentTermType">Payment Type</Label>
        <Select
          id="paymentTermType"
          name="paymentTermType"
          value={paymentTermType}
          onChange={(event) => setPaymentTermType(event.target.value as PaymentTermType)}
        >
          <option value="LUMP_SUM">Lump Sum</option>
          <option value="TERMIN">Termin (Installments)</option>
        </Select>
      </div>

      {paymentTermType === "LUMP_SUM" && showPaymentTermsTextarea && (
        <div className="space-y-1.5">
          <Label htmlFor="paymentTerms">Payment Terms</Label>
          <Textarea
            id="paymentTerms"
            name="paymentTerms"
            rows={3}
            defaultValue={initial?.paymentTerms ?? ""}
          />
        </div>
      )}

      {paymentTermType === "TERMIN" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="mb-0">Installments</Label>
            <span
              className={
                Math.abs(percentageTotal - 100) < 0.01
                  ? "text-xs text-emerald-600"
                  : "text-xs text-red-600"
              }
            >
              Total: {percentageTotal.toFixed(2)}%
            </span>
          </div>
          <input type="hidden" name="installments" value={JSON.stringify(installments)} />
          {installments.map((row, index) => (
            <div
              key={`installment-${index}`}
              className="rounded-lg border border-slate-200 p-3"
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-12">
                <div className="space-y-1 lg:col-span-3">
                  <Label className="text-xs">Label</Label>
                  <Input
                    className="h-8 text-xs"
                    value={row.label ?? ""}
                    onChange={(e) => updateInstallment(index, { label: e.target.value })}
                    placeholder="DP / Termin 2"
                  />
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-xs">%</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className="h-8 text-xs"
                    value={row.percentage}
                    onChange={(e) =>
                      updateInstallment(index, { percentage: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    className="h-8 text-xs"
                    value={row.amount ?? ""}
                    onChange={(e) =>
                      updateInstallment(index, {
                        amount: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1 lg:col-span-3">
                  <Label className="text-xs">Due Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={row.dueDate}
                    onChange={(e) => updateInstallment(index, { dueDate: e.target.value })}
                    required
                  />
                </div>
                <div className="flex items-end lg:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() =>
                      setInstallments((current) =>
                        current.filter((_, rowIndex) => rowIndex !== index),
                      )
                    }
                    disabled={installments.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-12">
                  <Label className="text-xs">Notes</Label>
                  <Input
                    className="h-8 text-xs"
                    value={row.notes ?? ""}
                    onChange={(e) => updateInstallment(index, { notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setInstallments((current) => [...current, emptyInstallment()])}
          >
            + Add Installment
          </Button>
        </div>
      )}

      {paymentTermType === "TERMIN" && (
        <input type="hidden" name="paymentTerms" value={initial?.paymentTerms ?? ""} />
      )}
    </div>
  );
}

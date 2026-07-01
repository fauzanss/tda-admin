"use client";

import { PaymentTermType } from "@/generated/prisma/client";
import { useMemo, useState } from "react";

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
    <div className="col-12">
      <label className="form-label">Payment Type</label>
      <select
        name="paymentTermType"
        className="form-select mb-3"
        value={paymentTermType}
        onChange={(event) => setPaymentTermType(event.target.value as PaymentTermType)}
      >
        <option value="LUMP_SUM">Lump Sum</option>
        <option value="TERMIN">Termin (Installments)</option>
      </select>

      {paymentTermType === "LUMP_SUM" && showPaymentTermsTextarea && (
        <div className="mb-3">
          <label className="form-label">Payment Terms</label>
          <textarea
            name="paymentTerms"
            className="form-control"
            rows={3}
            defaultValue={initial?.paymentTerms ?? ""}
          />
        </div>
      )}

      {paymentTermType === "TERMIN" && (
        <div className="mb-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <label className="form-label mb-0">Installments</label>
            <span className={`small ${Math.abs(percentageTotal - 100) < 0.01 ? "text-success" : "text-danger"}`}>
              Total: {percentageTotal.toFixed(2)}%
            </span>
          </div>
          <input type="hidden" name="installments" value={JSON.stringify(installments)} />
          {installments.map((row, index) => (
            <div key={`installment-${index}`} className="border rounded p-2 mb-2">
              <div className="row g-2">
                <div className="col-md-3">
                  <label className="form-label mb-1">Label</label>
                  <input
                    className="form-control form-control-sm"
                    value={row.label ?? ""}
                    onChange={(e) => updateInstallment(index, { label: e.target.value })}
                    placeholder="DP / Termin 2"
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label mb-1">%</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className="form-control form-control-sm"
                    value={row.percentage}
                    onChange={(e) =>
                      updateInstallment(index, { percentage: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label mb-1">Amount</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="form-control form-control-sm"
                    value={row.amount ?? ""}
                    onChange={(e) =>
                      updateInstallment(index, {
                        amount: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label mb-1">Due Date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={row.dueDate}
                    onChange={(e) => updateInstallment(index, { dueDate: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm w-100"
                    onClick={() =>
                      setInstallments((current) => current.filter((_, rowIndex) => rowIndex !== index))
                    }
                    disabled={installments.length <= 1}
                  >
                    Remove
                  </button>
                </div>
                <div className="col-12">
                  <label className="form-label mb-1">Notes</label>
                  <input
                    className="form-control form-control-sm"
                    value={row.notes ?? ""}
                    onChange={(e) => updateInstallment(index, { notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setInstallments((current) => [...current, emptyInstallment()])}
          >
            + Add Installment
          </button>
        </div>
      )}

      {paymentTermType === "TERMIN" && (
        <input type="hidden" name="paymentTerms" value={initial?.paymentTerms ?? ""} />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

type PoMasukFormProps = Readonly<{
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  initial?: {
    id?: string;
    poNumber?: string | null;
    issueDate?: Date | null;
    distributorName?: string;
    notes?: string | null;
  };
  requireFile?: boolean;
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
  initial,
  requireFile = false,
}: PoMasukFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      encType="multipart/form-data"
      action={async (formData) => {
        setError(null);
        setIsSubmitting(true);
        try {
          await action(formData);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save PO Masuk.");
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

        {requireFile && (
          <div className="mb-3">
            <label htmlFor="file" className="form-label">
              PO File <span className="text-danger">*</span>
            </label>
            <input
              id="file"
              name="file"
              type="file"
              className="form-control"
              accept=".pdf,image/jpeg,image/png,image/webp"
              required
            />
            <div className="form-text">PDF, JPEG, PNG, or WebP. Max 10 MB.</div>
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

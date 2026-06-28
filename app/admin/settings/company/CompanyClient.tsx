"use client";

import { useMemo, useState } from "react";

type Company = {
  id: string;
  companyName: string;
  companyAlias: string | null;
  address: string;
  website: string | null;
  isActive: boolean;
  updatedAt: string | Date;
};

type CompanyForm = {
  companyName: string;
  companyAlias: string;
  address: string;
  website: string;
  isActive: boolean;
};

function formatDateTime(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const defaultForm: CompanyForm = {
  companyName: "",
  companyAlias: "",
  address: "",
  website: "",
  isActive: true,
};

export function CompanyClient({ initialCompanies }: Readonly<{ initialCompanies: Company[] }>) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(defaultForm);
  const [loading, setLoading] = useState(false);

  const modalTitle = useMemo(() => (editing ? "Edit Company" : "Add Company"), [editing]);

  function openAdd() {
    setEditing(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(company: Company) {
    setEditing(company);
    setForm({
      companyName: company.companyName,
      companyAlias: company.companyAlias ?? "",
      address: company.address,
      website: company.website ?? "",
      isActive: company.isActive,
    });
    setShowModal(true);
  }

  async function refreshCompanies() {
    const response = await fetch("/api/companies", { cache: "no-store" });
    const rows = (await response.json()) as Company[];
    setCompanies(rows);
  }

  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setLoading(true);

    const payload = {
      companyName: form.companyName,
      companyAlias: form.companyAlias,
      address: form.address,
      website: form.website,
      isActive: form.isActive,
    };

    if (editing) {
      await fetch(`/api/companies/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await refreshCompanies();
    setLoading(false);
    setShowModal(false);
  }

  async function handleDelete(id: string) {
    const confirmed = globalThis.confirm("Are you sure you want to delete this company?");
    if (!confirmed) return;

    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    await refreshCompanies();
  }

  return (
    <main>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 fw-semibold mb-0">Company</h1>
        <button className="btn btn-primary" onClick={openAdd} type="button">
          <i className="bi bi-plus-lg" aria-hidden="true" />
          <span className="ms-1">Add Company</span>
        </button>
      </div>

      <section className="card">
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Company Alias</th>
                <th>Address</th>
                <th>Website</th>
                <th>Is Active</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 && (
                <tr>
                  <td colSpan={7}>No data available.</td>
                </tr>
              )}
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>{company.companyName}</td>
                  <td>{company.companyAlias || "-"}</td>
                  <td style={{ whiteSpace: "pre-line" }}>{company.address}</td>
                  <td>{company.website || "-"}</td>
                  <td>
                    <span className={`badge ${company.isActive ? "text-bg-success" : "text-bg-secondary"}`}>
                      {company.isActive ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>
                    {formatDateTime(company.updatedAt)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-link p-0 me-3 text-decoration-none"
                      onClick={() => openEdit(company)}
                    >
                      <i className="bi bi-pencil-square" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-danger"
                      onClick={() => handleDelete(company.id)}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 p-3"
          style={{ zIndex: 1050 }}
        >
          <div className="card w-100" style={{ maxWidth: 720 }}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0">{modalTitle}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)} type="button" />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="companyName">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    className="form-control"
                    value={form.companyName}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="companyAlias">
                    Company Alias
                  </label>
                  <input
                    id="companyAlias"
                    className="form-control"
                    value={form.companyAlias}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyAlias: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="companyAddress">
                    Address
                  </label>
                  <textarea
                    id="companyAddress"
                    className="form-control"
                    rows={3}
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="companyWebsite">
                    Website
                  </label>
                  <input
                    id="companyWebsite"
                    className="form-control"
                    placeholder="https://example.com"
                    value={form.website}
                    onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="isActive">
                    Is Active
                  </label>
                  <select
                    id="isActive"
                    className="form-select"
                    value={String(form.isActive)}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === "true" }))}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div className="card-footer d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

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
      <PageHeader
        title="Company"
        actions={
          <Button onClick={openAdd} type="button">
            <Plus size={14} aria-hidden />
            Add Company
          </Button>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Company Alias</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Is Active</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-tda-navy-muted">
                  No data available.
                </TableCell>
              </TableRow>
            )}
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>{company.companyName}</TableCell>
                <TableCell>{company.companyAlias || "-"}</TableCell>
                <TableCell className="whitespace-pre-line">{company.address}</TableCell>
                <TableCell>{company.website || "-"}</TableCell>
                <TableCell>
                  <Badge variant={company.isActive ? "success" : "muted"}>
                    {company.isActive ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTime(company.updatedAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Edit company"
                      onClick={() => openEdit(company)}
                    >
                      <Pencil size={16} aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      aria-label="Delete company"
                      onClick={() => handleDelete(company.id)}
                    >
                      <Trash2 size={16} aria-hidden />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>{modalTitle}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                <X size={16} aria-hidden />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardBody className="grid gap-4 pt-0 md:grid-cols-2">
                <div className="md:col-span-1">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    required
                  />
                </div>
                <div className="md:col-span-1">
                  <Label htmlFor="companyAlias">Company Alias</Label>
                  <Input
                    id="companyAlias"
                    value={form.companyAlias}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyAlias: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="companyAddress">Address</Label>
                  <Textarea
                    id="companyAddress"
                    rows={3}
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="companyWebsite">Website</Label>
                  <Input
                    id="companyWebsite"
                    placeholder="https://example.com"
                    value={form.website}
                    onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label htmlFor="isActive">Is Active</Label>
                  <Select
                    id="isActive"
                    value={String(form.isActive)}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, isActive: e.target.value === "true" }))
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                </div>
              </CardBody>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size={16} className="text-current" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </main>
  );
}

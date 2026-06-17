"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createUser, resetUserTotp, updateUserFields } from "@/app/admin/settings/user/actions";
import { DeleteUserButton } from "@/app/admin/settings/user/DeleteUserButton";

export type UserListRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  totpEnabled: boolean;
  createdAt: string;
};

const ROLES = ["ADMIN", "STAFF", "OFFICER"] as const;

function getPasswordMatchError(form: HTMLFormElement, requirePassword: boolean): string | null {
  const password = String(new FormData(form).get("password") ?? "").trim();
  const confirmPassword = String(new FormData(form).get("confirmPassword") ?? "").trim();
  if (requirePassword) {
    if (password !== confirmPassword) return "Konfirmasi password tidak cocok";
    return null;
  }
  if (password === "" && confirmPassword === "") return null;
  if (password === "" && confirmPassword !== "") return "Isi password terlebih dahulu";
  if (password !== confirmPassword) return "Konfirmasi password tidak cocok";
  return null;
}

/** Pesan error dari server action (Next.js kadang bungkus/serialize bentuk khusus). */
function getActionErrorMessage(err: unknown): string | null {
  if (err == null) return null;
  if (typeof err === "string" && err.trim() !== "") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (typeof err === "object" && "digest" in err) {
    return "Terjadi kesalahan. Muat ulang halaman, lalu coba lagi.";
  }
  return null;
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function UserSettingsClient({
  currentUserId,
  initialUsers,
}: Readonly<{ currentUserId: string; initialUsers: UserListRow[] }>) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<UserListRow | null>(null);

  const loading = saving;

  async function handleAddSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const passwordError = getPasswordMatchError(form, true);
    if (passwordError) {
      globalThis.alert(passwordError);
      return;
    }
    setSaving(true);
    try {
      await createUser(new FormData(form));
      setShowAddModal(false);
      form.reset();
      router.refresh();
    } catch (err) {
      globalThis.alert(
        getActionErrorMessage(err) ?? "Gagal menambah user. Periksa isian atau coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const passwordError = getPasswordMatchError(form, false);
    if (passwordError) {
      globalThis.alert(passwordError);
      return;
    }
    setSaving(true);
    try {
      await updateUserFields(new FormData(form));
      setEditing(null);
      router.refresh();
    } catch (err) {
      globalThis.alert(
        getActionErrorMessage(err) ?? "Gagal menyimpan perubahan. Coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleResetTotp(userId: string, email: string) {
    if (
      !globalThis.confirm(
        `Reset 2FA untuk ${email}? User harus setup authenticator ulang saat login berikutnya.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await resetUserTotp(userId);
      setEditing(null);
      router.refresh();
    } catch (err) {
      globalThis.alert(getActionErrorMessage(err) ?? "Gagal reset 2FA. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 fw-semibold mb-0">User</h1>
        <button className="btn btn-primary" type="button" onClick={() => setShowAddModal(true)} disabled={loading}>
          <i className="bi bi-plus-lg" aria-hidden="true" />
          <span className="ms-1">Add user</span>
        </button>
      </div>

      <section className="card">
        <div className="table-responsive">
          <table className="table table-striped table-sm mb-0 align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>2FA</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-muted">
                    No users.
                  </td>
                </tr>
              )}
              {initialUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id}>
                    <td>{user.name ?? "—"}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      {user.isActive ? (
                        <span className="badge text-bg-success">Active</span>
                      ) : (
                        <span className="badge text-bg-secondary">Inactive</span>
                      )}
                    </td>
                    <td>
                      {user.totpEnabled ? (
                        <span className="badge text-bg-primary">Enabled</span>
                      ) : (
                        <span className="badge text-bg-warning text-dark">Pending</span>
                      )}
                    </td>
                    <td className="text-nowrap">{formatDateTime(user.createdAt)}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {isSelf ? (
                          <span className="text-muted small">—</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setEditing(user)}
                            disabled={loading}
                          >
                            Edit
                          </button>
                        )}
                        {isSelf ? null : <DeleteUserButton userId={user.id} email={user.email} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {showAddModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 p-3"
          style={{ zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="userModalAddTitle"
        >
          <div className="card w-100" style={{ maxWidth: 480 }}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0" id="userModalAddTitle">
                Add user
              </h2>
              <button
                className="btn-close"
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Tutup"
                disabled={loading}
              />
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="card-body row g-2">
                <div className="col-12">
                  <label className="form-label" htmlFor="addName">
                    Name
                  </label>
                  <input
                    id="addName"
                    name="name"
                    type="text"
                    className="form-control form-control-sm"
                    autoComplete="name"
                    disabled={loading}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="addEmail">
                    Email
                  </label>
                  <input
                    id="addEmail"
                    name="email"
                    type="email"
                    className="form-control form-control-sm"
                    required
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="addPassword">
                    Password
                  </label>
                  <input
                    id="addPassword"
                    name="password"
                    type="password"
                    className="form-control form-control-sm"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    disabled={loading}
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="addConfirmPassword">
                    Konfirmasi password
                  </label>
                  <input
                    id="addConfirmPassword"
                    name="confirmPassword"
                    type="password"
                    className="form-control form-control-sm"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    disabled={loading}
                    placeholder="Ulangi password"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label" htmlFor="addRole">
                    Role
                  </label>
                  <select id="addRole" name="role" className="form-select form-select-sm" required disabled={loading}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label" htmlFor="addIsActive">
                    Status
                  </label>
                  <select
                    id="addIsActive"
                    name="isActive"
                    className="form-select form-select-sm"
                    defaultValue="true"
                    disabled={loading}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="card-footer d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowAddModal(false)}
                  disabled={loading}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                  {loading ? "…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 p-3"
          style={{ zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="userModalEditTitle"
        >
          <div className="card w-100" style={{ maxWidth: 480 }}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0" id="userModalEditTitle">
                Edit user
              </h2>
              <button
                className="btn-close"
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Tutup"
                disabled={loading}
              />
            </div>
            <form key={editing.id} onSubmit={handleEditSubmit}>
              <input type="hidden" name="userId" value={editing.id} />
              <div className="card-body">
                <p className="mb-1 small text-muted">Name</p>
                <p className="mb-3 fw-medium">{editing.name ?? "—"}</p>
                <p className="mb-1 small text-muted">Email</p>
                <p className="mb-3 fw-medium">{editing.email}</p>
                <div className="mb-3">
                  <label className="form-label" htmlFor="editPassword">
                    Password
                  </label>
                  <input
                    id="editPassword"
                    name="password"
                    type="password"
                    className="form-control form-control-sm"
                    minLength={6}
                    autoComplete="new-password"
                    disabled={loading}
                    placeholder="Kosongkan jika tidak diubah (min. 6 karakter)"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="editConfirmPassword">
                    Konfirmasi password
                  </label>
                  <input
                    id="editConfirmPassword"
                    name="confirmPassword"
                    type="password"
                    className="form-control form-control-sm"
                    minLength={6}
                    autoComplete="new-password"
                    disabled={loading}
                    placeholder="Ulangi password baru"
                  />
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label" htmlFor="editRole">
                      Role
                    </label>
                    <select
                      id="editRole"
                      name="role"
                      className="form-select form-select-sm"
                      defaultValue={editing.role}
                      required
                      disabled={loading}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label" htmlFor="editIsActive">
                      Status
                    </label>
                    <select
                      id="editIsActive"
                      name="isActive"
                      className="form-select form-select-sm"
                      defaultValue={editing.isActive ? "true" : "false"}
                      required
                      disabled={loading}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="card-footer d-flex justify-content-between gap-2">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => handleResetTotp(editing.id, editing.email)}
                  disabled={loading}
                >
                  Reset 2FA
                </button>
                <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setEditing(null)}
                  disabled={loading}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                  {loading ? "…" : "Simpan"}
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

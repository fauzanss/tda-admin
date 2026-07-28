"use client";

import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { createUser, resetUserTotp, updateUserFields } from "@/app/admin/settings/user/actions";
import { DeleteUserButton } from "@/app/admin/settings/user/DeleteUserButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { useToast } from "@/components/admin/ToastProvider";
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
import { formatAppDateTime } from "@/lib/datetime";

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
  return formatAppDateTime(iso);
}

function ModalOverlay({
  title,
  titleId,
  onClose,
  loading,
  children,
  footer,
}: {
  title: string;
  titleId: string;
  onClose: () => void;
  loading: boolean;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle id={titleId}>{title}</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Tutup"
            disabled={loading}
          >
            <X size={16} aria-hidden />
          </Button>
        </CardHeader>
        {children}
        <div className="border-t border-slate-100 px-4 py-3">{footer}</div>
      </Card>
    </div>
  );
}

export function UserSettingsClient({
  currentUserId,
  initialUsers,
}: Readonly<{ currentUserId: string; initialUsers: UserListRow[] }>) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<UserListRow | null>(null);

  const loading = saving;

  async function handleAddSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const passwordError = getPasswordMatchError(form, true);
    if (passwordError) {
      toast(passwordError, "danger");
      return;
    }
    setSaving(true);
    try {
      await createUser(new FormData(form));
      setShowAddModal(false);
      form.reset();
      router.refresh();
    } catch (err) {
      toast(
        getActionErrorMessage(err) ?? "Gagal menambah user. Periksa isian atau coba lagi.",
        "danger",
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
      toast(passwordError, "danger");
      return;
    }
    setSaving(true);
    try {
      await updateUserFields(new FormData(form));
      setEditing(null);
      router.refresh();
    } catch (err) {
      toast(
        getActionErrorMessage(err) ?? "Gagal menyimpan perubahan. Coba lagi.",
        "danger",
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
      toast(getActionErrorMessage(err) ?? "Gagal reset 2FA. Coba lagi.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <PageHeader
        title="User"
        actions={
          <Button type="button" onClick={() => setShowAddModal(true)} disabled={loading}>
            <Plus size={14} aria-hidden />
            Add user
          </Button>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>2FA</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-tda-navy-muted">
                  No users.
                </TableCell>
              </TableRow>
            )}
            {initialUsers.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <TableRow key={user.id}>
                  <TableCell>{user.name ?? "—"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.totpEnabled ? (
                      <Badge variant="default">Enabled</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {isSelf ? (
                        <span className="text-xs text-tda-navy-muted">—</span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(user)}
                          disabled={loading}
                        >
                          Edit
                        </Button>
                      )}
                      {isSelf ? null : <DeleteUserButton userId={user.id} email={user.email} />}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {showAddModal && (
        <ModalOverlay
          title="Add user"
          titleId="userModalAddTitle"
          onClose={() => setShowAddModal(false)}
          loading={loading}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button type="submit" form="addUserForm" size="sm" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size={14} className="text-current" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan"
                )}
              </Button>
            </div>
          }
        >
          <form id="addUserForm" onSubmit={handleAddSubmit}>
            <CardBody className="grid gap-3 pt-0">
              <div>
                <Label htmlFor="addName">Name</Label>
                <Input
                  id="addName"
                  name="name"
                  type="text"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="addEmail">Email</Label>
                <Input
                  id="addEmail"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="addPassword">Password</Label>
                <Input
                  id="addPassword"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  disabled={loading}
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <Label htmlFor="addConfirmPassword">Konfirmasi password</Label>
                <Input
                  id="addConfirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  disabled={loading}
                  placeholder="Ulangi password"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="addRole">Role</Label>
                  <Select id="addRole" name="role" required disabled={loading}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="addIsActive">Status</Label>
                  <Select
                    id="addIsActive"
                    name="isActive"
                    defaultValue="true"
                    disabled={loading}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Select>
                </div>
              </div>
            </CardBody>
          </form>
        </ModalOverlay>
      )}

      {editing && (
        <ModalOverlay
          title="Edit user"
          titleId="userModalEditTitle"
          onClose={() => setEditing(null)}
          loading={loading}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => handleResetTotp(editing.id, editing.email)}
                disabled={loading}
              >
                Reset 2FA
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(null)}
                  disabled={loading}
                >
                  Batal
                </Button>
                <Button type="submit" form="editUserForm" size="sm" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size={14} className="text-current" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </Button>
              </div>
            </div>
          }
        >
          <form id="editUserForm" key={editing.id} onSubmit={handleEditSubmit}>
            <input type="hidden" name="userId" value={editing.id} />
            <CardBody className="space-y-3 pt-0">
              <div>
                <p className="mb-1 text-xs text-tda-navy-muted">Name</p>
                <p className="font-medium text-tda-navy">{editing.name ?? "—"}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-tda-navy-muted">Email</p>
                <p className="font-medium text-tda-navy">{editing.email}</p>
              </div>
              <div>
                <Label htmlFor="editPassword">Password</Label>
                <Input
                  id="editPassword"
                  name="password"
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  disabled={loading}
                  placeholder="Kosongkan jika tidak diubah (min. 6 karakter)"
                />
              </div>
              <div>
                <Label htmlFor="editConfirmPassword">Konfirmasi password</Label>
                <Input
                  id="editConfirmPassword"
                  name="confirmPassword"
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  disabled={loading}
                  placeholder="Ulangi password baru"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="editRole">Role</Label>
                  <Select
                    id="editRole"
                    name="role"
                    defaultValue={editing.role}
                    required
                    disabled={loading}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editIsActive">Status</Label>
                  <Select
                    id="editIsActive"
                    name="isActive"
                    defaultValue={editing.isActive ? "true" : "false"}
                    required
                    disabled={loading}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Select>
                </div>
              </div>
            </CardBody>
          </form>
        </ModalOverlay>
      )}
    </main>
  );
}

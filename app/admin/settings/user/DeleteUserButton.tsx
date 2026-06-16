"use client";

import { useState } from "react";

import { deleteUser } from "@/app/admin/settings/user/actions";

type Props = {
  userId: string;
  email: string;
};

export function DeleteUserButton({ userId, email }: Props) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      disabled={loading}
      onClick={async () => {
        if (
          !globalThis.confirm(
            `Remove user ${email}?\n\nIf this user has created documents, they will be deactivated (not removed).`,
          )
        ) {
          return;
        }
        setLoading(true);
        try {
          await deleteUser(userId);
        } catch (e) {
          globalThis.alert(
            e instanceof Error ? e.message : "Operation failed. You may not remove your own account.",
          );
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "…" : "Delete"}
    </button>
  );
}

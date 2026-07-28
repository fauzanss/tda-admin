"use client";

import { useState } from "react";

import { deleteUser } from "@/app/admin/settings/user/actions";
import { useToast } from "@/components/admin/ToastProvider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  userId: string;
  email: string;
};

export function DeleteUserButton({ userId, email }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-red-200 text-red-700 hover:bg-red-50"
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
          toast(
            e instanceof Error
              ? e.message
              : "Operation failed. You may not remove your own account.",
            "danger",
          );
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? (
        <>
          <Spinner size={14} className="text-current" />
          Deleting...
        </>
      ) : (
        "Delete"
      )}
    </Button>
  );
}

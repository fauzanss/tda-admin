import Link from "next/link";
import { PenSquare } from "lucide-react";

import { PageHeader } from "@/components/admin/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  isMailApiConfigured,
  listMailFolders,
  listMailMessages,
  listMailboxes,
} from "@/lib/hostinger-mail";
import { cn } from "@/lib/cn";

function formatMailDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildInboxHref(params: {
  mailbox: string;
  folder: string;
  page?: number;
}) {
  const search = new URLSearchParams();
  search.set("mailbox", params.mailbox);
  search.set("folder", params.folder);
  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  return `/admin/email?${search.toString()}`;
}

export default async function EmailInboxPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<{
    mailbox?: string;
    folder?: string;
    page?: string;
    sent?: string;
  }>;
}>) {
  const resolved = (await searchParams) ?? {};

  if (!isMailApiConfigured()) {
    return (
      <main>
        <PageHeader title="Inbox" />
        <Alert variant="warning">
          Mail API is not configured. Set <code>MAIL_API_TOKEN</code> in the environment.
        </Alert>
      </main>
    );
  }

  let mailboxes;
  try {
    mailboxes = await listMailboxes();
  } catch (error) {
    return (
      <main>
        <PageHeader title="Inbox" />
        <Alert variant="danger">
          {error instanceof Error ? error.message : "Failed to load mailboxes."}
        </Alert>
      </main>
    );
  }

  if (mailboxes.length === 0) {
    return (
      <main>
        <PageHeader title="Inbox" />
        <Alert variant="info">No mailboxes are available for this API token.</Alert>
      </main>
    );
  }

  const mailbox =
    mailboxes.find((item) => item.resourceId === resolved.mailbox)?.resourceId ??
    mailboxes[0].resourceId;

  let folders: Awaited<ReturnType<typeof listMailFolders>> = [];
  let folderError: string | null = null;
  try {
    folders = await listMailFolders(mailbox);
  } catch (error) {
    folders = [];
    folderError = error instanceof Error ? error.message : "Failed to load folders.";
  }

  const preferredInbox =
    folders.find((item) => item.path === "INBOX" || item.specialUse === "\\Inbox")?.path ??
    folders[0]?.path ??
    "INBOX";
  const folder =
    folders.find((item) => item.path === resolved.folder)?.path ?? preferredInbox;
  const page = Math.max(1, Number(resolved.page ?? "1") || 1);

  let messages: Awaited<ReturnType<typeof listMailMessages>>["messages"] = [];
  let pagination = { page: 1, perPage: 25, total: 0, totalPages: 1 };
  let messageError: string | null = null;

  if (!folderError) {
    try {
      const result = await listMailMessages(mailbox, folder, page, 25);
      messages = result.messages;
      pagination = result.pagination;
    } catch (error) {
      messageError = error instanceof Error ? error.message : "Failed to load messages.";
    }
  }

  return (
    <main>
      <PageHeader
        title="Inbox"
        actions={
          <Link
            href="/admin/email/compose"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <PenSquare size={14} aria-hidden />
            Compose
          </Link>
        }
      />

      {resolved.sent === "1" && (
        <Alert variant="success" className="mb-4 py-2">
          Email sent successfully.
        </Alert>
      )}
      {folderError && (
        <Alert variant="danger" className="mb-4">
          {folderError}
        </Alert>
      )}
      {messageError && (
        <Alert variant="danger" className="mb-4">
          {messageError}
        </Alert>
      )}

      <Card className="mb-4">
        <CardBody>
          <form method="get" className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <Label htmlFor="mailbox">Mailbox</Label>
              <Select id="mailbox" name="mailbox" defaultValue={mailbox}>
                {mailboxes.map((item) => (
                  <option key={item.resourceId} value={item.resourceId}>
                    {item.address}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="folder">Folder</Label>
              <Select id="folder" name="folder" defaultValue={folder}>
                {folders.length === 0 && <option value={folder}>{folder}</option>}
                {folders.map((item) => (
                  <option key={item.path} value={item.path}>
                    {item.name} ({item.unreadCount}/{item.messageCount})
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline" className="w-full md:w-auto">
              Open
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[18%]">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-tda-navy-muted">
                  No messages in this folder.
                </TableCell>
              </TableRow>
            )}
            {messages.map((message) => {
              const fromLabel =
                message.fromName || message.fromAddress
                  ? `${message.fromName ? `${message.fromName} ` : ""}${
                      message.fromAddress ? `<${message.fromAddress}>` : ""
                    }`.trim()
                  : "(Unknown)";
              const href = `/admin/email/message?mailbox=${encodeURIComponent(mailbox)}&folder=${encodeURIComponent(folder)}&uid=${message.uid}`;
              return (
                <TableRow
                  key={message.uid}
                  className={message.unseen ? "bg-amber-50/60" : undefined}
                >
                  <TableCell>
                    <Link
                      href={href}
                      className="text-slate-800 no-underline hover:text-tda-navy"
                    >
                      {message.unseen && (
                        <Badge variant="default" className="mr-2">
                          Unread
                        </Badge>
                      )}
                      {fromLabel}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={href}
                      className="text-slate-800 no-underline hover:text-tda-navy"
                    >
                      {message.subject || "(No subject)"}
                    </Link>
                  </TableCell>
                  <TableCell>{formatMailDate(message.date)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-tda-navy-muted">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} messages)
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={buildInboxHref({ mailbox, folder, page: pagination.page - 1 })}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Previous
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={buildInboxHref({ mailbox, folder, page: pagination.page + 1 })}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

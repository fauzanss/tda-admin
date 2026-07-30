import Link from "next/link";
import { PenSquare, Search, X } from "lucide-react";

import { PageHeader } from "@/components/admin/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  findPreferredMailFolder,
  isMailApiConfigured,
  listMailFolders,
  listMailMessages,
  listMailboxes,
  searchMailMessages,
} from "@/lib/hostinger-mail";
import { formatAppMailDateTime } from "@/lib/datetime";
import { cn } from "@/lib/cn";

function formatParty(name: string, address: string) {
  if (!name && !address) return "(Unknown)";
  if (name && address) return `${name} <${address}>`;
  return name || address;
}

function buildListHref(
  basePath: string,
  params: { mailbox: string; folder: string; page?: number; q?: string },
) {
  const search = new URLSearchParams();
  search.set("mailbox", params.mailbox);
  search.set("folder", params.folder);
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  return `${basePath}?${search.toString()}`;
}

export async function EmailFolderList({
  mode,
  searchParams,
}: {
  mode: "inbox" | "sent";
  searchParams?: {
    mailbox?: string;
    folder?: string;
    page?: string;
    sent?: string;
    q?: string;
  };
}) {
  const resolved = searchParams ?? {};
  const basePath = mode === "sent" ? "/admin/email/sent" : "/admin/email";
  const title = mode === "sent" ? "Sent" : "Inbox";
  const partyColumn = mode === "sent" ? "To" : "From";
  const query = resolved.q?.trim() ?? "";

  if (!isMailApiConfigured()) {
    return (
      <main>
        <PageHeader title={title} />
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
        <PageHeader title={title} />
        <Alert variant="danger">
          {error instanceof Error ? error.message : "Failed to load mailboxes."}
        </Alert>
      </main>
    );
  }

  if (mailboxes.length === 0) {
    return (
      <main>
        <PageHeader title={title} />
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

  const preferredFolder = findPreferredMailFolder(folders, mode);
  const folder =
    folders.find((item) => item.path === resolved.folder)?.path ?? preferredFolder;
  const page = Math.max(1, Number(resolved.page ?? "1") || 1);

  let messages: Awaited<ReturnType<typeof listMailMessages>>["messages"] = [];
  let pagination = { page: 1, perPage: 25, total: 0, totalPages: 1 };
  let messageError: string | null = null;

  if (!folderError) {
    try {
      const result = query
        ? await searchMailMessages(mailbox, folder, query, page, 25)
        : await listMailMessages(mailbox, folder, page, 25);
      messages = result.messages;
      pagination = result.pagination;
    } catch (error) {
      messageError = error instanceof Error ? error.message : "Failed to load messages.";
    }
  }

  return (
    <main>
      <PageHeader
        title={title}
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
          <form method="get" action={basePath} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
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
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <div>
                <Label htmlFor="q">Search</Label>
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <Input
                    id="q"
                    name="q"
                    type="search"
                    defaultValue={query}
                    placeholder="Search subject, sender, body..."
                    className="pl-9"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                <Search size={14} aria-hidden />
                Search
              </Button>
              {query ? (
                <Link
                  href={buildListHref(basePath, { mailbox, folder })}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "inline-flex w-full sm:w-auto",
                  )}
                >
                  <X size={14} aria-hidden />
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
        </CardBody>
      </Card>

      {query ? (
        <p className="mb-3 text-sm text-tda-navy-muted">
          Showing results for <span className="font-medium text-tda-navy">&quot;{query}&quot;</span>
          {pagination.total > 0 ? ` · ${pagination.total} found` : null}
        </p>
      ) : null}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">{partyColumn}</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[18%]">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-tda-navy-muted">
                  {query
                    ? "No messages match this search."
                    : "No messages in this folder."}
                </TableCell>
              </TableRow>
            )}
            {messages.map((message) => {
              const partyLabel =
                mode === "sent"
                  ? formatParty(message.toName, message.toAddress)
                  : formatParty(message.fromName, message.fromAddress);
              const href = `/admin/email/message?mailbox=${encodeURIComponent(mailbox)}&folder=${encodeURIComponent(folder)}&uid=${message.uid}&from=${encodeURIComponent(mode)}`;
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
                      {partyLabel}
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
                  <TableCell>{formatAppMailDateTime(message.date)}</TableCell>
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
                href={buildListHref(basePath, {
                  mailbox,
                  folder,
                  q: query,
                  page: pagination.page - 1,
                })}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Previous
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={buildListHref(basePath, {
                  mailbox,
                  folder,
                  q: query,
                  page: pagination.page + 1,
                })}
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

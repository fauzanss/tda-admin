import Link from "next/link";

import {
  isMailApiConfigured,
  listMailFolders,
  listMailMessages,
  listMailboxes,
} from "@/lib/hostinger-mail";

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
        <h1 className="h3 fw-semibold mb-3">Inbox</h1>
        <div className="alert alert-warning">
          Mail API is not configured. Set <code>MAIL_API_TOKEN</code> in the environment.
        </div>
      </main>
    );
  }

  let mailboxes;
  try {
    mailboxes = await listMailboxes();
  } catch (error) {
    return (
      <main>
        <h1 className="h3 fw-semibold mb-3">Inbox</h1>
        <div className="alert alert-danger">
          {error instanceof Error ? error.message : "Failed to load mailboxes."}
        </div>
      </main>
    );
  }

  if (mailboxes.length === 0) {
    return (
      <main>
        <h1 className="h3 fw-semibold mb-3">Inbox</h1>
        <div className="alert alert-info">
          No mailboxes are available for this API token.
        </div>
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
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 fw-semibold mb-0">Inbox</h1>
        <Link href="/admin/email/compose" className="btn btn-primary btn-sm">
          Compose
        </Link>
      </div>

      {resolved.sent === "1" && (
        <div className="alert alert-success py-2">Email sent successfully.</div>
      )}
      {folderError && <div className="alert alert-danger">{folderError}</div>}
      {messageError && <div className="alert alert-danger">{messageError}</div>}

      <form method="get" className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-5">
              <label className="form-label" htmlFor="mailbox">
                Mailbox
              </label>
              <select
                id="mailbox"
                name="mailbox"
                className="form-select"
                defaultValue={mailbox}
              >
                {mailboxes.map((item) => (
                  <option key={item.resourceId} value={item.resourceId}>
                    {item.address}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-5">
              <label className="form-label" htmlFor="folder">
                Folder
              </label>
              <select
                id="folder"
                name="folder"
                className="form-select"
                defaultValue={folder}
              >
                {folders.length === 0 && <option value={folder}>{folder}</option>}
                {folders.map((item) => (
                  <option key={item.path} value={item.path}>
                    {item.name} ({item.unreadCount}/{item.messageCount})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-outline-primary w-100">
                Open
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th style={{ width: "28%" }}>From</th>
                <th>Subject</th>
                <th style={{ width: "18%" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted">
                    No messages in this folder.
                  </td>
                </tr>
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
                  <tr key={message.uid} className={message.unseen ? "table-warning" : undefined}>
                    <td>
                      <Link href={href} className="text-decoration-none text-body">
                        {message.unseen && (
                          <span className="badge text-bg-primary me-2">Unread</span>
                        )}
                        {fromLabel}
                      </Link>
                    </td>
                    <td>
                      <Link href={href} className="text-decoration-none text-body">
                        {message.subject || "(No subject)"}
                      </Link>
                    </td>
                    <td>{formatMailDate(message.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} messages)
          </div>
          <div className="d-flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={buildInboxHref({ mailbox, folder, page: pagination.page - 1 })}
                className="btn btn-outline-secondary btn-sm"
              >
                Previous
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={buildInboxHref({ mailbox, folder, page: pagination.page + 1 })}
                className="btn btn-outline-secondary btn-sm"
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

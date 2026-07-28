import Link from "next/link";
import { Download, Paperclip, Reply } from "lucide-react";

import { PageHeader } from "@/components/admin/PageHeader";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMailMessageDetail,
  isMailApiConfigured,
} from "@/lib/hostinger-mail";
import { cn } from "@/lib/cn";

function formatMailDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAddressList(items: Array<{ name: string; address: string }>) {
  if (items.length === 0) return "-";
  return items
    .map((item) =>
      item.name ? `${item.name} <${item.address}>` : item.address || item.name,
    )
    .filter(Boolean)
    .join(", ");
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function EmailMessagePage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<{
    mailbox?: string;
    folder?: string;
    uid?: string;
    from?: string;
  }>;
}>) {
  const resolved = (await searchParams) ?? {};
  const mailbox = resolved.mailbox?.trim() ?? "";
  const folder = resolved.folder?.trim() ?? "INBOX";
  const uid = Number(resolved.uid ?? "");
  const fromList = resolved.from === "sent" ? "sent" : "inbox";
  const listHref = fromList === "sent"
    ? `/admin/email/sent?mailbox=${encodeURIComponent(mailbox)}&folder=${encodeURIComponent(folder)}`
    : `/admin/email?mailbox=${encodeURIComponent(mailbox)}&folder=${encodeURIComponent(folder)}`;
  const listLabel = fromList === "sent" ? "Back to Sent" : "Back to Inbox";

  if (!isMailApiConfigured()) {
    return (
      <main>
        <PageHeader title="Message" />
        <Alert variant="warning">
          Mail API is not configured. Set <code>MAIL_API_TOKEN</code> in the environment.
        </Alert>
      </main>
    );
  }

  if (!mailbox || !Number.isFinite(uid) || uid <= 0) {
    return (
      <main>
        <PageHeader title="Message" />
        <Alert variant="danger" className="mb-4">
          Invalid message reference.
        </Alert>
        <Link
          href={fromList === "sent" ? "/admin/email/sent" : "/admin/email"}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {listLabel}
        </Link>
      </main>
    );
  }

  let detail;
  try {
    detail = await getMailMessageDetail(mailbox, folder, uid);
  } catch (error) {
    return (
      <main>
        <PageHeader title="Message" />
        <Alert variant="danger" className="mb-4">
          {error instanceof Error ? error.message : "Failed to load message."}
        </Alert>
        <Link
          href={listHref}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {listLabel}
        </Link>
      </main>
    );
  }

  const replyTo = detail.fromAddress;
  const replySubject = detail.subject?.toLowerCase().startsWith("re:")
    ? detail.subject
    : `Re: ${detail.subject || "(No subject)"}`;
  const composeHref = `/admin/email/compose?mailbox=${encodeURIComponent(mailbox)}&to=${encodeURIComponent(replyTo)}&subject=${encodeURIComponent(replySubject)}`;

  return (
    <main>
      <PageHeader
        title="Message"
        actions={
          <>
            <Link
              href={listHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {listLabel}
            </Link>
            {fromList !== "sent" && (
              <Link href={composeHref} className={cn(buttonVariants({ size: "sm" }))}>
                <Reply size={14} aria-hidden />
                Reply
              </Link>
            )}
          </>
        }
      />

      <Card className="mb-4">
        <CardBody>
          <dl className="grid gap-3 sm:grid-cols-[minmax(5rem,8rem)_1fr]">
            <dt className="text-sm font-medium text-tda-navy-muted">Subject</dt>
            <dd className="text-sm text-slate-800">{detail.subject || "(No subject)"}</dd>
            <dt className="text-sm font-medium text-tda-navy-muted">From</dt>
            <dd className="text-sm text-slate-800">
              {detail.fromName
                ? `${detail.fromName} <${detail.fromAddress}>`
                : detail.fromAddress || "-"}
            </dd>
            <dt className="text-sm font-medium text-tda-navy-muted">To</dt>
            <dd className="text-sm text-slate-800">{formatAddressList(detail.to)}</dd>
            {detail.cc.length > 0 && (
              <>
                <dt className="text-sm font-medium text-tda-navy-muted">Cc</dt>
                <dd className="text-sm text-slate-800">{formatAddressList(detail.cc)}</dd>
              </>
            )}
            <dt className="text-sm font-medium text-tda-navy-muted">Date</dt>
            <dd className="text-sm text-slate-800">{formatMailDate(detail.date)}</dd>
          </dl>
        </CardBody>
      </Card>

      {detail.attachments.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip size={16} aria-hidden />
              Attachments ({detail.attachments.length})
            </CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {detail.attachments.map((file) => {
                const base = `/api/mail/attachment?mailbox=${encodeURIComponent(mailbox)}&folder=${encodeURIComponent(folder)}&uid=${uid}&attachmentId=${encodeURIComponent(file.id)}`;
                const openHref = base;
                const downloadHref = `${base}&download=1`;
                const sizeLabel = formatFileSize(file.sizeBytes);
                return (
                  <li
                    key={file.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <Paperclip size={14} className="shrink-0 text-tda-navy-muted" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {file.filename}
                      </p>
                      <p className="text-xs text-tda-navy-muted">
                        {[file.contentType, sizeLabel, file.inline ? "inline" : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <a
                      href={openHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Open
                    </a>
                    <a
                      href={downloadHref}
                      className={cn(buttonVariants({ size: "sm" }))}
                    >
                      <Download size={14} aria-hidden />
                      Download
                    </a>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Body</CardTitle>
        </CardHeader>
        <CardBody>
          {detail.html ? (
            <div
              className="mail-body"
              dangerouslySetInnerHTML={{ __html: detail.html }}
            />
          ) : (
            <pre className="mb-0 whitespace-pre-wrap font-[inherit] text-sm text-slate-800">
              {detail.text || "(Empty message)"}
            </pre>
          )}
        </CardBody>
      </Card>
    </main>
  );
}

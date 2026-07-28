import Link from "next/link";
import { Reply } from "lucide-react";

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

export default async function EmailMessagePage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<{
    mailbox?: string;
    folder?: string;
    uid?: string;
  }>;
}>) {
  const resolved = (await searchParams) ?? {};
  const mailbox = resolved.mailbox?.trim() ?? "";
  const folder = resolved.folder?.trim() ?? "INBOX";
  const uid = Number(resolved.uid ?? "");

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
          href="/admin/email"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to Inbox
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
          href={`/admin/email?mailbox=${encodeURIComponent(mailbox)}&folder=${encodeURIComponent(folder)}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to Inbox
        </Link>
      </main>
    );
  }

  const replyTo = detail.fromAddress;
  const replySubject = detail.subject?.toLowerCase().startsWith("re:")
    ? detail.subject
    : `Re: ${detail.subject || "(No subject)"}`;
  const composeHref = `/admin/email/compose?mailbox=${encodeURIComponent(mailbox)}&to=${encodeURIComponent(replyTo)}&subject=${encodeURIComponent(replySubject)}`;
  const inboxHref = `/admin/email?mailbox=${encodeURIComponent(mailbox)}&folder=${encodeURIComponent(folder)}`;

  return (
    <main>
      <PageHeader
        title="Message"
        actions={
          <>
            <Link
              href={inboxHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Back to Inbox
            </Link>
            <Link href={composeHref} className={cn(buttonVariants({ size: "sm" }))}>
              <Reply size={14} aria-hidden />
              Reply
            </Link>
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

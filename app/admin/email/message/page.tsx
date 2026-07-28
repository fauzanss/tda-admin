import Link from "next/link";

import {
  getMailMessageDetail,
  isMailApiConfigured,
} from "@/lib/hostinger-mail";

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
        <h1 className="h3 fw-semibold mb-3">Message</h1>
        <div className="alert alert-warning">
          Mail API is not configured. Set <code>MAIL_API_TOKEN</code> in the environment.
        </div>
      </main>
    );
  }

  if (!mailbox || !Number.isFinite(uid) || uid <= 0) {
    return (
      <main>
        <h1 className="h3 fw-semibold mb-3">Message</h1>
        <div className="alert alert-danger">Invalid message reference.</div>
        <Link href="/admin/email" className="btn btn-outline-secondary btn-sm">
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
        <h1 className="h3 fw-semibold mb-3">Message</h1>
        <div className="alert alert-danger">
          {error instanceof Error ? error.message : "Failed to load message."}
        </div>
        <Link
          href={`/admin/email?mailbox=${encodeURIComponent(mailbox)}&folder=${encodeURIComponent(folder)}`}
          className="btn btn-outline-secondary btn-sm"
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
      <div className="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
        <h1 className="h3 fw-semibold mb-0">Message</h1>
        <div className="d-flex gap-2">
          <Link href={inboxHref} className="btn btn-outline-secondary btn-sm">
            Back to Inbox
          </Link>
          <Link href={composeHref} className="btn btn-primary btn-sm">
            Reply
          </Link>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-2">Subject</dt>
            <dd className="col-sm-10">{detail.subject || "(No subject)"}</dd>
            <dt className="col-sm-2">From</dt>
            <dd className="col-sm-10">
              {detail.fromName
                ? `${detail.fromName} <${detail.fromAddress}>`
                : detail.fromAddress || "-"}
            </dd>
            <dt className="col-sm-2">To</dt>
            <dd className="col-sm-10">{formatAddressList(detail.to)}</dd>
            {detail.cc.length > 0 && (
              <>
                <dt className="col-sm-2">Cc</dt>
                <dd className="col-sm-10">{formatAddressList(detail.cc)}</dd>
              </>
            )}
            <dt className="col-sm-2">Date</dt>
            <dd className="col-sm-10">{formatMailDate(detail.date)}</dd>
          </dl>
        </div>
      </div>

      <div className="card">
        <div className="card-header fw-semibold">Body</div>
        <div className="card-body">
          {detail.html ? (
            <div
              className="mail-body"
              dangerouslySetInnerHTML={{ __html: detail.html }}
            />
          ) : (
            <pre className="mb-0" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {detail.text || "(Empty message)"}
            </pre>
          )}
        </div>
      </div>
    </main>
  );
}

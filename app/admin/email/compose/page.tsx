import Link from "next/link";

import { ComposeEmailForm } from "@/app/admin/email/ComposeEmailForm";
import { authOptions } from "@/lib/auth";
import { isMailApiConfigured, listMailboxes } from "@/lib/hostinger-mail";
import { prisma } from "@/lib/prisma";
import { canWriteFiles } from "@/lib/role-guards";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function ComposeEmailPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<{
    mailbox?: string;
    to?: string;
    subject?: string;
  }>;
}>) {
  const session = await getServerSession(authOptions);
  if (!canWriteFiles(session?.user?.role as string | undefined)) {
    redirect("/admin/email");
  }

  const resolved = (await searchParams) ?? {};

  if (!isMailApiConfigured()) {
    return (
      <main>
        <h1 className="h3 fw-semibold mb-3">Compose</h1>
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
        <h1 className="h3 fw-semibold mb-3">Compose</h1>
        <div className="alert alert-danger">
          {error instanceof Error ? error.message : "Failed to load mailboxes."}
        </div>
      </main>
    );
  }

  if (mailboxes.length === 0) {
    return (
      <main>
        <h1 className="h3 fw-semibold mb-3">Compose</h1>
        <div className="alert alert-info">
          No mailboxes are available for this API token.
        </div>
      </main>
    );
  }

  const company = await prisma.companyProfile.findFirst({
    select: { companyName: true },
  });
  const defaultDisplayName = company?.companyName ?? "PT. Transformasi Digital Abadi";
  const defaultMailbox =
    mailboxes.find((item) => item.resourceId === resolved.mailbox)?.resourceId ??
    mailboxes[0].resourceId;

  return (
    <main>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 fw-semibold mb-0">Compose</h1>
        <Link href="/admin/email" className="btn btn-outline-secondary btn-sm">
          Back to Inbox
        </Link>
      </div>
      <ComposeEmailForm
        mailboxes={mailboxes}
        defaultMailbox={defaultMailbox}
        defaultTo={resolved.to}
        defaultSubject={resolved.subject}
        defaultDisplayName={defaultDisplayName}
      />
    </main>
  );
}

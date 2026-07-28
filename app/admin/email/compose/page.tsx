import Link from "next/link";

import { ComposeEmailForm } from "@/app/admin/email/ComposeEmailForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { isMailApiConfigured, listMailboxes } from "@/lib/hostinger-mail";
import { cn } from "@/lib/cn";
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
        <PageHeader title="Compose" />
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
        <PageHeader title="Compose" />
        <Alert variant="danger">
          {error instanceof Error ? error.message : "Failed to load mailboxes."}
        </Alert>
      </main>
    );
  }

  if (mailboxes.length === 0) {
    return (
      <main>
        <PageHeader title="Compose" />
        <Alert variant="info">No mailboxes are available for this API token.</Alert>
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
      <PageHeader
        title="Compose"
        actions={
          <Link
            href="/admin/email"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Inbox
          </Link>
        }
      />
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

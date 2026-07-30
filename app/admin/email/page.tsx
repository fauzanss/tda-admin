import { EmailFolderList } from "./EmailFolderList";

export default async function EmailInboxPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<{
    mailbox?: string;
    folder?: string;
    page?: string;
    sent?: string;
    q?: string;
  }>;
}>) {
  const resolved = (await searchParams) ?? {};
  return <EmailFolderList mode="inbox" searchParams={resolved} />;
}

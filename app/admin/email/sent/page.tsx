import { EmailFolderList } from "../EmailFolderList";

export default async function EmailSentPage({
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
  return <EmailFolderList mode="sent" searchParams={resolved} />;
}

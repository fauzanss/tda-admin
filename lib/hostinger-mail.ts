import {
  AccountApi,
  Configuration,
  FoldersApi,
  MessagesApi,
  SendApi,
  type V1SendRequest,
} from "hostinger-mail-api-sdk";

export type MailboxOption = {
  resourceId: string;
  address: string;
};

export type MailFolder = {
  path: string;
  name: string;
  messageCount: number;
  unreadCount: number;
  specialUse: string | null;
};

export type MailMessageSummary = {
  uid: number;
  subject: string | null;
  fromName: string;
  fromAddress: string;
  toName: string;
  toAddress: string;
  date: string;
  unseen: boolean;
};

export type MailMessageDetail = {
  uid: number;
  subject: string | null;
  fromName: string;
  fromAddress: string;
  to: Array<{ name: string; address: string }>;
  cc: Array<{ name: string; address: string }>;
  date: string;
  unseen: boolean;
  text: string;
  html: string;
  attachments: MailAttachmentMeta[];
};

export type MailAttachmentMeta = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  inline: boolean;
};

export type MailPagination = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

function getMailApiToken() {
  const token = process.env.MAIL_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Mail API is not configured. Set MAIL_API_TOKEN in the environment.",
    );
  }
  return token;
}

function getMailConfiguration() {
  return new Configuration({
    accessToken: getMailApiToken(),
  });
}

function formatMailApiError(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { status?: number; data?: unknown } }).response;
    const status = response?.status;
    const data = response?.data;
    if (status === 401) {
      return "Mail API unauthorized. Check MAIL_API_TOKEN.";
    }
    if (status === 403) {
      return "Mailbox is not authorized for this API token.";
    }
    if (data && typeof data === "object") {
      const payload = data as { error?: string; code?: string; params?: Record<string, string[]> };
      if (payload.params) {
        const details = Object.entries(payload.params)
          .flatMap(([field, messages]) =>
            (messages ?? []).map((message) => `${field}: ${message}`),
          )
          .join("; ");
        if (details) {
          return details;
        }
      }
      if (payload.error) {
        return payload.error;
      }
    }
    if (status) {
      return `Mail API request failed (${status}).`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Mail API request failed.";
}

export function isMailApiConfigured() {
  return Boolean(process.env.MAIL_API_TOKEN?.trim());
}

export async function listMailboxes(): Promise<MailboxOption[]> {
  try {
    const api = new AccountApi(getMailConfiguration());
    const { data } = await api.getCurrentAccount();
    return (data.data.mailboxes ?? []).map((mailbox) => ({
      resourceId: mailbox.resourceId,
      address: mailbox.address,
    }));
  } catch (error) {
    throw new Error(formatMailApiError(error));
  }
}

export async function listMailFolders(mailboxResourceId: string): Promise<MailFolder[]> {
  try {
    const api = new FoldersApi(getMailConfiguration());
    const { data } = await api.listFolders(mailboxResourceId, 1, 100);
    return (data.data ?? []).map((folder) => ({
      path: folder.path,
      name: folder.name,
      messageCount: folder.messageCount,
      unreadCount: folder.unreadCount,
      specialUse: folder.specialUse,
    }));
  } catch (error) {
    throw new Error(formatMailApiError(error));
  }
}

export async function listMailMessages(
  mailboxResourceId: string,
  folder: string,
  page = 1,
  perPage = 25,
): Promise<{ messages: MailMessageSummary[]; pagination: MailPagination }> {
  try {
    const api = new MessagesApi(getMailConfiguration());
    const { data } = await api.listMessages(mailboxResourceId, folder, page, perPage, "-date");
    const pagination = data.pagination;
    return {
      messages: (data.data ?? []).map((message) => ({
        uid: message.uid,
        subject: message.subject,
        fromName: message.from?.name ?? "",
        fromAddress: message.from?.address ?? "",
        toName: message.to?.[0]?.name ?? "",
        toAddress: message.to?.[0]?.address ?? "",
        date: message.date,
        unseen: message.unseen,
      })),
      pagination: {
        page: pagination?.page ?? page,
        perPage: pagination?.perPage ?? perPage,
        total: pagination?.total ?? 0,
        totalPages: pagination?.totalPages ?? 1,
      },
    };
  } catch (error) {
    throw new Error(formatMailApiError(error));
  }
}

export async function getMailMessageDetail(
  mailboxResourceId: string,
  folder: string,
  uid: number,
): Promise<MailMessageDetail> {
  try {
    const api = new MessagesApi(getMailConfiguration());
    const [messageResponse, textResponse] = await Promise.all([
      api.getMessage(mailboxResourceId, folder, uid),
      api.getMessageText(mailboxResourceId, folder, uid),
    ]);
    const message = messageResponse.data.data;
    const body = textResponse.data.data;
    return {
      uid: message.uid,
      subject: message.subject,
      fromName: message.from?.name ?? "",
      fromAddress: message.from?.address ?? "",
      to: (message.to ?? []).map((item) => ({
        name: item.name ?? "",
        address: item.address ?? "",
      })),
      cc: (message.cc ?? []).map((item) => ({
        name: item.name ?? "",
        address: item.address ?? "",
      })),
      date: message.date,
      unseen: message.unseen,
      text: body.text ?? "",
      html: body.html ?? "",
      attachments: (message.attachments ?? []).map((item) => ({
        id: item.id,
        filename: item.filename?.trim() || "attachment",
        contentType: item.contentType || "application/octet-stream",
        sizeBytes: item.sizeBytes ?? 0,
        inline: Boolean(item.inline),
      })),
    };
  } catch (error) {
    throw new Error(formatMailApiError(error));
  }
}

export async function downloadMailAttachment(
  mailboxResourceId: string,
  folder: string,
  uid: number,
  attachmentId: string,
): Promise<{ filename: string; contentType: string; data: Buffer }> {
  try {
    const api = new MessagesApi(getMailConfiguration());
    const messageResponse = await api.getMessage(mailboxResourceId, folder, uid);
    const message = messageResponse.data.data;
    const meta = (message.attachments ?? []).find((item) => item.id === attachmentId);
    if (!meta) {
      throw new Error("Attachment not found.");
    }

    const response = await api.getMessageAttachment(
      mailboxResourceId,
      folder,
      uid,
      attachmentId,
      { responseType: "arraybuffer" },
    );

    const raw = response.data as unknown;
    let data: Buffer;
    if (Buffer.isBuffer(raw)) {
      data = raw;
    } else if (raw instanceof ArrayBuffer) {
      data = Buffer.from(raw);
    } else if (raw && typeof raw === "object" && "arrayBuffer" in raw) {
      data = Buffer.from(await (raw as Blob).arrayBuffer());
    } else {
      data = Buffer.from(raw as ArrayBuffer);
    }

    const headerContentType =
      typeof response.headers?.["content-type"] === "string"
        ? response.headers["content-type"].split(";")[0]?.trim()
        : "";
    const metaType = meta.contentType?.split(";")[0]?.trim() || "";
    const contentType =
      metaType && metaType !== "application/octet-stream"
        ? metaType
        : headerContentType && headerContentType !== "application/octet-stream"
          ? headerContentType
          : metaType || headerContentType || "application/octet-stream";

    return {
      filename: meta.filename?.trim() || "attachment",
      contentType,
      data,
    };
  } catch (error) {
    throw new Error(formatMailApiError(error));
  }
}

export type SendMailAttachment = {
  filename: string;
  content: string;
  contentType: string;
};

export type SendMailInput = {
  mailboxResourceId: string;
  displayName: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: SendMailAttachment[];
};

export async function sendMail(input: SendMailInput) {
  try {
    const api = new SendApi(getMailConfiguration());
    const payload: V1SendRequest = {
      to: input.to,
      displayName: input.displayName,
      cc: input.cc ?? [],
      bcc: input.bcc ?? [],
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: (input.attachments ?? []).map((file) => ({
        filename: file.filename,
        content: file.content,
        contentType: file.contentType,
        cid: "",
        encoding: "base64",
      })),
    };
    await api.sendEmail(input.mailboxResourceId, payload);
  } catch (error) {
    throw new Error(formatMailApiError(error));
  }
}

export function findPreferredMailFolder(
  folders: MailFolder[],
  kind: "inbox" | "sent",
): string {
  if (kind === "sent") {
    const bySpecial = folders.find(
      (item) =>
        item.specialUse === "\\Sent" ||
        item.specialUse?.toLowerCase() === "\\sent",
    );
    if (bySpecial) return bySpecial.path;

    const byPath = folders.find((item) => {
      const path = item.path.toLowerCase();
      const name = item.name.toLowerCase();
      return (
        path === "inbox.sent" ||
        path === "sent" ||
        path.endsWith(".sent") ||
        name === "sent" ||
        name === "sent items" ||
        name === "sent messages"
      );
    });
    if (byPath) return byPath.path;
    return "INBOX.Sent";
  }

  const bySpecial = folders.find(
    (item) =>
      item.specialUse === "\\Inbox" ||
      item.specialUse?.toLowerCase() === "\\inbox",
  );
  if (bySpecial) return bySpecial.path;

  const byPath = folders.find((item) => item.path.toUpperCase() === "INBOX");
  return byPath?.path ?? folders[0]?.path ?? "INBOX";
}

export function isLikelySentFolder(folderPath: string, folders: MailFolder[] = []) {
  const matched = folders.find((item) => item.path === folderPath);
  if (
    matched?.specialUse === "\\Sent" ||
    matched?.specialUse?.toLowerCase() === "\\sent"
  ) {
    return true;
  }
  const path = folderPath.toLowerCase();
  return (
    path === "inbox.sent" ||
    path === "sent" ||
    path.endsWith(".sent") ||
    path.includes("sent")
  );
}

export function splitEmailList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function textToSimpleHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");
  return paragraphs || "<p></p>";
}

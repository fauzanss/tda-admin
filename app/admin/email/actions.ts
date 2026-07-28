"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  sendMail,
  splitEmailList,
  textToSimpleHtml,
  type SendMailAttachment,
} from "@/lib/hostinger-mail";
import { prisma } from "@/lib/prisma";
import { requireFileEditor } from "@/lib/roles";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

const sendSchema = z.object({
  mailboxResourceId: z.string().min(1),
  to: z.string().min(1),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  displayName: z.string().optional(),
});

export type SendEmailState = {
  error?: string;
};

async function parseAttachments(formData: FormData): Promise<SendMailAttachment[]> {
  const files = formData
    .getAll("attachments")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length > MAX_ATTACHMENTS) {
    throw new Error(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
  }

  const attachments: SendMailAttachment[] = [];
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`Attachment "${file.name}" exceeds the 10 MB limit.`);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    attachments.push({
      filename: file.name,
      content: buffer.toString("base64"),
      contentType: file.type || "application/octet-stream",
    });
  }
  return attachments;
}

export async function sendEmailAction(
  _prev: SendEmailState,
  formData: FormData,
): Promise<SendEmailState> {
  try {
    await requireFileEditor();
  } catch {
    return { error: "You do not have permission to send email." };
  }

  let parsed: z.infer<typeof sendSchema>;
  try {
    parsed = sendSchema.parse({
      mailboxResourceId: String(formData.get("mailboxResourceId") ?? ""),
      to: String(formData.get("to") ?? ""),
      cc: String(formData.get("cc") ?? ""),
      bcc: String(formData.get("bcc") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      body: String(formData.get("body") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues.map((issue) => issue.message).join("; ") };
    }
    return { error: "Invalid form data." };
  }

  const to = splitEmailList(parsed.to);
  const cc = splitEmailList(parsed.cc ?? "");
  const bcc = splitEmailList(parsed.bcc ?? "");
  if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
    return { error: "At least one recipient is required (To, Cc, or Bcc)." };
  }

  let attachments: SendMailAttachment[];
  try {
    attachments = await parseAttachments(formData);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to read attachments.",
    };
  }

  let displayName = parsed.displayName?.trim();
  if (!displayName) {
    const company = await prisma.companyProfile.findFirst({
      select: { companyName: true },
    });
    displayName = company?.companyName ?? "PT. Transformasi Digital Abadi";
  }

  try {
    await sendMail({
      mailboxResourceId: parsed.mailboxResourceId,
      displayName,
      to,
      cc,
      bcc,
      subject: parsed.subject.trim(),
      text: parsed.body,
      html: textToSimpleHtml(parsed.body),
      attachments,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to send email.",
    };
  }

  revalidatePath("/admin/email");
  redirect("/admin/email?sent=1");
}

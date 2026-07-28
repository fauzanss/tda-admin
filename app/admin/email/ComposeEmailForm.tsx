"use client";

import { useActionState, useState } from "react";

import { sendEmailAction, type SendEmailState } from "@/app/admin/email/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MailboxOption } from "@/lib/hostinger-mail";

const initialState: SendEmailState = {};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ComposeEmailForm({
  mailboxes,
  defaultMailbox,
  defaultTo,
  defaultSubject,
  defaultDisplayName,
}: Readonly<{
  mailboxes: MailboxOption[];
  defaultMailbox?: string;
  defaultTo?: string;
  defaultSubject?: string;
  defaultDisplayName: string;
}>) {
  const [state, formAction] = useActionState(sendEmailAction, initialState);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  return (
    <form action={formAction}>
      <Card>
        <CardBody className="space-y-4">
          <input type="hidden" name="displayName" value={defaultDisplayName} />

          <div>
            <Label htmlFor="mailboxResourceId">From</Label>
            <Select
              id="mailboxResourceId"
              name="mailboxResourceId"
              defaultValue={defaultMailbox ?? mailboxes[0]?.resourceId}
              required
            >
              {mailboxes.map((mailbox) => (
                <option key={mailbox.resourceId} value={mailbox.resourceId}>
                  {mailbox.address}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              name="to"
              type="text"
              placeholder="name@example.com, other@example.com"
              defaultValue={defaultTo ?? ""}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="cc">Cc</Label>
              <Input id="cc" name="cc" type="text" />
            </div>
            <div>
              <Label htmlFor="bcc">Bcc</Label>
              <Input id="bcc" name="bcc" type="text" />
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              type="text"
              defaultValue={defaultSubject ?? ""}
              required
            />
          </div>

          <div>
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" name="body" rows={12} required />
          </div>

          <div>
            <Label htmlFor="attachments">Attachments</Label>
            <Input
              id="attachments"
              name="attachments"
              type="file"
              multiple
              onChange={(event) => {
                setSelectedFiles(Array.from(event.target.files ?? []));
              }}
            />
            <p className="mt-1.5 text-xs text-tda-navy-muted">Max 5 files, 10 MB each.</p>
            {selectedFiles.length > 0 && (
              <ul className="mt-2 space-y-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {selectedFiles.map((file) => (
                  <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                    {file.name} ({formatFileSize(file.size)})
                  </li>
                ))}
              </ul>
            )}
          </div>

          {state.error && <Alert variant="danger">{state.error}</Alert>}

          <SubmitButton pendingLabel="Sending...">Send Email</SubmitButton>
        </CardBody>
      </Card>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { sendEmailAction, type SendEmailState } from "@/app/admin/email/actions";
import type { MailboxOption } from "@/lib/hostinger-mail";

const initialState: SendEmailState = {};

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
  const [state, formAction, pending] = useActionState(sendEmailAction, initialState);

  return (
    <form action={formAction} className="card">
      <div className="card-body">
        <input type="hidden" name="displayName" value={defaultDisplayName} />

        <div className="mb-3">
          <label className="form-label" htmlFor="mailboxResourceId">
            From
          </label>
          <select
            id="mailboxResourceId"
            name="mailboxResourceId"
            className="form-select"
            defaultValue={defaultMailbox ?? mailboxes[0]?.resourceId}
            required
          >
            {mailboxes.map((mailbox) => (
              <option key={mailbox.resourceId} value={mailbox.resourceId}>
                {mailbox.address}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="text"
            className="form-control"
            placeholder="name@example.com, other@example.com"
            defaultValue={defaultTo ?? ""}
            required
          />
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="cc">
              Cc
            </label>
            <input id="cc" name="cc" type="text" className="form-control" />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="bcc">
              Bcc
            </label>
            <input id="bcc" name="bcc" type="text" className="form-control" />
          </div>
        </div>

        <div className="mb-3 mt-3">
          <label className="form-label" htmlFor="subject">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            className="form-control"
            defaultValue={defaultSubject ?? ""}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="body">
            Body
          </label>
          <textarea
            id="body"
            name="body"
            className="form-control"
            rows={12}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="attachments">
            Attachments
          </label>
          <input
            id="attachments"
            name="attachments"
            type="file"
            className="form-control"
            multiple
          />
          <div className="form-text">Max 5 files, 10 MB each.</div>
        </div>

        {state.error && <div className="alert alert-danger">{state.error}</div>}

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Sending..." : "Send Email"}
        </button>
      </div>
    </form>
  );
}

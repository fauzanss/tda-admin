"use client";

import { useId, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { X } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

const DELIMITER_KEYS = new Set(["Enter", ",", ";", " ", "Comma", "Semicolon", "Space"]);

function normalizeEmail(value: string) {
  return value.trim().replace(/^<|>$/g, "");
}

function splitIncoming(raw: string) {
  return raw
    .split(/[,;\s\n]+/)
    .map(normalizeEmail)
    .filter(Boolean);
}

export function EmailRecipientsInput({
  id,
  name,
  label,
  defaultValue = "",
  placeholder = "name@example.com",
  required = false,
}: Readonly<{
  id?: string;
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [emails, setEmails] = useState<string[]>(() => splitIncoming(defaultValue));
  const [draft, setDraft] = useState("");
  const joined = emails.join(", ");

  function addEmails(candidates: string[]) {
    if (candidates.length === 0) return;
    setEmails((current) => {
      const next = [...current];
      for (const email of candidates) {
        const normalized = normalizeEmail(email);
        if (!normalized) continue;
        if (next.some((item) => item.toLowerCase() === normalized.toLowerCase())) continue;
        next.push(normalized);
      }
      return next;
    });
  }

  function commitDraft() {
    const parts = splitIncoming(draft);
    if (parts.length === 0) {
      setDraft("");
      return;
    }
    addEmails(parts);
    setDraft("");
  }

  function removeEmail(index: number) {
    setEmails((current) => current.filter((_, i) => i !== index));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (DELIMITER_KEYS.has(event.key)) {
      if (draft.trim()) {
        event.preventDefault();
        commitDraft();
      } else if (event.key === "Enter") {
        event.preventDefault();
      }
      return;
    }

    if (event.key === "Backspace" && !draft && emails.length > 0) {
      event.preventDefault();
      removeEmail(emails.length - 1);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!/[,;\s\n]/.test(text)) return;
    event.preventDefault();
    addEmails(splitIncoming(`${draft}${text}`));
    setDraft("");
  }

  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      <input
        type="text"
        name={name}
        value={joined}
        required={required}
        readOnly
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={() => undefined}
      />
      <div
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm",
          "focus-within:ring-2 focus-within:ring-tda-orange/40",
        )}
        onClick={() => document.getElementById(inputId)?.focus()}
      >
        {emails.map((email, index) => (
          <span
            key={`${email}-${index}`}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-tda-navy/10 px-2 py-0.5 text-xs font-medium text-tda-navy"
          >
            <span className="truncate">{email}</span>
            <button
              type="button"
              className="rounded-full p-0.5 text-tda-navy/70 hover:bg-tda-navy/10 hover:text-tda-navy"
              onClick={(event) => {
                event.stopPropagation();
                removeEmail(index);
              }}
              aria-label={`Remove ${email}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={commitDraft}
          placeholder={emails.length === 0 ? placeholder : ""}
          className="min-w-[10rem] flex-1 border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          autoComplete="email"
        />
      </div>
    </div>
  );
}

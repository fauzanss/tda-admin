import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GoogleDriveLinkFieldsProps = Readonly<{
  initialLink?: string | null;
  initialFileName?: string | null;
  required?: boolean;
  linkLabel?: string;
  fileLabel?: string;
  helpText?: string;
}>;

export function GoogleDriveLinkFields({
  initialLink,
  initialFileName,
  required = false,
  linkLabel = "Google Drive Link",
  fileLabel = "File Label",
  helpText = "Upload the file to Google Drive manually, then paste the share link here.",
}: GoogleDriveLinkFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="gdriveLink">
          {linkLabel} {required && <span className="text-red-600">*</span>}
        </Label>
        <Input
          id="gdriveLink"
          name="gdriveLink"
          type="url"
          placeholder="https://drive.google.com/file/d/.../view"
          defaultValue={initialLink ?? ""}
          required={required}
        />
        <p className="text-xs text-tda-navy-muted">{helpText}</p>
      </div>
      <div className="mt-4 space-y-1.5">
        <Label htmlFor="gdriveFileName">{fileLabel}</Label>
        <Input
          id="gdriveFileName"
          name="gdriveFileName"
          type="text"
          placeholder="PO-2024-001.pdf"
          defaultValue={initialFileName ?? ""}
        />
      </div>
    </>
  );
}

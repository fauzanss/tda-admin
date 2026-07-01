type GoogleDriveLinkFieldsProps = Readonly<{
  initialLink?: string | null;
  initialFileName?: string | null;
  required?: boolean;
}>;

export function GoogleDriveLinkFields({
  initialLink,
  initialFileName,
  required = false,
}: GoogleDriveLinkFieldsProps) {
  return (
    <>
      <div className="mb-3">
        <label htmlFor="gdriveLink" className="form-label">
          Google Drive Link {required && <span className="text-danger">*</span>}
        </label>
        <input
          id="gdriveLink"
          name="gdriveLink"
          type="url"
          className="form-control"
          placeholder="https://drive.google.com/file/d/.../view"
          defaultValue={initialLink ?? ""}
          required={required}
        />
        <div className="form-text">
          Upload the file to Google Drive manually, then paste the share link here.
        </div>
      </div>
      <div className="mb-3">
        <label htmlFor="gdriveFileName" className="form-label">
          File Label
        </label>
        <input
          id="gdriveFileName"
          name="gdriveFileName"
          type="text"
          className="form-control"
          placeholder="PO-2024-001.pdf"
          defaultValue={initialFileName ?? ""}
        />
      </div>
    </>
  );
}

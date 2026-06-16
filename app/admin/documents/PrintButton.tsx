"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="print-button no-print"
      onClick={() => window.print()}
    >
      Print / Export PDF
    </button>
  );
}

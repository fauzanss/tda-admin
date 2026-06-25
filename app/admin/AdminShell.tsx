"use client";

import type { UserRole } from "@/generated/prisma/client";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

import { isAdminRole } from "@/lib/role-guards";

const fileLinks = [
  { href: "/admin/documents/SPH", label: "Quotation" },
  { href: "/admin/documents/SURAT_JALAN", label: "Delivery Note" },
  { href: "/admin/documents/INVOICE", label: "Invoice" },
];

const poLinks = [
  { href: "/admin/po-masuk", label: "Incoming PO" },
  { href: "/admin/po-keluar", label: "Outgoing PO" },
];

const settingsLinks = [
  { href: "/admin/settings/user", label: "User" },
  { href: "/admin/settings/company", label: "Company" },
];

export function AdminShell({
  children,
  userRole,
}: {
  children: React.ReactNode;
  userRole: UserRole;
}) {
  const pathname = usePathname();
  const showSettings = isAdminRole(userRole);
  return (
    <div className="min-vh-100 bg-light admin-layout">
      <header className="border-bottom bg-white no-print">
        <div className="container-fluid d-flex align-items-center justify-content-between py-3 px-4">
          <Link
            href="/admin/dashboard"
            className="d-flex align-items-center gap-2 gap-sm-3 text-decoration-none text-body me-2 min-w-0"
          >
            <Image
              src="/tda-logo-transparent.png"
              alt="TDA"
              width={120}
              height={45}
              className="admin-navbar-logo flex-shrink-0"
              priority
            />
            <span
              className="fw-semibold mb-0 text-uppercase admin-navbar-tagline"
            >
              YOUR DIGITAL TRANSFORMATION PARTNER
            </span>
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn btn-outline-secondary btn-sm"
          >
            Logout
          </button>
        </div>
      </header>
      <div className="container-fluid py-4 px-4">
        <div className="row g-3">
        <aside className="col-12 col-md-3 col-lg-2 no-print">
          <nav className="list-group">
            <Link
              href="/admin/dashboard"
              className={`list-group-item list-group-item-action ${
                pathname === "/admin/dashboard" ? "active" : ""
              }`}
            >
              Dashboard
            </Link>
            <div className="list-group-item fw-semibold bg-light">- Files -</div>
            {fileLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`list-group-item list-group-item-action ps-4 ${
                  pathname === link.href ? "active" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="list-group-item fw-semibold bg-light">- PO -</div>
            {poLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`list-group-item list-group-item-action ps-4 ${
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? "active"
                    : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
            {showSettings && (
              <>
                <div className="list-group-item fw-semibold bg-light">- Settings -</div>
                {settingsLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`list-group-item list-group-item-action ps-4 ${
                      pathname === link.href ? "active" : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </>
            )}
          </nav>
        </aside>
        <section className="col-12 col-md-9 col-lg-10 print-content">{children}</section>
        </div>
      </div>
    </div>
  );
}

"use client";

import type { UserRole } from "@/generated/prisma/client";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  Settings,
  Truck,
} from "lucide-react";

import { ToastProvider } from "@/components/admin/ToastProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { isAdminRole } from "@/lib/role-guards";

const fileLinks = [
  { href: "/admin/documents/SPH", label: "Quotation", icon: FileText },
  { href: "/admin/documents/SURAT_JALAN", label: "Delivery Note", icon: Truck },
  { href: "/admin/documents/INVOICE", label: "Invoice", icon: FileText },
];

const poLinks = [
  { href: "/admin/po-masuk", label: "Incoming PO", icon: Package },
  { href: "/admin/po-keluar", label: "Outgoing PO", icon: Package },
];

const emailLinks = [
  { href: "/admin/email", label: "Inbox", icon: Inbox },
  { href: "/admin/email/compose", label: "Compose", icon: Mail },
];

const settingsLinks = [
  { href: "/admin/settings/user", label: "User", icon: Settings },
  { href: "/admin/settings/company", label: "Company", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-tda-orange text-white shadow-sm"
          : "text-slate-300 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon size={16} className="shrink-0 opacity-90" />
      {label}
    </Link>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-tda-navy-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

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
    <ToastProvider>
      <div className="admin-layout min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur no-print">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link
              href="/admin/dashboard"
              className="flex min-w-0 items-center gap-2 text-slate-900 no-underline sm:gap-3"
            >
              <Image
                src="/tda-logo-transparent.png"
                alt="TDA"
                width={120}
                height={45}
                className="admin-navbar-logo shrink-0"
                priority
              />
              <span className="admin-navbar-tagline hidden font-semibold uppercase text-tda-navy sm:block">
                YOUR DIGITAL TRANSFORMATION PARTNER
              </span>
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={14} />
              Logout
            </Button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:gap-6">
          <aside className="no-print w-full shrink-0 lg:w-56">
            <nav className="rounded-xl bg-tda-navy-deep p-3 shadow-sm">
              <div className="mb-1 flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <LayoutDashboard size={14} />
                Menu
              </div>
              <NavLink
                href="/admin/dashboard"
                label="Dashboard"
                icon={LayoutDashboard}
                active={pathname === "/admin/dashboard"}
              />
              <NavSection title="Files">
                {fileLinks.map((link) => (
                  <NavLink
                    key={link.href}
                    {...link}
                    active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
                  />
                ))}
              </NavSection>
              <NavSection title="PO">
                {poLinks.map((link) => (
                  <NavLink
                    key={link.href}
                    {...link}
                    active={
                      pathname === link.href || pathname.startsWith(`${link.href}/`)
                    }
                  />
                ))}
              </NavSection>
              <NavSection title="Email">
                {emailLinks.map((link) => (
                  <NavLink
                    key={link.href}
                    {...link}
                    active={
                      link.href === "/admin/email"
                        ? pathname === "/admin/email" ||
                          pathname.startsWith("/admin/email/message")
                        : pathname === link.href ||
                          pathname.startsWith(`${link.href}/`)
                    }
                  />
                ))}
              </NavSection>
              {showSettings ? (
                <NavSection title="Settings">
                  {settingsLinks.map((link) => (
                    <NavLink
                      key={link.href}
                      {...link}
                      active={pathname === link.href}
                    />
                  ))}
                </NavSection>
              ) : null}
            </nav>
          </aside>

          <section className="print-content min-w-0 flex-1">{children}</section>
        </div>
      </div>
    </ToastProvider>
  );
}

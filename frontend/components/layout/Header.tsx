"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks } from "lucide-react";

const NAV_LINKS = [
  { href: "/quizzes", label: "Quizzes" },
  { href: "/create", label: "Create" },
];

// Shared shell across all pages — active-link highlighting needs the
// current path, hence "use client" (the only reason this isn't a Server
// Component; everything it renders is static otherwise).
export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-header text-white shadow-sm">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4">
        <Link
          href="/quizzes"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight transition-opacity hover:opacity-90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          </span>
          Quiz Builder
        </Link>
        <nav className="flex gap-1 text-sm font-medium">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-primary text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

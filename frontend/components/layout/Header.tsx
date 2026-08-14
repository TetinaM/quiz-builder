"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4">
        <Link
          href="/quizzes"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Quiz Builder
        </Link>
        <nav className="flex gap-4 text-sm font-medium">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                }
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

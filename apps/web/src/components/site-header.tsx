"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/games", label: "Games" },
  { href: "/teams", label: "Teams" },
  { href: "/admin", label: "Admin" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="flex h-16 shrink-0 items-center gap-8 bg-ink px-8 text-card">
      <Link href="/games" className="flex items-center gap-3">
        <span className="flex size-[30px] items-center justify-center rounded-lg bg-green font-display text-sm font-extrabold italic">
          BL
        </span>
        <span className="font-display text-[23px] font-extrabold italic uppercase">
          Basket <span className="text-green-light">Log</span>
        </span>
      </Link>
      <nav className="flex gap-2 text-sm">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 font-semibold ${active ? "bg-card text-ink" : "text-muted-on-dark hover:text-card"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

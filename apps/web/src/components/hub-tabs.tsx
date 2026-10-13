"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "", label: "Play-by-Play" },
  { path: "/box", label: "Box Score" },
  { path: "/shots", label: "Shot Chart" },
  { path: "/recap", label: "Recap" },
];

export function HubTabs({ gameId }: { gameId: string }) {
  const pathname = usePathname();
  const base = `/games/${gameId}`;
  return (
    <nav className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-[1280px] gap-8 px-12">
        {TABS.map((t) => {
          const href = `${base}${t.path}`;
          const active = pathname === href;
          return (
            <Link
              key={t.label}
              href={href}
              className={`border-b-[3px] py-4 text-[15px] font-semibold ${active ? "border-green text-ink" : "border-transparent text-muted"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

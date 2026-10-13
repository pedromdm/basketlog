import { Suspense } from "react";
import { listTeams } from "@basket-log/db";
import { createClient } from "@/lib/supabase/server";
import { TeamsEditor } from "./teams-editor";

export const metadata = { title: "Teams · Basket Log" };

async function TeamsData() {
  const supabase = await createClient();
  const teams = await listTeams(supabase);
  return <TeamsEditor initialTeams={teams} />;
}

export default function TeamsPage() {
  return (
    <>
      <header className="flex h-16 items-center gap-8 bg-ink px-8 text-card">
        <span className="font-display text-2xl font-extrabold italic uppercase">
          Basket <span className="text-green-light">Log</span>
        </span>
        <nav className="flex gap-6 text-sm text-muted-on-dark">
          <span className="rounded-full bg-card px-4 py-1.5 font-semibold text-ink">Teams</span>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1280px] flex-1 p-8">
        <Suspense fallback={<p className="text-muted">Loading teams…</p>}>
          <TeamsData />
        </Suspense>
      </main>
    </>
  );
}

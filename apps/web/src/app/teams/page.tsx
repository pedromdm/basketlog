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
      <main className="mx-auto w-full max-w-[1280px] flex-1 p-8">
        <Suspense fallback={<p className="text-muted">Loading teams…</p>}>
          <TeamsData />
        </Suspense>
      </main>
    </>
  );
}

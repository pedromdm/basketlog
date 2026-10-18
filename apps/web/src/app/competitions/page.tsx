import { Suspense } from "react";
import { listCompetitions, listTeams } from "@basket-log/db";
import { createClient } from "@/lib/supabase/server";
import { CompetitionsEditor } from "./competitions-editor";

export const metadata = { title: "Competitions · Basket Log" };

async function CompetitionsData() {
  const supabase = await createClient();
  const [competitions, teams] = await Promise.all([listCompetitions(supabase), listTeams(supabase)]);
  const slim = teams.map(({ id, name, abbr, color_primary }) => ({ id, name, abbr, color: color_primary }));
  return <CompetitionsEditor initialCompetitions={competitions} teams={slim} />;
}

export default function CompetitionsPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 p-8">
      <Suspense fallback={<p className="text-muted">Loading competitions…</p>}>
        <CompetitionsData />
      </Suspense>
    </main>
  );
}

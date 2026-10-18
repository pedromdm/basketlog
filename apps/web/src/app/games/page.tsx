import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadGameCards } from "@/lib/games-list";
import { GamesBoard } from "./games-board";

export const metadata = { title: "Games · Basket Log" };

async function GamesData() {
  const games = await loadGameCards(await createClient());
  return <GamesBoard games={games} />;
}

export default function GamesPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
      <Suspense fallback={<p className="text-muted">Loading games…</p>}>
        <GamesData />
      </Suspense>
    </main>
  );
}

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadGameView } from "@/lib/game-data";

/** One load per request, shared by the hub layout and its pages. */
export const getGameView = cache(async (id: string) => loadGameView(await createClient(), id));

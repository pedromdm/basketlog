import { createBrowserClient } from "@supabase/ssr";
import type { BasketClient, Database } from "@basket-log/db";

export function createClient(): BasketClient {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  ) as unknown as BasketClient;
}

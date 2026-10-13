import { createServerClient } from "@supabase/ssr";
import type { BasketClient, Database } from "@basket-log/db";
import { cookies } from "next/headers";

export async function createClient(): Promise<BasketClient> {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // called from a Server Component; the proxy refreshes the session instead
          }
        },
      },
    },
  ) as unknown as BasketClient;
}

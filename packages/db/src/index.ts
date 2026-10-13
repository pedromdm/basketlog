import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type { Database, Json } from './database.types';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

export type BasketClient = SupabaseClient<Database>;

export function createBasketClient(url: string, key: string, options?: Parameters<typeof createClient>[2]): BasketClient {
  return createClient<Database>(url, key, options) as BasketClient;
}

export * from './queries';

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBasketClient } from '@basket-log/db';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

// Expo's web export renders routes in Node, where AsyncStorage (window.localStorage) does not exist.
const hasStorage = typeof window !== 'undefined';

export const supabase = createBasketClient(url, key, {
  auth: {
    ...(hasStorage ? { storage: AsyncStorage } : {}),
    autoRefreshToken: hasStorage,
    persistSession: hasStorage,
    detectSessionInUrl: false,
  },
});

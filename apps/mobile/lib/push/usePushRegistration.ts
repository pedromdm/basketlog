import { registerPushToken } from '@basket-log/db';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '../supabase';

// Expo Go (SDK 53+) removed remote push, and importing expo-notifications there logs errors that break the
// route modules. So it is loaded lazily, and never in Expo Go (use a development build to test push).
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function loadNotifications() {
  const Notifications = await import('expo-notifications');
  // Show pushes that arrive while the app is open (a live game is exactly when they matter).
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  return Notifications;
}

/** Returns the Expo push token, or null (with a console warning) when this device can't get one. */
async function getPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || inExpoGo) return null;
  if (!Device.isDevice) {
    console.warn('[push] simulators cannot receive push notifications; skipping registration');
    return null;
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('[push] no EAS projectId (set expo.extra.eas.projectId in app.json); skipping registration');
    return null;
  }

  const Notifications = await loadNotifications();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Games',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const status = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!status.granted) return null;

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/** Registers this device for push notifications once the user is signed in. Safe to call on every render. */
export function usePushRegistration(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getPushToken();
        if (!token || cancelled) return;
        await registerPushToken(supabase, token, Platform.OS === 'ios' ? 'ios' : 'android');
      } catch (e) {
        console.warn('[push] registration failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}

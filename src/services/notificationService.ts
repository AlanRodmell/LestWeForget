import type { AppPreferences, GratitudeEntry } from '../types';
import { todayIsoDate } from './idbStore';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  const result = await Notification.requestPermission();
  return result;
}

export function pickRandomEntry(
  entries: GratitudeEntry[],
  excludeId?: string | null
): GratitudeEntry | null {
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0];
  const pool = excludeId ? entries.filter((e) => e.id !== excludeId) : entries;
  const source = pool.length > 0 ? pool : entries;
  const index = Math.floor(Math.random() * source.length);
  return source[index];
}

export async function sendGratitudeNotification(
  entry: GratitudeEntry | null,
  prefs: AppPreferences
): Promise<boolean> {
  if (getNotificationPermission() !== 'granted') return false;

  const title = entry
    ? `Lest We Forget · ${entry.perspective === 'from_me' ? prefs.meLabel : prefs.herLabel}`
    : 'Lest We Forget · Daily Reflection';

  const body = entry
    ? `"${entry.text}"`
    : 'Take a quiet minute to pull a gratitude tag and remember what matters most.';

  const iconUrl = new URL('pwa-192x192.png', document.baseURI).href;

  const options: NotificationOptions = {
    body,
    icon: iconUrl,
    badge: iconUrl,
    tag: 'lest-we-forget-daily-reflection',
    data: { entryId: entry?.id ?? null },
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch {
    try {
      new Notification(title, options);
      return true;
    } catch {
      return false;
    }
  }
}

export function shouldFireDailyReminder(prefs: AppPreferences, now = new Date()): boolean {
  if (!prefs.reminderEnabled) return false;
  if (getNotificationPermission() !== 'granted') return false;

  const today = todayIsoDate();
  if (prefs.lastNotifiedDate === today) return false;

  const [targetHourStr, targetMinStr] = prefs.reminderTime.split(':');
  const targetHour = Number(targetHourStr);
  const targetMin = Number(targetMinStr);
  if (Number.isNaN(targetHour) || Number.isNaN(targetMin)) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = targetHour * 60 + targetMin;
  return currentMinutes >= targetMinutes;
}

export async function tryRegisterPeriodicSync(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
        periodicSync?: {
          register: (tag: string, options: { minInterval: number }) => Promise<void>;
        };
      };
      if (reg.periodicSync) {
        await reg.periodicSync.register('lest-we-forget-daily-check', {
          minInterval: 24 * 60 * 60 * 1000,
        });
      }
    }
  } catch {
    // Periodic Background Sync is optional and only available on installed Chromium PWAs
  }
}

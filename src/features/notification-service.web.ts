import AsyncStorage from '@react-native-async-storage/async-storage';

import { Language } from './evripos-model';

export type NotificationSettings = [boolean, boolean, boolean, boolean];
export type NotificationSyncStatus = 'idle' | 'scheduled' | 'denied' | 'unsupported' | 'error';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = [false, false, false, false];

const SETTINGS_KEY = 'evripos.notification-settings.v1';

function isSettings(value: unknown): value is NotificationSettings {
  return Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === 'boolean');
}

export async function loadNotificationSettings() {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    return isSettings(parsed) ? parsed : DEFAULT_NOTIFICATION_SETTINGS;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function syncNotificationSettings(settings: NotificationSettings, _language: Language) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return { status: 'unsupported' as NotificationSyncStatus, count: 0 };
  } catch {
    return { status: 'error' as NotificationSyncStatus, count: 0 };
  }
}

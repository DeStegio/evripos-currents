import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  addDays, dateAtMinute, Language, startOfDay, turnEvents, upcomingMoonPhases,
} from './evripos-model';

export type NotificationSettings = [boolean, boolean, boolean, boolean];
export type NotificationSyncStatus = 'idle' | 'scheduled' | 'denied' | 'unsupported' | 'error';
type NotificationSyncResult = { status: NotificationSyncStatus; count: number };

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = [false, false, false, false];

const SETTINGS_KEY = 'evripos.notification-settings.v1';
const IDENTIFIERS_KEY = 'evripos.notification-identifiers.v1';
const CHANNEL_ID = 'evripos-predictions';
const MAX_SCHEDULED_NOTIFICATIONS = 48;

let notificationsModule: typeof import('expo-notifications') | null = null;
let syncQueue: Promise<NotificationSyncResult> = Promise.resolve({ status: 'idle', count: 0 });

async function getNotifications() {
  if (!notificationsModule) {
    notificationsModule = await import('expo-notifications');
    notificationsModule.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
    });
  }
  return notificationsModule;
}

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

async function cancelOwnedNotifications(Notifications: typeof import('expo-notifications')) {
  const stored = await AsyncStorage.getItem(IDENTIFIERS_KEY);
  let identifiers: unknown = [];
  try {
    identifiers = stored ? JSON.parse(stored) : [];
  } catch {
    identifiers = [];
  }
  if (Array.isArray(identifiers)) {
    await Promise.all(identifiers.filter((item): item is string => typeof item === 'string').map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined)
    ));
  }
  await AsyncStorage.removeItem(IDENTIFIERS_KEY);
}

async function ensurePermission(Notifications: typeof import('expo-notifications')) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Προβλέψεις Ευρίπου',
      description: 'Αλλαγές φοράς και αστρονομικά γεγονότα του Ευρίπου',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
  return permission.status === 'granted';
}

type Candidate = { date: Date; title: string; body: string; data: Record<string, string> };

function localized(language: Language) {
  if (language === 'el') {
    return {
      changeTitle: 'Αλλαγή ρεύματος σε 20 λεπτά',
      changeBody: 'Η προβλεπόμενη φορά του Ευρίπου αλλάζει σύντομα.',
      slackTitle: 'Προβλεπόμενη αλλαγή σε 2 λεπτά',
      slackBody: 'Η ώρα προέρχεται από τον πίνακα και μπορεί να διαφέρει από την πραγματική ροή.',
      irregularTitle: 'Ακανόνιστο ρεύμα',
      irregularBody: 'Αρχίζει περίοδος όπου η φορά δεν προβλέπεται αξιόπιστα.',
      newMoonTitle: 'Νέα Σελήνη',
      fullMoonTitle: 'Πανσέληνος',
      phaseBody: 'Ακριβής αστρονομική στιγμή για τη Χαλκίδα.',
    };
  }
  return {
    changeTitle: 'Current reversal in 20 minutes',
    changeBody: 'The predicted Evripos direction will reverse soon.',
    slackTitle: 'Predicted reversal in 2 minutes',
    slackBody: 'This table-based time can differ from the actual current.',
    irregularTitle: 'Irregular current period',
    irregularBody: 'Direction is no longer reliably predictable.',
    newMoonTitle: 'New moon',
    fullMoonTitle: 'Full moon',
    phaseBody: 'Precise astronomical event for Chalkida.',
  };
}

function notificationCandidates(settings: NotificationSettings, language: Language, now: Date) {
  const text = localized(language);
  const candidates: Candidate[] = [];
  const baseDate = startOfDay(now);

  for (let dayIndex = 0; dayIndex < 14; dayIndex += 1) {
    const date = addDays(baseDate, dayIndex);
    const events = turnEvents(date);
    if (settings[0]) {
      events.forEach((event) => candidates.push({
        date: new Date(event.moment.getTime() - 20 * 60_000), title: text.changeTitle, body: text.changeBody,
        data: { kind: 'change' },
      }));
    }
    if (settings[1]) {
      events.forEach((event) => candidates.push({
        date: new Date(event.moment.getTime() - 2 * 60_000), title: text.slackTitle, body: text.slackBody,
        data: { kind: 'slack' },
      }));
    }
    if (settings[2] && events.length === 0 && (dayIndex === 0 || turnEvents(addDays(date, -1)).length > 0)) {
      candidates.push({
        date: dateAtMinute(date, 9 * 60), title: text.irregularTitle, body: text.irregularBody,
        data: { kind: 'irregular' },
      });
    }
  }

  if (settings[3]) {
    upcomingMoonPhases(now).forEach((date, index) => {
      if (index === 0 || index === 2 || index === 4) {
        candidates.push({
          date,
          title: index === 2 ? text.fullMoonTitle : text.newMoonTitle,
          body: text.phaseBody,
          data: { kind: index === 2 ? 'full-moon' : 'new-moon' },
        });
      }
    });
  }

  return candidates
    .filter((candidate) => candidate.date.getTime() > now.getTime() + 60_000)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_SCHEDULED_NOTIFICATIONS);
}

async function performNotificationSync(settings: NotificationSettings, language: Language): Promise<NotificationSyncResult> {
  const newlyScheduled: string[] = [];
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (Platform.OS === 'web') return { status: 'unsupported', count: 0 };

    const Notifications = await getNotifications();
    await cancelOwnedNotifications(Notifications);
    if (!settings.some(Boolean)) return { status: 'idle', count: 0 };
    if (!(await ensurePermission(Notifications))) return { status: 'denied', count: 0 };

    for (const candidate of notificationCandidates(settings, language, new Date())) {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: { title: candidate.title, body: candidate.body, data: candidate.data },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: candidate.date,
          channelId: CHANNEL_ID,
        },
      });
      newlyScheduled.push(identifier);
    }
    await AsyncStorage.setItem(IDENTIFIERS_KEY, JSON.stringify(newlyScheduled));
    return { status: 'scheduled', count: newlyScheduled.length };
  } catch {
    if (newlyScheduled.length > 0 && notificationsModule) {
      await Promise.all(newlyScheduled.map((identifier) =>
        notificationsModule?.cancelScheduledNotificationAsync(identifier).catch(() => undefined)
      ));
    }
    return { status: 'error', count: 0 };
  }
}

export function syncNotificationSettings(settings: NotificationSettings, language: Language) {
  // Startup refreshes, language changes and fast toggles may overlap. Serializing
  // them guarantees that the last requested settings are the ones left scheduled.
  const run = () => performNotificationSync(settings, language);
  const result = syncQueue.then(run, run);
  syncQueue = result;
  return result;
}

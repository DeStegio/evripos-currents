import {
  Body, Equator, Horizon, Illumination, MoonPhase, NextMoonQuarter, Observer,
  SearchMoonPhase, SearchMoonQuarter, SearchRiseSet,
} from 'astronomy-engine';

export type Language = 'el' | 'en';
export type AppTab = 'now' | 'day' | 'forecast' | 'sky' | 'guide';
export type FlowDirection = 'north' | 'south' | 'slack' | 'irregular';

export const NORTH = '#45D99A';
export const SOUTH = '#FF6B52';
export const GOLD = '#E8C27A';

export const CHALKIDA_LATITUDE = 38.4644;
export const CHALKIDA_LONGITUDE = 23.5936;

const ATHENS_TIME_ZONE = 'Europe/Athens';
const DAY_MS = 86_400_000;
const STANDARD_ATHENS_OFFSET_MINUTES = 120;
export const TABLE_SLACK_MINUTES = 2;
const IRREGULAR_LUNAR_DAYS = new Set([7, 8, 9, 22, 23, 24]);
const OBSERVER = new Observer(CHALKIDA_LATITUDE, CHALKIDA_LONGITUDE, 5);

export const DATA_SOURCES = {
  municipality: 'https://dimoschalkideon.gr/to-palirroiko-fenomeno-tou-evripou/',
  currentTable: 'https://eviachamber.gr/wp-content/uploads/2024/04/90-xronia-eviachamber.pdf',
  astronomy: 'https://github.com/cosinekitty/astronomy',
} as const;

export type TurnEvent = {
  minute: number;
  standardMinute: number;
  direction: 'north' | 'south';
  moment: Date;
};

// Published Chalkida Port Authority table. Times are EET (winter/standard time).
// Each row lists the four starts: south, north, south, north.
const CURRENT_TABLE_STANDARD: Readonly<Record<number, readonly [number, number, number, number]>> = {
  0: [150, 530, 885, 1266],
  1: [180, 560, 915, 1296],
  2: [210, 590, 945, 1326],
  3: [240, 620, 975, 1356],
  4: [270, 650, 1005, 1386],
  5: [300, 680, 1035, 1416],
  6: [330, 710, 1065, 6],
  10: [1, 380, 735, 1116],
  11: [30, 410, 765, 1146],
  12: [60, 440, 795, 1176],
  13: [90, 470, 825, 1206],
  14: [120, 500, 855, 1236],
  15: [150, 530, 885, 1266],
  16: [180, 560, 915, 1296],
  17: [210, 590, 945, 1326],
  18: [240, 620, 975, 1356],
  19: [270, 650, 1005, 1386],
  20: [300, 680, 1035, 1416],
  21: [330, 710, 1065, 6],
  25: [1, 380, 735, 1116],
  26: [30, 410, 765, 1146],
  27: [60, 440, 795, 1176],
  28: [90, 470, 825, 1206],
  29: [120, 500, 855, 1236],
};

export const copy = {
  el: {
    title: 'Πορθμός Χαλκίδας',
    coordinates: '38.4644 Β  ·  23.5936 Α',
    change: 'ΑΛΛΑΓΗ',
    flowingNow: 'ΠΡΟΒΛΕΨΗ ΡΕΥΜΑΤΟΣ',
    northward: 'ΠΡΟΣ ΒΟΡΡΑ',
    southward: 'ΠΡΟΣ ΝΟΤΟ',
    fromSouth: 'Το νερό τρέχει από νότο',
    fromNorth: 'Το νερό τρέχει από βορρά',
    speed: 'ΦΑΣΗ ΚΥΚΛΟΥ',
    estimated: 'ΠΗΓΗ',
    nextChange: 'ΕΠΟΜΕΝΗ ΑΛΛΑΓΗ',
    nextUnavailable: 'Δεν υπάρχει αξιόπιστη ώρα επόμενης αλλαγής πριν από την ακανόνιστη περίοδο.',
    untilSlack: 'έως τη στάση του νερού',
    curve: 'ΕΝΔΕΙΚΤΙΚΗ ΦΟΡΑ 24ΩΡΟΥ',
    sun: 'ΗΛΙΟΣ',
    moon: 'ΣΕΛΗΝΗ',
    altitude: 'ύψος',
    days: 'ημέρες',
    changes: 'ΑΛΛΑΓΕΣ',
    forecastNote: 'Πρόβλεψη φοράς από τη σεληνιακή ηλικία και τον δημοσιευμένο πίνακα του Λιμεναρχείου. Δεν είναι live μέτρηση· η ώρα Αθήνας εφαρμόζεται ανά αλλαγή.',
    strait: 'Ο ΠΟΡΘΜΟΣ',
    straitNote: 'Τα βέλη δείχνουν προς πού τρέχει το νερό κάτω από τη γέφυρα αυτή τη στιγμή.',
    dial: 'ΑΖΙΜΟΥΘΙΟ ΗΛΙΟΥ & ΣΕΛΗΝΗΣ',
    phases: 'ΦΑΣΕΙΣ ΤΗΣ ΣΕΛΗΝΗΣ',
    notifications: 'ΕΙΔΟΠΟΙΗΣΕΙΣ',
    notificationsScheduled: 'προγραμματισμένες ειδοποιήσεις',
    notificationsDenied: 'Χρειάζεται άδεια ειδοποιήσεων από τις ρυθμίσεις της συσκευής.',
    notificationsUnsupported: 'Οι ειδοποιήσεις προγραμματίζονται μόνο στην εφαρμογή iOS/Android.',
    notificationsError: 'Δεν ήταν δυνατός ο προγραμματισμός. Δοκίμασε ξανά.',
    aboutTitle: 'Πώς γίνεται η πρόβλεψη',
    about1: 'Στον Εύριπο το νερό αλλάζει φορά περίπου κάθε έξι ώρες. Αιτία είναι η παλίρροια, που ακολουθεί τη θέση της σελήνης και του ηλίου.',
    about2: 'Η εφαρμογή υπολογίζει σε πραγματικό χρόνο τη σεληνιακή ημέρα και εφαρμόζει τον δημοσιευμένο πίνακα φοράς ρευμάτων του Λιμεναρχείου Χαλκίδας. Οι αστρονομικές τιμές υπολογίζονται ειδικά για τις συντεταγμένες της γέφυρας.',
    about3: 'Στις σεληνιακές ημέρες 7–9 και 22–24 το ρεύμα είναι ακανόνιστο και δεν δίνεται κατεύθυνση. Δεν εμφανίζεται πλασματική ταχύτητα: χωρίς τοπικό αισθητήρα προβλέπεται μόνο η φορά και η φάση του κύκλου.',
    reliabilityTitle: 'Αξιοπιστία δεδομένων',
    reliabilityIntro: 'Η εφαρμογή ξεχωρίζει όσα υπολογίζονται αστρονομικά από όσα προβλέπονται εμπειρικά.',
    reliabilityRegular: 'Κανονικές ημέρες · μέση βεβαιότητα φοράς',
    reliabilityRegularHelp: 'Πρόβλεψη από τον δημοσιευμένο πίνακα. Άνεμος και τοπικές συνθήκες μπορούν να μετακινήσουν την πραγματική αλλαγή.',
    reliabilityIrregular: 'Ακανόνιστες ημέρες · χωρίς πρόβλεψη φοράς',
    reliabilityIrregularHelp: 'Η εφαρμογή δεν μαντεύει κατεύθυνση στις σεληνιακές ημέρες 7–9 και 22–24.',
    reliabilityAstronomy: 'Ήλιος & Σελήνη · υψηλή υπολογιστική ακρίβεια',
    reliabilityAstronomyHelp: 'Τοπικοί υπολογισμοί για τις συντεταγμένες της γέφυρας, χωρίς εξάρτηση από σύνδεση δικτύου.',
    confidence: 'ΒΕΒΑΙΟΤΗΤΑ',
    confidenceRegular: 'ΜΕΣΗ · ΠΡΟΒΛΕΨΗ ΠΙΝΑΚΑ',
    confidenceLimited: 'ΠΕΡΙΟΡΙΣΜΕΝΗ · ΑΓΝΩΣΤΗ ΕΠΟΜΕΝΗ ΑΛΛΑΓΗ',
    confidenceUnavailable: 'ΜΗ ΔΙΑΘΕΣΙΜΗ',
    unboundedStage: 'ΧΩΡΙΣ ΧΡΟΝΟ ΑΛΛΑΓΗΣ',
    sources: 'ΠΗΓΕΣ & ΜΕΘΟΔΟΛΟΓΙΑ',
    municipalitySource: 'Δήμος Χαλκιδέων · περιγραφή φαινομένου',
    tableDocumentSource: 'Επιμελητήριο Εύβοιας · πίνακας ρευμάτων',
    astronomySource: 'Astronomy Engine · αστρονομικοί υπολογισμοί',
    sourceHint: 'Άνοιγμα πηγής',
    errorTitle: 'Κάτι δεν υπολογίστηκε σωστά',
    errorBody: 'Τα δεδομένα δεν εμφανίστηκαν για να μη δοθεί παραπλανητική πρόβλεψη.',
    retry: 'Δοκιμή ξανά',
    legend: 'ΥΠΟΜΝΗΜΑ',
    legendN: 'Νερό προς βορρά (από νότο)',
    legendS: 'Νερό προς νότο (από βορρά)',
    legendY: 'Παράθυρο στάσης · πορεία ηλίου',
    disclaimer: 'Εμπειρική πρόβλεψη φοράς · όχι live μέτρηση · οι πραγματικές αλλαγές επηρεάζονται από άνεμο και τοπικές συνθήκες · όχι για ναυσιπλοΐα.',
    pickerTitle: 'Ημερομηνία & ώρα',
    done: 'Έτοιμο',
    hour: 'ΩΡΑ',
    live: 'ΤΩΡΑ',
    irregular: 'ΑΚΑΝΟΝΙΣΤΟ',
    irregularHelp: 'Η φορά δεν προβλέπεται αξιόπιστα αυτή τη σεληνιακή ημέρα.',
    slack: 'ΣΤΑΣΗ ΡΕΥΜΑΤΟΣ',
    slackHelp: 'Προβλεπόμενο κενό 2 λεπτών του πίνακα· η πραγματική στάση μπορεί να διαφέρει.',
    calculated: 'ΥΠΟΛΟΓΙΣΜΟΣ',
    building: 'ΕΝΙΣΧΥΕΤΑΙ',
    peakFlow: 'ΜΕΣΗ ΚΥΚΛΟΥ',
    easing: 'ΕΞΑΣΘΕΝΕΙ',
    tableSource: 'ΛΙΜΕΝΑΡΧΕΙΟ',
    tabs: ['Τώρα', 'Ημέρα', 'Πρόγνωση', 'Ουρανός', 'Οδηγός'],
    turnsNorth: 'Γυρίζει προς βορρά',
    turnsSouth: 'Γυρίζει προς νότο',
    peak: 'μέγιστο',
    today: 'Σήμερα',
    tomorrow: 'Αύριο',
    alerts: [
      ['20 λεπτά πριν κάθε αλλαγή', 'τέσσερις φορές την ημέρα'],
      ['Λίγο πριν την προβλεπόμενη αλλαγή', '2 λεπτά πριν από την ώρα του πίνακα'],
      ['Έναρξη ακανόνιστων ημερών', 'όταν δεν προβλέπεται ασφαλής φορά'],
      ['Πανσέληνος και νέα σελήνη', 'στις ακριβείς αστρονομικές ώρες'],
    ],
    phaseNames: ['Νέα Σελήνη', '1ο Τέταρτο', 'Πανσέληνος', '2ο Τέταρτο', 'Νέα Σελήνη'],
  },
  en: {
    title: 'Chalkida strait',
    coordinates: '38.4644 N  ·  23.5936 E',
    change: 'CHANGE',
    flowingNow: 'CURRENT FORECAST',
    northward: 'NORTHWARD',
    southward: 'SOUTHWARD',
    fromSouth: 'Water running from the south',
    fromNorth: 'Water running from the north',
    speed: 'CYCLE PHASE',
    estimated: 'SOURCE',
    nextChange: 'NEXT CHANGE',
    nextUnavailable: 'No reliable next reversal time is available before the irregular period.',
    untilSlack: 'until slack water',
    curve: 'INDICATIVE 24-HOUR DIRECTION',
    sun: 'SUN',
    moon: 'MOON',
    altitude: 'alt',
    days: 'days',
    changes: 'CHANGES',
    forecastNote: 'Direction forecast from lunar age and the published Port Authority table. It is not a live reading; Athens time is applied per event.',
    strait: 'THE STRAIT',
    straitNote: 'Arrows show where the water is running under the bridge right now.',
    dial: 'SUN & MOON AZIMUTH',
    phases: 'MOON PHASES',
    notifications: 'NOTIFICATIONS',
    notificationsScheduled: 'scheduled notifications',
    notificationsDenied: 'Notification permission is required in device settings.',
    notificationsUnsupported: 'Scheduling is available in the iOS/Android app only.',
    notificationsError: 'Notifications could not be scheduled. Please try again.',
    aboutTitle: 'How the prediction works',
    about1: 'In the Evripos strait the water reverses direction roughly every six hours. The driver is the tide, which follows the position of the moon and the sun.',
    about2: 'The app calculates the current lunar day and applies the published Chalkida Port Authority current-direction table. Astronomy is calculated for the bridge coordinates.',
    about3: 'On lunar days 7–9 and 22–24 the current is irregular, so no direction is shown. No invented speed is displayed: without a local sensor, only direction and cycle phase are forecast.',
    reliabilityTitle: 'Data reliability',
    reliabilityIntro: 'The app separates astronomical calculations from empirical current predictions.',
    reliabilityRegular: 'Regular days · medium direction confidence',
    reliabilityRegularHelp: 'Based on the published table. Wind and local conditions can shift the actual reversal.',
    reliabilityIrregular: 'Irregular days · no direction forecast',
    reliabilityIrregularHelp: 'The app does not guess a direction on lunar days 7–9 and 22–24.',
    reliabilityAstronomy: 'Sun & Moon · high computational accuracy',
    reliabilityAstronomyHelp: 'Local calculations for the bridge coordinates, with no network dependency.',
    confidence: 'CONFIDENCE',
    confidenceRegular: 'MEDIUM · TABLE FORECAST',
    confidenceLimited: 'LIMITED · NEXT REVERSAL UNKNOWN',
    confidenceUnavailable: 'UNAVAILABLE',
    unboundedStage: 'REVERSAL TIME UNKNOWN',
    sources: 'SOURCES & METHODOLOGY',
    municipalitySource: 'Municipality of Chalkida · phenomenon',
    tableDocumentSource: 'Evia Chamber · current table',
    astronomySource: 'Astronomy Engine · calculations',
    sourceHint: 'Open source',
    errorTitle: 'A calculation failed',
    errorBody: 'Data was hidden to avoid showing a misleading prediction.',
    retry: 'Try again',
    legend: 'LEGEND',
    legendN: 'Water running north (from the south)',
    legendS: 'Water running south (from the north)',
    legendY: 'Slack water window · sun track',
    disclaimer: 'Empirical direction forecast · not a live measurement · actual changes depend on wind and local conditions · not for navigation.',
    pickerTitle: 'Date & hour',
    done: 'Done',
    hour: 'HOUR',
    live: 'NOW',
    irregular: 'IRREGULAR',
    irregularHelp: 'Direction cannot be predicted reliably on this lunar day.',
    slack: 'SLACK WATER',
    slackHelp: 'The table predicts a 2-minute gap; actual slack water may differ.',
    calculated: 'CALCULATED',
    building: 'BUILDING',
    peakFlow: 'MID-CYCLE',
    easing: 'EASING',
    tableSource: 'PORT AUTHORITY',
    tabs: ['Now', 'Day', 'Forecast', 'Sky', 'Guide'],
    turnsNorth: 'Turns northward',
    turnsSouth: 'Turns southward',
    peak: 'peak',
    today: 'Today',
    tomorrow: 'Tomorrow',
    alerts: [
      ['20 min before each change', 'four times a day'],
      ['Just before the predicted reversal', '2 minutes before the table time'],
      ['Irregular period begins', 'when direction is not safely predictable'],
      ['Full and new moon', 'at the precise astronomical times'],
    ],
    phaseNames: ['New moon', 'First quarter', 'Full moon', 'Last quarter', 'New moon'],
  },
} as const;

type DateParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function athensParts(date: Date): DateParts {
  const values = new Intl.DateTimeFormat('en-GB', {
    timeZone: ATHENS_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((item) => item.type === type)?.value);
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute'), second: part('second') };
}

function athensOffsetMinutes(date: Date) {
  const p = athensParts(date);
  const representedAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((representedAsUtc - date.getTime()) / 60_000);
}

function athensCivilDate(year: number, month: number, day: number, hour: number, minute: number) {
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let result = new Date(wallClockAsUtc - athensOffsetMinutes(new Date(wallClockAsUtc)) * 60_000);
  result = new Date(wallClockAsUtc - athensOffsetMinutes(result) * 60_000);
  return result;
}

function civilParts(date: Date) {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function startOfDay(date: Date) {
  const p = athensParts(date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
}

export function addDays(date: Date, amount: number) {
  const p = civilParts(date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day + amount, 12));
}

export function normalizeMinute(minute: number) {
  return ((minute % 1440) + 1440) % 1440;
}

export function dateAtMinute(date: Date, minute: number) {
  const p = civilParts(date);
  const dayOffset = Math.floor(minute / 1440);
  const safe = normalizeMinute(minute);
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + dayOffset, 12));
  return athensCivilDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(), Math.floor(safe / 60), safe % 60);
}

export function lunarAge(date: Date) {
  const previousNewMoon = SearchMoonPhase(0, date, -35);
  if (!previousNewMoon) throw new Error('Unable to calculate the previous new moon.');
  return (date.getTime() - previousNewMoon.date.getTime()) / DAY_MS;
}

export function lunarDay(date: Date, minute = 720) {
  return Math.min(29, Math.max(0, Math.floor(lunarAge(dateAtMinute(date, minute)))));
}

export function isIrregularDay(date: Date) {
  return IRREGULAR_LUNAR_DAYS.has(lunarDay(date));
}

export function athensMinute(date: Date) {
  const p = athensParts(date);
  return p.hour * 60 + p.minute;
}

export function isAthensDaylightSaving(date: Date) {
  return athensOffsetMinutes(date) > STANDARD_ATHENS_OFFSET_MINUTES;
}

function standardTableInstant(date: Date, standardMinute: number) {
  const p = civilParts(date);
  return new Date(
    Date.UTC(p.year, p.month - 1, p.day, 0, standardMinute) - STANDARD_ATHENS_OFFSET_MINUTES * 60_000,
  );
}

function tableRowEvents(date: Date): TurnEvent[] {
  const day = lunarDay(date);
  const standardTimes = CURRENT_TABLE_STANDARD[day];
  if (!standardTimes || IRREGULAR_LUNAR_DAYS.has(day)) return [];
  const directions = ['south', 'north', 'south', 'north'] as const;
  let dayOffset = 0;
  return standardTimes.map((standardMinute, index) => {
    if (index > 0 && standardMinute <= standardTimes[index - 1]) dayOffset += 1;
    const moment = standardTableInstant(addDays(date, dayOffset), standardMinute);
    const local = athensParts(moment);
    return {
      // The source table is fixed to EET. Convert every event independently so
      // the two clock-change Sundays remain correct on both sides of the switch.
      minute: local.hour * 60 + local.minute,
      standardMinute,
      direction: directions[index],
      moment,
    };
  });
}

function isOnCivilDate(moment: Date, date: Date) {
  const local = athensParts(moment);
  const civil = civilParts(date);
  return local.year === civil.year && local.month === civil.month && local.day === civil.day;
}

export function turnEvents(date: Date) {
  if (IRREGULAR_LUNAR_DAYS.has(lunarDay(date))) return [];
  // Some fourth table intervals start after midnight. Include the spill-over
  // from the previous lunar-day row, then keep only events on this civil date.
  return [...tableRowEvents(addDays(date, -1)), ...tableRowEvents(date)]
    .filter((event) => isOnCivilDate(event.moment, date))
    .sort((a, b) => a.moment.getTime() - b.moment.getTime());
}

export function currentTimelineEvents(date: Date) {
  const today = turnEvents(date);
  const previousDay = turnEvents(addDays(date, -1));
  const previous = previousDay[previousDay.length - 1];
  const next = turnEvents(addDays(date, 1))[0];
  return [
    ...(previous ? [{ ...previous, minute: previous.minute - 1440 }] : []),
    ...today,
    ...(next ? [{ ...next, minute: next.minute + 1440 }] : []),
  ];
}

function cycleStateAtMinute(events: readonly TurnEvent[], minute: number) {
  if (events.length === 0) {
    return { direction: 'irregular' as FlowDirection, cycleLevel: 0, stage: 'irregular' as const };
  }

  const slackEvent = events.find((event) => {
    const difference = event.minute - minute;
    return difference > 0 && difference <= TABLE_SLACK_MINUTES;
  });
  if (slackEvent) {
    return { direction: 'slack' as FlowDirection, cycleLevel: 0, stage: 'slack' as const };
  }

  let previousIndex = -1;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].minute <= minute) {
      previousIndex = index;
      break;
    }
  }
  const previous = previousIndex >= 0 ? events[previousIndex] : null;
  const next = events.find((event) => event.minute > minute);
  if (!previous) {
    return { direction: 'irregular' as FlowDirection, cycleLevel: 0, stage: 'irregular' as const };
  }
  if (!next) return { direction: previous.direction as FlowDirection, cycleLevel: 0, stage: 'unbounded' as const };
  const intervalProgress = Math.max(0, Math.min(1, (minute - previous.minute) / (next.minute - previous.minute)));
  const cycleLevel = Math.sin(Math.PI * intervalProgress);
  const stage = intervalProgress < 0.42 ? 'building' as const : intervalProgress <= 0.58 ? 'peak' as const : 'easing' as const;

  return { direction: previous.direction as FlowDirection, cycleLevel, stage };
}

export function currentPrediction(date: Date, minute: number) {
  const day = lunarDay(date);
  const age = lunarAge(dateAtMinute(date, minute));
  return { ...cycleStateAtMinute(currentTimelineEvents(date), minute), lunarAge: age, lunarDay: day };
}

export function currentValueFromEvents(minute: number, events: readonly TurnEvent[]) {
  const prediction = cycleStateAtMinute(events, minute);
  if (prediction.direction === 'irregular' || prediction.stage === 'unbounded') return Number.NaN;
  if (prediction.direction === 'slack') return 0;
  return prediction.direction === 'north' ? prediction.cycleLevel : -prediction.cycleLevel;
}

export function currentValue(minute: number, date: Date) {
  return currentValueFromEvents(minute, currentTimelineEvents(date));
}

export function turnMinutes(date: Date) {
  return turnEvents(date).map((event) => event.minute);
}

export function formatMinute(minute: number) {
  const safe = normalizeMinute(Math.round(minute));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function formatClock(date: Date | null | undefined) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('el-GR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ATHENS_TIME_ZONE,
  }).format(date);
}

export function formatEventDate(date: Date, language: Language) {
  return new Intl.DateTimeFormat(language === 'el' ? 'el-GR' : 'en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: ATHENS_TIME_ZONE,
  }).format(date);
}

export function formatDate(date: Date, language: Language, compact = false) {
  return new Intl.DateTimeFormat(language === 'el' ? 'el-GR' : 'en-GB', {
    day: '2-digit', month: '2-digit', ...(compact ? {} : { year: 'numeric' as const }), timeZone: 'UTC',
  }).format(date);
}

export function dayName(date: Date, language: Language, index?: number) {
  const t = copy[language];
  if (index === 0) return t.today;
  if (index === 1) return t.tomorrow;
  const name = new Intl.DateTimeFormat(language === 'el' ? 'el-GR' : 'en-GB', { weekday: 'long', timeZone: 'UTC' }).format(date);
  return name.charAt(0).toLocaleUpperCase(language === 'el' ? 'el-GR' : 'en-GB') + name.slice(1);
}

export function nextTurnInfo(date: Date, minute: number) {
  const timeline = currentTimelineEvents(date);
  const next = timeline.find((event) => event.minute > minute);
  if (!next) return null;
  let previous: TurnEvent | undefined;
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    if (timeline[index].minute <= minute) {
      previous = timeline[index];
      break;
    }
  }
  return {
    next: next.minute,
    previous: previous?.minute ?? minute,
    remaining: next.minute - minute,
    progress: previous ? Math.max(0, Math.min(1, (minute - previous.minute) / (next.minute - previous.minute))) : 0,
  };
}

export function astronomySnapshot(date: Date, minute: number) {
  const moment = dateAtMinute(date, minute);
  const sunEquator = Equator(Body.Sun, moment, OBSERVER, true, true);
  const moonEquator = Equator(Body.Moon, moment, OBSERVER, true, true);
  const sunPosition = Horizon(moment, OBSERVER, sunEquator.ra, sunEquator.dec, 'normal');
  const moonPosition = Horizon(moment, OBSERVER, moonEquator.ra, moonEquator.dec, 'normal');
  const dayStart = dateAtMinute(date, 0);
  const dayEnd = dateAtMinute(date, 1440);
  const withinDay = (event: ReturnType<typeof SearchRiseSet>) => event && event.date < dayEnd ? event.date : null;
  const illumination = Illumination(Body.Moon, moment);

  return {
    moment,
    sunAzimuth: sunPosition.azimuth,
    sunAltitude: sunPosition.altitude,
    moonAzimuth: moonPosition.azimuth,
    moonAltitude: moonPosition.altitude,
    sunrise: withinDay(SearchRiseSet(Body.Sun, OBSERVER, 1, dayStart, 1.1)),
    sunset: withinDay(SearchRiseSet(Body.Sun, OBSERVER, -1, dayStart, 1.1)),
    moonrise: withinDay(SearchRiseSet(Body.Moon, OBSERVER, 1, dayStart, 1.1)),
    moonset: withinDay(SearchRiseSet(Body.Moon, OBSERVER, -1, dayStart, 1.1)),
    moonFraction: illumination.phase_fraction,
    moonPhase: MoonPhase(moment) / 360,
    moonAge: lunarAge(moment),
  };
}

export function upcomingMoonPhases(from: Date) {
  const nextNewMoon = SearchMoonPhase(0, from, 35);
  if (!nextNewMoon) return [];
  const events = [nextNewMoon.date];
  let quarter = SearchMoonQuarter(new Date(nextNewMoon.date.getTime() + 60_000));
  while (events.length < 5) {
    events.push(quarter.time.date);
    quarter = NextMoonQuarter(quarter);
  }
  return events;
}

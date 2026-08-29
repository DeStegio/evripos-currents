import { type ErrorBoundaryProps } from 'expo-router';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Animated, AppState, Easing, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  addDays, AppTab, astronomySnapshot, athensMinute, copy, currentPrediction, DATA_SOURCES,
  dayName, formatClock, formatDate, formatEventDate, formatMinute, Language, lunarDay,
  nextTurnInfo, startOfDay, turnEvents, turnMinutes, upcomingMoonPhases,
} from '@/features/evripos-model';
import {
  DEFAULT_NOTIFICATION_SETTINGS, loadNotificationSettings, NotificationSettings,
  NotificationSyncStatus, syncNotificationSettings,
} from '@/features/notification-service';
import {
  CurrentChart, MoonDisc, SkyDial, StraitMap, StraitView, TabIcon,
} from '@/ui/graphics';
import { Label, StatCell, Toggle } from '@/ui/primitives';
import {
  ACCENT, BAND, BODY, GUTTER, INK, MUTED, NAVY, NORTH, ON_NAVY, ON_NAVY_DIM, ON_NAVY_FAINT,
  ON_NAVY_IDLE, ON_NAVY_LINE, PAPER, RULE, RULE_SOFT, SANS, SCRIM, SERIF, SOUTH, SUBTLE, TNUM,
} from '@/ui/theme';

const TABS: AppTab[] = ['now', 'day', 'forecast', 'map', 'alerts', 'guide'];
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20];
const FORECAST_DAYS = 6;

function openExternal(url: string) {
  void Linking.openURL(url).catch(() => undefined);
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) rows.push(items.slice(index, index + size));
  return rows;
}

/* ----------------------------------------------------------------- header */

/** Blinks only while the forecast is tracking the real clock. */
function LiveMark({ live }: { live: boolean }) {
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!live) {
      pulse.setValue(0.35);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.25, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [live, pulse]);
  return <Animated.View style={[styles.liveMark, { opacity: pulse }]} />;
}

function Header({
  language, minute, live, topInset, onLanguage,
}: {
  language: Language; minute: number; live: boolean; topInset: number; onLanguage: (value: Language) => void;
}) {
  const t = copy[language];
  return (
    <View style={[styles.header, { paddingTop: topInset + 12 }]}>
      <View style={styles.headerEyebrow}>
        <Text style={styles.headerClock}>{formatMinute(minute)}</Text>
        <View style={styles.headerBrand}>
          <LiveMark live={live} />
          <Text style={styles.headerBrandText}>ΕΥΡΙΠΟΣ</Text>
        </View>
      </View>
      <View style={styles.headerMain}>
        <View style={styles.flex}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.coordinates}>{t.coordinates}</Text>
        </View>
        <View style={styles.languageSwitch}>
          {(['el', 'en'] as const).map((value) => {
            const active = language === value;
            return (
              <Pressable
                key={value}
                accessibilityLabel={value === 'el' ? 'Ελληνικά' : 'English'}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onLanguage(value)}
                style={[styles.languageChip, active && styles.languageChipActive]}
              >
                <Text style={[styles.languageText, active && styles.languageTextActive]}>
                  {value === 'el' ? 'ΕΛ' : 'EN'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function DateBar({
  language, date, minute, onPress,
}: {
  language: Language; date: Date; minute: number; onPress: () => void;
}) {
  const t = copy[language];
  return (
    <Pressable
      accessibilityHint={language === 'el' ? 'Αλλαγή ημερομηνίας και ώρας' : 'Change date and time'}
      accessibilityLabel={`${formatDate(date)}, ${formatMinute(minute)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.dateBar, pressed && styles.pressed]}
    >
      <View style={styles.dateBarLeft}>
        <View style={styles.dateBarMark} />
        <Text style={styles.dateBarText}>{formatDate(date)} · {formatMinute(minute)}</Text>
      </View>
      <Text style={styles.dateBarChange}>{t.change} ⌄</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------- now screen */

function NowScreen({
  language, date, minute, live, onOpenMap,
}: {
  language: Language; date: Date; minute: number; live: boolean; onOpenMap: () => void;
}) {
  const t = copy[language];
  const prediction = currentPrediction(date, minute);
  const astronomy = astronomySnapshot(date, minute);
  const irregular = prediction.direction === 'irregular';
  const slack = prediction.direction === 'slack';
  const unbounded = prediction.stage === 'unbounded';
  const north = prediction.direction === 'north';
  const settled = irregular || slack;

  const stageText = irregular ? t.irregular
    : slack ? t.slack
      : unbounded ? t.unboundedStage
        : prediction.stage === 'building' ? t.building
          : prediction.stage === 'peak' ? t.peakFlow : t.easing;
  const directionColor = settled ? ACCENT : north ? NORTH : SOUTH;
  const directionTitle = irregular ? t.irregular : slack ? t.slack : north ? t.northward : t.southward;
  const directionHelp = irregular ? t.irregularHelp : slack ? t.slackHelp : north ? t.fromSouth : t.fromNorth;
  const next = nextTurnInfo(date, minute);
  const hours = next ? Math.floor(next.remaining / 60) : 0;
  const minutes = next ? Math.round(next.remaining % 60) : 0;

  return (
    <View>
      <View style={styles.leadBlock}>
        <View style={styles.headRow}>
          <Label>{t.flowingNow}</Label>
          <Text style={[styles.liveState, !live && styles.liveStatePicked]}>
            {live ? t.calculated : formatMinute(minute)}
          </Text>
        </View>
        <Text style={[styles.direction, { color: directionColor }]}>{directionTitle}</Text>
        <Text style={styles.directionHelp}>{directionHelp}</Text>
      </View>

      <Pressable
        accessibilityHint={t.straitNote}
        accessibilityLabel={t.strait}
        accessibilityRole="button"
        onPress={onOpenMap}
        style={({ pressed }) => [styles.straitBlock, pressed && styles.pressed]}
      >
        <StraitView language={language} north={settled ? null : north} strength={prediction.cycleLevel} />
        <View style={styles.straitBadge}>
          <Text style={styles.straitBadgeText}>{t.openMap}</Text>
        </View>
      </Pressable>

      <View style={styles.statRow}>
        <StatCell divider label={t.speed} value={stageText} />
        <StatCell label={t.estimated} value={t.tableSource} />
      </View>

      <View style={styles.confidenceRow}>
        <Label>{t.confidence}</Label>
        <Text style={[styles.confidenceValue, { color: irregular || unbounded ? ACCENT : NAVY }]}>
          {irregular ? t.confidenceUnavailable : unbounded ? t.confidenceLimited : t.confidenceRegular}
        </Text>
      </View>

      {next ? (
        <View style={styles.nextBlock}>
          <View style={styles.headRow}>
            <Label>{t.nextChange}</Label>
            <Text style={styles.nextWindow}>{formatMinute(next.next - 2)} – {formatMinute(next.next)}</Text>
          </View>
          <View style={styles.countdownRow}>
            <Text style={styles.countdown}>{hours}:{String(minutes).padStart(2, '0')}</Text>
            <Text style={styles.countdownHelp}>{t.untilSlack}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(next.progress * 100)}%` }]} />
          </View>
          <View style={styles.progressAxis}>
            <Text style={styles.axisText}>{formatMinute(next.previous)}</Text>
            <Text style={styles.axisText}>{formatMinute(next.next)}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.nextBlock}>
          <Label>{t.nextChange}</Label>
          <Text style={styles.notice}>{t.nextUnavailable}</Text>
        </View>
      )}

      <View style={styles.curveBlock}>
        <View style={[styles.headRow, styles.curveHead]}>
          <Label>{t.curve}</Label>
          <Text style={styles.axisText}>
            {formatDate(date)} · {language === 'el' ? 'σελ. ημέρα' : 'lunar day'} {prediction.lunarDay}
          </Text>
        </View>
        <CurrentChart date={date} minute={minute} irregularLabel={t.irregular} />
      </View>

      <View style={[styles.statRow, styles.ruleTop]}>
        <View style={[styles.skyCell, styles.cellDivider]}>
          <Label>{t.sun}</Label>
          <Text style={styles.skyTime}>{formatClock(astronomy.sunrise)} · {formatClock(astronomy.sunset)}</Text>
          <Text style={styles.skyHelp}>
            {t.altitude} {astronomy.sunAltitude.toFixed(1)}° · az {astronomy.sunAzimuth.toFixed(1)}°
          </Text>
        </View>
        <View style={[styles.skyCell, styles.moonCell]}>
          <View style={styles.flex}>
            <Label>{t.moon}</Label>
            <Text style={styles.skyTime}>{formatClock(astronomy.moonrise)} · {formatClock(astronomy.moonset)}</Text>
            <Text style={styles.skyHelp}>{astronomy.moonAge.toFixed(1)} {t.days}</Text>
          </View>
          <MoonDisc size={24} phase={astronomy.moonPhase} />
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------- day screen */

function DayScreen({
  language, date, index, onIndex,
}: {
  language: Language; date: Date; index: number; onIndex: (value: number) => void;
}) {
  const t = copy[language];
  const events = turnEvents(date);
  const last = FORECAST_DAYS - 1;
  return (
    <View>
      <View style={styles.daySwitch}>
        <Pressable
          accessibilityLabel={language === 'el' ? 'Προηγούμενη ημέρα' : 'Previous day'}
          accessibilityRole="button"
          accessibilityState={{ disabled: index === 0 }}
          disabled={index === 0}
          onPress={() => onIndex(index - 1)}
          style={[styles.dayArrow, index === 0 && styles.disabled]}
        >
          <Text style={styles.dayArrowText}>‹</Text>
        </Pressable>
        <View style={styles.dayCenter}>
          <Text style={styles.dayTitle}>{dayName(date, language, index)}</Text>
          <Text style={styles.dayDate}>{formatDate(date)}</Text>
        </View>
        <Pressable
          accessibilityLabel={language === 'el' ? 'Επόμενη ημέρα' : 'Next day'}
          accessibilityRole="button"
          accessibilityState={{ disabled: index === last }}
          disabled={index === last}
          onPress={() => onIndex(index + 1)}
          style={[styles.dayArrow, index === last && styles.disabled]}
        >
          <Text style={styles.dayArrowText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.curveBlock}>
        <Label style={styles.curveHead}>{t.curve}</Label>
        <CurrentChart date={date} irregularLabel={t.irregular} />
      </View>

      <View style={styles.listHead}><Label>{t.changes}</Label></View>
      {events.length === 0 ? (
        <View style={styles.listRow}><Text style={styles.notice}>{t.irregularHelp}</Text></View>
      ) : events.map((event) => {
        const toNorth = event.direction === 'north';
        const color = toNorth ? NORTH : SOUTH;
        return (
          <View key={`${event.minute}-${event.direction}`} style={styles.changeRow}>
            <Text style={[styles.changeTime, { color }]}>{formatMinute(event.minute)}</Text>
            <View style={styles.flex}>
              <Text style={styles.changeLabel}>{toNorth ? t.turnsNorth : t.turnsSouth}</Text>
              <Text style={styles.changeSub}>
                {formatMinute(event.minute - 2)} – {formatMinute(event.minute)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------- forecast screen */

function ForecastScreen({ language, baseDate }: { language: Language; baseDate: Date }) {
  const t = copy[language];
  return (
    <View>
      <View style={styles.noteBand}><Text style={styles.noteText}>{t.forecastNote}</Text></View>
      {Array.from({ length: FORECAST_DAYS }, (_, index) => {
        const date = addDays(baseDate, index);
        const turns = turnMinutes(date);
        return (
          <View key={date.toISOString()} style={styles.forecastRow}>
            <View style={styles.headRow}>
              <View style={styles.forecastTitle}>
                <Text style={styles.forecastDay}>{dayName(date, language, index)}</Text>
                <Text style={styles.forecastDate}>{formatDate(date, true)}</Text>
              </View>
              <Text style={styles.forecastMoon}>
                {language === 'el' ? 'σελ.' : 'lunar'} {lunarDay(date)}
              </Text>
            </View>
            <View style={styles.spark}>
              <CurrentChart date={date} mini irregularLabel={t.irregular} />
            </View>
            <View style={styles.forecastTimes}>
              {turns.length === 0
                ? <Text style={styles.forecastIrregular}>{t.irregular}</Text>
                : turns.map((turn) => <Text key={turn} style={styles.forecastTime}>{formatMinute(turn)}</Text>)}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------- map screen */

function MapScreen({ language, date, minute }: { language: Language; date: Date; minute: number }) {
  const t = copy[language];
  const prediction = currentPrediction(date, minute);
  const astronomy = useMemo(() => astronomySnapshot(date, minute), [date, minute]);
  const phaseDates = useMemo(() => upcomingMoonPhases(astronomy.moment), [astronomy.moment]);
  const north = prediction.direction === 'north' ? true : prediction.direction === 'south' ? false : null;
  const mapNote = prediction.direction === 'irregular' ? t.irregularHelp
    : prediction.direction === 'slack' ? t.slackHelp : t.straitNote;

  return (
    <View>
      <View style={styles.mapHead}>
        <Label>{t.strait}</Label>
        <Text style={styles.mapSource}>OPENSTREETMAP</Text>
      </View>
      <Pressable
        accessibilityHint={t.sourceHint}
        accessibilityLabel={language === 'el' ? 'Χάρτης παλιάς γέφυρας Χαλκίδας' : 'Old Chalkida bridge map'}
        accessibilityRole="link"
        onPress={() => openExternal('https://www.openstreetmap.org/?mlat=38.4644&mlon=23.5936#map=15/38.4644/23.5936')}
        style={({ pressed }) => [styles.mapFrame, pressed && styles.pressed]}
      >
        <StraitMap
          label={language === 'el' ? 'Χάρτης της παλιάς γέφυρας της Χαλκίδας' : 'Map of the old Chalkida bridge'}
          north={north}
        />
      </Pressable>
      <View style={styles.noteBandPlain}><Text style={styles.noteText}>{mapNote}</Text></View>

      <View style={styles.dialBlock}>
        <Label>{t.dial}</Label>
        <View style={styles.dial}><SkyDial moonAzimuth={astronomy.moonAzimuth} sunAzimuth={astronomy.sunAzimuth} /></View>
        <View style={styles.dialLegend}>
          <View style={styles.legendInline}>
            <View style={[styles.legendMark, { backgroundColor: ACCENT }]} />
            <Text style={styles.dialLegendText}>{t.sun} {astronomy.sunAzimuth.toFixed(1)}°</Text>
          </View>
          <View style={styles.legendInline}>
            <View style={[styles.legendMark, { backgroundColor: NAVY }]} />
            <Text style={styles.dialLegendText}>{t.moon} {astronomy.moonAzimuth.toFixed(1)}°</Text>
          </View>
        </View>
      </View>

      <View style={styles.phasesHead}>
        <Label>{t.phases}</Label>
        <MoonDisc size={38} phase={astronomy.moonPhase} />
      </View>
      {t.phaseNames.map((name, index) => (
        <View key={`${name}-${index}`} style={styles.phaseRow}>
          <MoonDisc size={18} phase={[0, 0.25, 0.5, 0.75, 0][index]} />
          <Text style={styles.phaseName}>{name}</Text>
          <Text style={styles.phaseWhen}>
            {phaseDates[index] ? formatEventDate(phaseDates[index]) : '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ---------------------------------------------------------- alerts screen */

function AlertsScreen({ language }: { language: Language }) {
  const t = copy[language];
  const [enabled, setEnabled] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [status, setStatus] = useState<NotificationSyncStatus>('idle');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadNotificationSettings().then(async (settings) => {
      if (!active) return;
      setEnabled(settings);
      if (!settings.some(Boolean)) return;
      const result = await syncNotificationSettings(settings, language);
      if (active) {
        setStatus(result.status);
        setScheduledCount(result.count);
      }
    });
    return () => { active = false; };
  }, [language]);

  const toggle = async (index: number) => {
    const next = enabled.map((value, item) => (item === index ? !value : value)) as NotificationSettings;
    setEnabled(next);
    setBusy(true);
    const result = await syncNotificationSettings(next, language);
    setStatus(result.status);
    setScheduledCount(result.count);
    setBusy(false);
  };

  const statusText = status === 'scheduled' ? `${scheduledCount} ${t.notificationsScheduled}`
    : status === 'denied' ? t.notificationsDenied
      : status === 'unsupported' ? t.notificationsUnsupported
        : status === 'error' ? t.notificationsError : null;
  const problem = status === 'denied' || status === 'error';

  return (
    <View>
      <View style={styles.noteBand}><Text style={styles.noteText}>{t.alertsNote}</Text></View>
      {statusText ? (
        <Text
          accessibilityRole={problem ? 'alert' : undefined}
          style={[styles.alertStatus, problem && styles.alertStatusProblem]}
        >
          {statusText}
        </Text>
      ) : null}
      {t.alerts.map((alert, index) => (
        <View key={alert[0]} style={styles.alertRow}>
          <View style={styles.flex}>
            <Text style={styles.alertTitle}>{alert[0]}</Text>
            <Text style={styles.alertDetail}>{alert[1]}</Text>
          </View>
          <Toggle
            disabled={busy || status === 'unsupported'}
            hint={alert[1]}
            label={alert[0]}
            onToggle={() => { void toggle(index); }}
            value={enabled[index]}
          />
        </View>
      ))}
    </View>
  );
}

/* ----------------------------------------------------------- guide screen */

function GuideScreen({ language }: { language: Language }) {
  const t = copy[language];
  const reliability: [string, string, string][] = [
    [NORTH, t.reliabilityAstronomy, t.reliabilityAstronomyHelp],
    [ACCENT, t.reliabilityRegular, t.reliabilityRegularHelp],
    [SOUTH, t.reliabilityIrregular, t.reliabilityIrregularHelp],
  ];
  const sources: [string, string][] = [
    [t.municipalitySource, DATA_SOURCES.municipality],
    [t.tableDocumentSource, DATA_SOURCES.currentTable],
    [t.astronomySource, DATA_SOURCES.astronomy],
  ];
  return (
    <View>
      <View style={styles.aboutBlock}>
        <Text style={styles.aboutTitle}>{t.aboutTitle}</Text>
        <Text style={styles.aboutText}>{t.about1}</Text>
        <Text style={styles.aboutText}>{t.about2}</Text>
        <Text style={styles.aboutText}>{t.about3}</Text>
      </View>

      <View style={styles.reliabilityBlock}>
        <Label>{t.reliabilityTitle.toUpperCase()}</Label>
        <Text style={styles.reliabilityIntro}>{t.reliabilityIntro}</Text>
        {reliability.map(([color, title, detail]) => (
          <View key={title} style={styles.reliabilityRow}>
            <View style={[styles.reliabilityMark, { backgroundColor: color }]} />
            <View style={styles.flex}>
              <Text style={styles.reliabilityName}>{title}</Text>
              <Text style={styles.reliabilityDetail}>{detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.listHead}><Label>{t.sources}</Label></View>
      {sources.map(([label, url]) => (
        <Pressable
          key={url}
          accessibilityHint={t.sourceHint}
          accessibilityLabel={label}
          accessibilityRole="link"
          onPress={() => openExternal(url)}
          style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}
        >
          <Text style={styles.sourceText}>{label}</Text>
          <Text style={styles.sourceArrow}>↗</Text>
        </Pressable>
      ))}

      <View style={styles.legendBlock}>
        <Label>{t.legend}</Label>
        {([[NORTH, t.legendN], [SOUTH, t.legendS], [ACCENT, t.legendY]] as const).map(([color, label]) => (
          <View key={label} style={styles.legendRow}>
            <View style={[styles.legendLine, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.disclaimer}>{t.disclaimer}</Text>
    </View>
  );
}

/* -------------------------------------------------------------- tab strip */

function BottomTabs({
  tab, language, bottomInset, onTab,
}: {
  tab: AppTab; language: Language; bottomInset: number; onTab: (tab: AppTab) => void;
}) {
  return (
    <View style={[styles.tabBar, { paddingBottom: bottomInset + 12 }]}>
      {TABS.map((item, index) => {
        const active = item === tab;
        return (
          <Pressable
            key={item}
            accessibilityLabel={copy[language].tabs[index]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onTab(item)}
            style={[styles.tabButton, active && styles.tabButtonActive]}
          >
            <TabIcon color={active ? ACCENT : SUBTLE} tab={item} />
            <Text numberOfLines={1} style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {copy[language].tabs[index]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------ picker sheet */

function DateTimePicker({
  visible, language, baseDate, dateIndex, selectedHour, onDate, onHour, onClose,
}: {
  visible: boolean; language: Language; baseDate: Date; dateIndex: number; selectedHour: number | null;
  onDate: (value: number) => void; onHour: (value: number | null) => void; onClose: () => void;
}) {
  const t = copy[language];
  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel={language === 'el' ? 'Κλείσιμο' : 'Close'}
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{t.pickerTitle}</Text>
            <Pressable accessibilityLabel={t.done} accessibilityRole="button" hitSlop={12} onPress={onClose}>
              <Text style={styles.sheetDone}>{t.done.toUpperCase()}</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.dayPicker}>
            {Array.from({ length: FORECAST_DAYS }, (_, index) => {
              const date = addDays(baseDate, index);
              const active = dateIndex === index;
              return (
                <Pressable
                  key={index}
                  accessibilityLabel={`${dayName(date, language, index)}, ${formatDate(date)}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onDate(index)}
                  style={[styles.pickerDay, active && styles.pickerDayActive]}
                >
                  <Text style={styles.pickerDayName}>{dayName(date, language, index)}</Text>
                  <Text style={styles.pickerDayDate}>{formatDate(date)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.hourBlock}>
            <View style={styles.hourHead}>
              <Label>{t.hour}</Label>
              <Pressable
                accessibilityLabel={t.live}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedHour == null }}
                onPress={() => onHour(null)}
              >
                <Text style={[styles.liveChoice, selectedHour == null && styles.liveChoiceActive]}>{t.live}</Text>
              </Pressable>
            </View>
            {chunk(HOURS, 4).map((row) => (
              <View key={row[0]} style={styles.hourRow}>
                {row.map((hour) => {
                  const active = selectedHour === hour;
                  return (
                    <Pressable
                      key={hour}
                      accessibilityLabel={`${String(hour).padStart(2, '0')}:00`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => onHour(hour)}
                      style={[styles.hourChip, active && styles.hourChipActive]}
                    >
                      <Text style={[styles.hourChipText, active && styles.hourChipTextActive]}>
                        {String(hour).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ shell */

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const t = copy.el;
  return (
    <SafeAreaView style={styles.errorRoot}>
      <View accessibilityRole="alert" style={styles.errorCard}>
        <Text style={styles.errorMark}>!</Text>
        <Text style={styles.errorTitle}>{t.errorTitle}</Text>
        <Text style={styles.errorBody}>{t.errorBody}</Text>
        <Pressable
          accessibilityLabel={t.retry}
          accessibilityRole="button"
          onPress={() => void retry()}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>{t.retry.toUpperCase()}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function EvriposApp() {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => new Date());
  const [language, setLanguage] = useState<Language>('el');
  const [tab, setTab] = useState<AppTab>('now');
  const [dateIndex, setDateIndex] = useState(0);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const baseDate = useMemo(() => startOfDay(now), [now]);
  const selectedDate = useMemo(() => addDays(baseDate, dateIndex), [baseDate, dateIndex]);
  const minute = selectedHour == null ? athensMinute(now) : selectedHour * 60;
  const live = dateIndex === 0 && selectedHour == null;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    // Timers are throttled or suspended while the app is backgrounded, so the clock is
    // also re-read the moment it comes forward rather than waiting out the interval.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    const resync = () => {
      loadNotificationSettings().then((settings) => {
        if (settings.some(Boolean)) syncNotificationSettings(settings, language);
      });
    };
    resync();
    // Only a finite window of reversals can be queued with the OS, so the window is
    // rolled forward on every foreground rather than only on a cold start.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') resync();
    });
    return () => subscription.remove();
  }, [language]);

  let content: ReactNode;
  if (tab === 'now') {
    content = (
      <NowScreen
        date={selectedDate}
        language={language}
        live={live}
        minute={minute}
        onOpenMap={() => setTab('map')}
      />
    );
  } else if (tab === 'day') {
    content = <DayScreen date={selectedDate} index={dateIndex} language={language} onIndex={setDateIndex} />;
  } else if (tab === 'forecast') {
    content = <ForecastScreen baseDate={baseDate} language={language} />;
  } else if (tab === 'map') {
    content = <MapScreen date={selectedDate} language={language} minute={minute} />;
  } else if (tab === 'alerts') {
    content = <AlertsScreen language={language} />;
  } else {
    content = <GuideScreen language={language} />;
  }

  return (
    <View style={styles.root}>
      <Header
        language={language}
        live={live}
        minute={minute}
        onLanguage={setLanguage}
        topInset={insets.top}
      />
      <DateBar date={selectedDate} language={language} minute={minute} onPress={() => setPickerOpen(true)} />
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {content}
      </ScrollView>
      <BottomTabs bottomInset={insets.bottom} language={language} onTab={setTab} tab={tab} />
      <DateTimePicker
        baseDate={baseDate}
        dateIndex={dateIndex}
        language={language}
        onClose={() => setPickerOpen(false)}
        onDate={setDateIndex}
        onHour={setSelectedHour}
        selectedHour={selectedHour}
        visible={pickerOpen}
      />
    </View>
  );
}

/* ----------------------------------------------------------------- styles */

const HAIR = StyleSheet.hairlineWidth * 2;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  flex: { flex: 1, minWidth: 0 },
  scroll: { flex: 1 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.3 },
  ruleTop: { borderTopWidth: HAIR, borderTopColor: RULE },

  header: { backgroundColor: NAVY, paddingHorizontal: GUTTER, paddingBottom: 16 },
  headerEyebrow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerClock: { ...TNUM, color: ON_NAVY_DIM, fontFamily: SANS, fontSize: 10, fontWeight: '600', letterSpacing: 1.4 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBrandText: { color: ON_NAVY_DIM, fontFamily: SANS, fontSize: 10, fontWeight: '600', letterSpacing: 1.4 },
  liveMark: { width: 5, height: 5, backgroundColor: ACCENT },
  headerMain: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  title: { color: ON_NAVY, fontFamily: SERIF, fontSize: 30, lineHeight: 31, letterSpacing: -0.3 },
  coordinates: { color: ON_NAVY_FAINT, fontFamily: SANS, fontSize: 10, letterSpacing: 1, marginTop: 8 },
  languageSwitch: { flexDirection: 'row', borderWidth: 1, borderColor: ON_NAVY_LINE },
  languageChip: { paddingVertical: 6, paddingHorizontal: 11 },
  languageChipActive: { backgroundColor: BAND },
  languageText: { color: ON_NAVY_IDLE, fontFamily: SANS, fontSize: 10.5, fontWeight: '600', letterSpacing: 1.05 },
  languageTextActive: { color: NAVY },

  dateBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingHorizontal: GUTTER, paddingVertical: 11, backgroundColor: BAND,
    borderBottomWidth: HAIR, borderBottomColor: RULE,
  },
  dateBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  dateBarMark: { width: 7, height: 7, backgroundColor: ACCENT },
  dateBarText: { ...TNUM, color: INK, fontFamily: SANS, fontSize: 12, fontWeight: '600', letterSpacing: 0.24 },
  dateBarChange: { color: NAVY, fontFamily: SANS, fontSize: 9, fontWeight: '600', letterSpacing: 1.44 },

  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  leadBlock: { paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 16 },
  liveState: { color: ACCENT, fontFamily: SANS, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.52 },
  liveStatePicked: { ...TNUM, color: SUBTLE },
  direction: { fontFamily: SERIF, fontSize: 42, lineHeight: 44, letterSpacing: -0.84, marginTop: 12 },
  directionHelp: { color: MUTED, fontFamily: SANS, fontSize: 13, lineHeight: 20, marginTop: 8 },

  straitBlock: { borderTopWidth: HAIR, borderBottomWidth: HAIR, borderColor: RULE },
  straitBadge: { position: 'absolute', right: 12, bottom: 10, backgroundColor: 'rgba(251,248,242,0.82)', paddingHorizontal: 6, paddingVertical: 4 },
  straitBadgeText: { color: NAVY, fontFamily: SANS, fontSize: 8.5, fontWeight: '600', letterSpacing: 1.19 },

  statRow: { flexDirection: 'row' },
  cellDivider: { borderRightWidth: HAIR, borderRightColor: RULE },
  confidenceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: GUTTER, paddingVertical: 12, borderTopWidth: HAIR, borderTopColor: RULE,
  },
  confidenceValue: { flex: 1, minWidth: 0, textAlign: 'right', fontFamily: SANS, fontSize: 9, lineHeight: 13, fontWeight: '600', letterSpacing: 0.72 },

  nextBlock: { paddingHorizontal: GUTTER, paddingVertical: 18, backgroundColor: BAND, borderTopWidth: HAIR, borderTopColor: RULE },
  nextWindow: { ...TNUM, color: NAVY, fontFamily: SANS, fontSize: 11, fontWeight: '600' },
  countdownRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 6 },
  countdown: { ...TNUM, color: INK, fontFamily: SERIF, fontSize: 52, lineHeight: 54, letterSpacing: -1.82 },
  countdownHelp: { flexShrink: 1, color: MUTED, fontFamily: SANS, fontSize: 12, lineHeight: 17 },
  progressTrack: { height: 2, backgroundColor: RULE, marginTop: 14 },
  progressFill: { height: 2, backgroundColor: ACCENT },
  progressAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  axisText: { ...TNUM, color: SUBTLE, fontFamily: SANS, fontSize: 10, fontWeight: '500', letterSpacing: 0.6 },
  notice: { color: MUTED, fontFamily: SANS, fontSize: 12, lineHeight: 19, marginTop: 8 },

  curveBlock: { paddingHorizontal: GUTTER, paddingTop: 18, paddingBottom: 12, borderTopWidth: HAIR, borderTopColor: RULE },
  curveHead: { marginBottom: 14 },

  skyCell: { flex: 1, minWidth: 0, paddingHorizontal: GUTTER, paddingVertical: 16 },
  moonCell: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  skyTime: { ...TNUM, color: INK, fontFamily: SERIF, fontSize: 20, lineHeight: 22, marginTop: 8 },
  skyHelp: { color: MUTED, fontFamily: SANS, fontSize: 11, marginTop: 6 },

  daySwitch: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12, backgroundColor: BAND,
    borderBottomWidth: HAIR, borderBottomColor: RULE,
  },
  dayArrow: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER, borderWidth: 1, borderColor: RULE },
  dayArrowText: { color: NAVY, fontFamily: SERIF, fontSize: 18, lineHeight: 22 },
  dayCenter: { alignItems: 'center' },
  dayTitle: { color: INK, fontFamily: SERIF, fontSize: 17, lineHeight: 19 },
  dayDate: { ...TNUM, color: MUTED, fontFamily: SANS, fontSize: 10, fontWeight: '500', letterSpacing: 1, marginTop: 5 },

  listHead: { paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 4, borderTopWidth: HAIR, borderTopColor: RULE, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listRow: { paddingHorizontal: GUTTER, paddingVertical: 14, borderTopWidth: HAIR, borderTopColor: RULE_SOFT },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: GUTTER, paddingVertical: 15, borderTopWidth: HAIR, borderTopColor: RULE_SOFT },
  changeTime: { ...TNUM, minWidth: 64, fontFamily: SERIF, fontSize: 26, lineHeight: 28, letterSpacing: -0.52 },
  changeLabel: { color: INK, fontFamily: SANS, fontSize: 12, fontWeight: '600' },
  changeSub: { ...TNUM, color: SUBTLE, fontFamily: SANS, fontSize: 10.5, marginTop: 4 },

  noteBand: { paddingHorizontal: GUTTER, paddingVertical: 16, backgroundColor: BAND, borderBottomWidth: HAIR, borderBottomColor: RULE },
  noteBandPlain: { paddingHorizontal: GUTTER, paddingVertical: 14, borderBottomWidth: HAIR, borderBottomColor: RULE },
  noteText: { color: MUTED, fontFamily: SANS, fontSize: 12, lineHeight: 19 },

  forecastRow: { paddingHorizontal: GUTTER, paddingVertical: 16, borderBottomWidth: HAIR, borderBottomColor: RULE_SOFT },
  forecastTitle: { flexDirection: 'row', alignItems: 'baseline', gap: 9, flexShrink: 1 },
  forecastDay: { color: INK, fontFamily: SERIF, fontSize: 17, lineHeight: 19 },
  forecastDate: { ...TNUM, color: SUBTLE, fontFamily: SANS, fontSize: 10, fontWeight: '500', letterSpacing: 0.8 },
  forecastMoon: { color: MUTED, fontFamily: SANS, fontSize: 10.5 },
  spark: { marginTop: 10 },
  forecastTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  forecastTime: { ...TNUM, color: MUTED, fontFamily: SANS, fontSize: 10.5, fontWeight: '500' },
  forecastIrregular: { color: ACCENT, fontFamily: SANS, fontSize: 10, fontWeight: '600', letterSpacing: 1.6 },

  mapHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 12 },
  mapSource: { color: SUBTLE, fontFamily: SANS, fontSize: 9.5, fontWeight: '500', letterSpacing: 0.95 },
  mapFrame: { borderTopWidth: HAIR, borderBottomWidth: HAIR, borderColor: RULE },

  dialBlock: { paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 18, borderBottomWidth: HAIR, borderBottomColor: RULE },
  dial: { alignItems: 'center', paddingTop: 18, paddingBottom: 12 },
  dialLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  legendInline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendMark: { width: 7, height: 7 },
  dialLegendText: { color: MUTED, fontFamily: SANS, fontSize: 10.5, fontWeight: '500' },

  phasesHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 8 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingVertical: 12, borderTopWidth: HAIR, borderTopColor: RULE_SOFT },
  phaseName: { flex: 1, color: INK, fontFamily: SANS, fontSize: 12.5 },
  phaseWhen: { ...TNUM, color: MUTED, fontFamily: SANS, fontSize: 10.5, fontWeight: '500' },

  alertStatus: { color: NORTH, fontFamily: SANS, fontSize: 10, lineHeight: 16, paddingHorizontal: GUTTER, paddingTop: 12 },
  alertStatusProblem: { color: ACCENT },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: GUTTER, paddingVertical: 16, borderBottomWidth: HAIR, borderBottomColor: RULE_SOFT },
  alertTitle: { color: INK, fontFamily: SANS, fontSize: 12.5, fontWeight: '600' },
  alertDetail: { color: SUBTLE, fontFamily: SANS, fontSize: 11, lineHeight: 16, marginTop: 4 },

  aboutBlock: { paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 18, borderBottomWidth: HAIR, borderBottomColor: RULE },
  aboutTitle: { color: INK, fontFamily: SERIF, fontSize: 22, lineHeight: 28 },
  aboutText: { color: BODY, fontFamily: SANS, fontSize: 12.5, lineHeight: 22, marginTop: 12 },

  reliabilityBlock: { paddingHorizontal: GUTTER, paddingTop: 18, paddingBottom: 8, backgroundColor: BAND, borderBottomWidth: HAIR, borderBottomColor: RULE },
  reliabilityIntro: { color: BODY, fontFamily: SANS, fontSize: 12, lineHeight: 19, marginTop: 12 },
  reliabilityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 14 },
  reliabilityMark: { width: 7, height: 7, marginTop: 5 },
  reliabilityName: { color: INK, fontFamily: SANS, fontSize: 11.5, lineHeight: 16, fontWeight: '600' },
  reliabilityDetail: { color: SUBTLE, fontFamily: SANS, fontSize: 10.5, lineHeight: 16, marginTop: 3 },

  sourceRow: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: GUTTER, borderTopWidth: HAIR, borderTopColor: RULE_SOFT,
  },
  sourceText: { flex: 1, color: NAVY, fontFamily: SANS, fontSize: 11.5, lineHeight: 16, fontWeight: '600' },
  sourceArrow: { color: ACCENT, fontSize: 15 },

  legendBlock: { paddingHorizontal: GUTTER, paddingTop: 18, paddingBottom: 18, backgroundColor: BAND, borderTopWidth: HAIR, borderBottomWidth: HAIR, borderColor: RULE, marginTop: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  legendLine: { width: 22, height: 3 },
  legendText: { flex: 1, color: BODY, fontFamily: SANS, fontSize: 11.5, lineHeight: 16 },
  disclaimer: { color: SUBTLE, fontFamily: SANS, fontSize: 10.5, lineHeight: 18, textAlign: 'center', paddingHorizontal: 26, paddingTop: 16, paddingBottom: 20 },

  tabBar: { flexDirection: 'row', backgroundColor: BAND, borderTopWidth: HAIR, borderTopColor: RULE, paddingHorizontal: 6 },
  tabButton: {
    flex: 1, minWidth: 0, alignItems: 'center', gap: 5, paddingTop: 11, paddingBottom: 12,
    borderTopWidth: 2, borderTopColor: 'transparent', marginTop: -1,
  },
  tabButtonActive: { borderTopColor: ACCENT },
  tabLabel: { maxWidth: '100%', color: SUBTLE, fontFamily: SANS, fontSize: 9.5, fontWeight: '600', letterSpacing: 0.76 },
  tabLabelActive: { color: INK },

  modalRoot: { flex: 1, backgroundColor: SCRIM, justifyContent: 'flex-end' },
  sheet: { backgroundColor: PAPER, borderTopWidth: 2, borderTopColor: NAVY, paddingBottom: 22 },
  sheetHead: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: HAIR, borderBottomColor: RULE,
  },
  sheetTitle: { color: INK, fontFamily: SERIF, fontSize: 18, lineHeight: 22 },
  sheetDone: { color: ACCENT, fontFamily: SANS, fontSize: 11, fontWeight: '600', letterSpacing: 1.54, paddingVertical: 4 },
  dayPicker: { maxHeight: 224 },
  pickerDay: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: GUTTER, paddingVertical: 13,
    borderBottomWidth: HAIR, borderBottomColor: RULE_SOFT,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  pickerDayActive: { backgroundColor: BAND, borderLeftColor: ACCENT },
  pickerDayName: { color: INK, fontFamily: SERIF, fontSize: 15, lineHeight: 18 },
  pickerDayDate: { ...TNUM, color: MUTED, fontFamily: SANS, fontSize: 10.5, fontWeight: '500', letterSpacing: 0.84 },
  hourBlock: { paddingHorizontal: GUTTER, paddingTop: 16, borderTopWidth: HAIR, borderTopColor: RULE },
  hourHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveChoice: { color: MUTED, fontFamily: SANS, fontSize: 10, fontWeight: '600', letterSpacing: 1.2, paddingVertical: 4 },
  liveChoiceActive: { color: ACCENT },
  hourRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  hourChip: { flex: 1, alignItems: 'center', paddingVertical: 14, borderWidth: 1, borderColor: RULE },
  hourChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  hourChipText: { ...TNUM, color: INK, fontFamily: SANS, fontSize: 13, fontWeight: '600' },
  hourChipTextActive: { color: PAPER },

  errorRoot: { flex: 1, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorCard: { width: '100%', maxWidth: 420, padding: 24, backgroundColor: BAND, borderTopWidth: 2, borderTopColor: ACCENT, alignItems: 'center' },
  errorMark: { width: 40, height: 40, textAlign: 'center', color: PAPER, backgroundColor: ACCENT, fontFamily: SERIF, fontSize: 24, lineHeight: 40 },
  errorTitle: { color: INK, fontFamily: SERIF, fontSize: 22, lineHeight: 28, textAlign: 'center', marginTop: 16 },
  errorBody: { color: BODY, fontFamily: SANS, fontSize: 12.5, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  retryButton: { minHeight: 44, marginTop: 18, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: NAVY },
  retryText: { color: PAPER, fontFamily: SANS, fontSize: 11, fontWeight: '600', letterSpacing: 1.54 },
});

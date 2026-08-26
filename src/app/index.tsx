import { LinearGradient } from 'expo-linear-gradient';
import { type ErrorBoundaryProps } from 'expo-router';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Animated, Easing, Image, Linking, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Switch, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle, Defs, G, Line, LinearGradient as SvgLinearGradient, Path,
  Polygon, Stop, Text as SvgText,
} from 'react-native-svg';

import {
  addDays, AppTab, astronomySnapshot, athensMinute, copy, currentPrediction, currentTimelineEvents,
  currentValueFromEvents, DATA_SOURCES, dayName, formatClock, formatDate, formatEventDate, formatMinute, GOLD,
  Language, lunarDay, nextTurnInfo, NORTH, SOUTH, startOfDay, turnEvents,
  turnMinutes, upcomingMoonPhases,
} from '@/features/evripos-model';
import {
  DEFAULT_NOTIFICATION_SETTINGS, loadNotificationSettings, NotificationSettings,
  NotificationSyncStatus, syncNotificationSettings,
} from '@/features/notification-service';

const BG = '#061219';
const NAV_BG = '#041017';
const CARD = '#0B1C25';
const CARD_TOP = '#0E232F';
const BORDER = 'rgba(255,255,255,0.075)';
const TEXT = '#E8F0F3';
const MUTED = '#7F97A3';
const DIM = '#5F7784';
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const SANS = Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'system-ui' });
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20];

function SectionLabel({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function openExternal(url: string) {
  void Linking.openURL(url).catch(() => undefined);
}

function ReliabilityRow({ color, title, detail }: { color: string; title: string; detail: string }) {
  return (
    <View style={styles.reliabilityRow}>
      <View style={[styles.reliabilityDot, { backgroundColor: color }]} />
      <View style={styles.flex}><Text style={styles.reliabilityName}>{title}</Text><Text style={styles.reliabilityDetail}>{detail}</Text></View>
    </View>
  );
}

function CurrentChart({ date, minute, mini = false, irregularLabel }: { date: Date; minute?: number; mini?: boolean; irregularLabel: string }) {
  const width = 326;
  const height = mini ? 40 : 138;
  const center = mini ? 20 : 67;
  const amplitude = mini ? 14 : 47;
  const events = turnEvents(date);
  const timeline = currentTimelineEvents(date);
  const points: string[] = [];
  for (let value = 0; value <= 1440; value += mini ? 16 : 8) {
    const current = currentValueFromEvents(value, timeline);
    if (Number.isFinite(current)) points.push(`${((value / 1440) * width).toFixed(1)},${(center - current * amplitude).toFixed(1)}`);
  }
  if (points.length === 0) return <View style={[styles.irregularChart, { height }]}><Text style={styles.irregularChartText}>{irregularLabel}</Text></View>;
  const line = `M${points.join(' L')}`;
  const area = `${line} L${width},${center} L0,${center} Z`;
  const markerX = minute == null ? null : (minute / 1440) * width;
  const markerValue = minute == null ? null : currentValueFromEvents(minute, timeline);
  const markerY = markerValue == null || !Number.isFinite(markerValue) ? null : center - markerValue * amplitude;
  const turns = events.map((event) => event.minute);
  const gradientId = `curve-${date.getTime()}-${mini ? 'mini' : 'full'}`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={NORTH} stopOpacity="0.52" />
          <Stop offset="0.49" stopColor={NORTH} stopOpacity="0.06" />
          <Stop offset="0.51" stopColor={SOUTH} stopOpacity="0.06" />
          <Stop offset="1" stopColor={SOUTH} stopOpacity="0.48" />
        </SvgLinearGradient>
      </Defs>
      <Line x1="0" y1={center} x2={width} y2={center} stroke="#24404D" strokeWidth="1" />
      <Path d={area} fill={`url(#${gradientId})`} />
      <Path d={line} fill="none" stroke="#CFE0E7" strokeWidth={mini ? 1.25 : 1.7} />
      {!mini && turns.map((turn) => {
        const x = (turn / 1440) * width;
        return (
          <G key={turn}>
            <Line x1={x} y1="12" x2={x} y2="119" stroke={GOLD} strokeWidth="1" strokeDasharray="2 4" opacity="0.55" />
            <SvgText x={Math.min(Math.max(x, 17), width - 17)} y="136" fill={MUTED} fontSize="8.5" textAnchor="middle">{formatMinute(turn)}</SvgText>
          </G>
        );
      })}
      {markerX != null && markerY != null && !mini ? (
        <G>
          <Line x1={markerX} y1="0" x2={markerX} y2="121" stroke={GOLD} strokeWidth="1.5" />
          <Circle cx={markerX} cy={markerY} r="5" fill={GOLD} stroke={BG} strokeWidth="2" />
        </G>
      ) : null}
      {!mini ? <><SvgText x="2" y="11" fill={NORTH} fontSize="9" fontWeight="700">N</SvgText><SvgText x="2" y="119" fill={SOUTH} fontSize="9" fontWeight="700">S</SvgText></> : null}
    </Svg>
  );
}

function FlowLanes({ north, strength }: { north: boolean; strength: number }) {
  const [motion] = useState(() => new Animated.Value(0));
  useEffect(() => {
    motion.setValue(0);
    const loop = Animated.loop(Animated.timing(motion, {
      toValue: 1,
      duration: Math.max(1150, 2450 - strength * 1100),
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web',
    }));
    loop.start();
    return () => loop.stop();
  }, [motion, strength]);
  const translateX = motion.interpolate({ inputRange: [0, 1], outputRange: north ? [-42, 0] : [0, -42] });
  const color = north ? NORTH : SOUTH;
  return (
    <View style={styles.lanes}>
      {[0, 1, 2, 3, 4].map((row) => (
        <Animated.View key={row} style={[styles.laneRow, { top: 8 + row * 13, opacity: 0.33 + (row % 2) * 0.28, transform: [{ translateX }] }]}>
          {Array.from({ length: 20 }, (_, index) => <View key={index} style={{ width: 15 + (index % 3) * 6, height: 2, borderRadius: 2, backgroundColor: color }} />)}
        </Animated.View>
      ))}
      <Text style={[styles.laneDirection, { color }]}>{north ? 'N  ↑' : 'S  ↓'}</Text>
    </View>
  );
}

function moonLightPath(size: number, rawPhase: number) {
  const phase = ((rawPhase % 1) + 1) % 1;
  const radius = size / 2 - 1;
  const center = size / 2;
  const steps = 32;
  const points: [number, number][] = [];
  const chord = (index: number) => {
    const y = -radius + (2 * radius * index) / steps;
    return { y, x: Math.sqrt(Math.max(0, radius * radius - y * y)) };
  };
  if (phase <= 0.5) {
    for (let index = 0; index <= steps; index += 1) {
      const { x, y } = chord(index);
      points.push([center + x, center + y]);
    }
    for (let index = steps; index >= 0; index -= 1) {
      const { x, y } = chord(index);
      points.push([center + Math.cos(phase * Math.PI * 2) * x, center + y]);
    }
  } else {
    for (let index = 0; index <= steps; index += 1) {
      const { x, y } = chord(index);
      points.push([center - x, center + y]);
    }
    for (let index = steps; index >= 0; index -= 1) {
      const { x, y } = chord(index);
      points.push([center - Math.cos(phase * Math.PI * 2) * x, center + y]);
    }
  }
  return `M${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L')} Z`;
}

function MoonDisc({ size = 30, phase = 0 }: { size?: number; phase?: number }) {
  return <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.moonDisc}>
    <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill="#16303C" />
    <Path d={moonLightPath(size, phase)} fill="#E7EEF1" />
    <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill="none" stroke="rgba(255,255,255,0.12)" />
  </Svg>;
}

const MAP_HEIGHT = 214;
const CHALKIDA_MAP = require('../../assets/images/chalkida-map.png');

function StraitMap({ north }: { north: boolean | null }) {
  const flow = north == null ? DIM : north ? NORTH : SOUTH;
  return (
    <View style={styles.osmMap}>
      <Image
        accessibilityLabel="Χάρτης της παλιάς γέφυρας της Χαλκίδας"
        resizeMode="cover"
        source={CHALKIDA_MAP}
        style={styles.staticMapImage}
      />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 354 214" preserveAspectRatio="none">
        <Path d="M123 45 C143 70 160 92 177 107 C193 128 210 156 231 188" fill="none" stroke={flow} strokeWidth="4" strokeDasharray="10 8" opacity={north == null ? 0.45 : 0.88} />
        {north == null ? null : [{ x: 145, y: 73, rotation: 135 }, { x: 208, y: 153, rotation: 135 }].map((arrow, index) => (
          <Polygon
            key={index}
            points="-7,-5 7,0 -7,5"
            fill={flow}
            transform={`translate(${arrow.x} ${arrow.y}) rotate(${north ? arrow.rotation : arrow.rotation + 180})`}
          />
        ))}
        <Circle cx="177" cy="107" r="8" fill={GOLD} />
      </Svg>
      <View style={[styles.mapAttribution, styles.noPointerEvents]}>
        <Text style={styles.mapAttributionText}>© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}

function SkyDial({ sunAzimuth, moonAzimuth }: { sunAzimuth: number; moonAzimuth: number }) {
  const point = (azimuth: number, radius: number) => {
    const angle = ((azimuth - 90) * Math.PI) / 180;
    return { x: 80 + 61 * Math.cos(angle), y: 80 + 61 * Math.sin(angle), radius };
  };
  const sun = point(sunAzimuth, 6);
  const moon = point(moonAzimuth, 5);
  return (
    <Svg width={160} height={160} viewBox="0 0 160 160">
      <Circle cx="80" cy="80" r="64" fill="none" stroke="#24404D" /><Circle cx="80" cy="80" r="44" fill="none" stroke="#1C3641" strokeDasharray="3 4" /><Line x1="80" y1="16" x2="80" y2="144" stroke="#17313C" /><Line x1="16" y1="80" x2="144" y2="80" stroke="#17313C" />
      <SvgText x="76" y="11" fill={MUTED} fontSize="9">N</SvgText><SvgText x="149" y="84" fill={MUTED} fontSize="9">E</SvgText><SvgText x="77" y="158" fill={MUTED} fontSize="9">S</SvgText><SvgText x="2" y="84" fill={MUTED} fontSize="9">W</SvgText>
      <Circle cx={sun.x} cy={sun.y} r={sun.radius} fill={GOLD} /><Circle cx={moon.x} cy={moon.y} r={moon.radius} fill="#E7EEF1" /><Circle cx="80" cy="80" r="3" fill="#36525E" />
    </Svg>
  );
}

function Header({ language, date, minute, onLanguage, onOpenPicker }: { language: Language; date: Date; minute: number; onLanguage: (value: Language) => void; onOpenPicker: () => void }) {
  const t = copy[language];
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerTitleWrap}><Text style={styles.title}>{t.title}</Text><Text style={styles.coordinates}>{t.coordinates}</Text></View>
        <View style={styles.languageSwitch}>{(['el', 'en'] as const).map((value) => <Pressable key={value} onPress={() => onLanguage(value)} style={[styles.languageChip, language === value && styles.languageChipActive]} accessibilityRole="button" accessibilityLabel={value === 'el' ? 'Ελληνικά' : 'English'} accessibilityState={{ selected: language === value }}><Text style={[styles.languageText, language === value && styles.languageTextActive]}>{value === 'el' ? 'ΕΛ' : 'EN'}</Text></Pressable>)}</View>
      </View>
      <Pressable onPress={onOpenPicker} style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${formatDate(date, language)}, ${formatMinute(minute)}`} accessibilityHint={language === 'el' ? 'Αλλαγή ημερομηνίας και ώρας' : 'Change date and time'}>
        <View style={styles.dateButtonLeft}><View style={styles.calendarIcon}><View style={styles.calendarTop} /></View><Text style={styles.dateButtonText}>{formatDate(date, language)}  ·  {formatMinute(minute)}</Text></View><Text style={styles.changeText}>{t.change}</Text>
      </Pressable>
    </View>
  );
}

function NowScreen({ language, date, minute, live }: { language: Language; date: Date; minute: number; live: boolean }) {
  const t = copy[language];
  const prediction = currentPrediction(date, minute);
  const astronomy = astronomySnapshot(date, minute);
  const irregular = prediction.direction === 'irregular';
  const slack = prediction.direction === 'slack';
  const unbounded = prediction.stage === 'unbounded';
  const north = prediction.direction === 'north';
  const cycleLevel = prediction.cycleLevel;
  const stageText = irregular ? t.irregular : slack ? t.slack : unbounded ? t.unboundedStage : prediction.stage === 'building' ? t.building : prediction.stage === 'peak' ? t.peakFlow : t.easing;
  const directionColor = irregular || slack ? GOLD : north ? NORTH : SOUTH;
  const directionTitle = irregular ? t.irregular : slack ? t.slack : north ? t.northward : t.southward;
  const directionHelp = irregular ? t.irregularHelp : slack ? t.slackHelp : north ? t.fromSouth : t.fromNorth;
  const next = nextTurnInfo(date, minute);
  const hours = next ? Math.floor(next.remaining / 60) : 0;
  const minutes = next ? Math.round(next.remaining % 60) : 0;
  return (
    <View style={styles.screenStack}>
      <LinearGradient colors={[CARD_TOP, '#0A1A23']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.flowCard, styles.cardBorder]}>
        <View style={styles.flowTop}><SectionLabel>{t.flowingNow}</SectionLabel><View style={styles.liveWrap}><View style={[styles.liveDot, { backgroundColor: live ? NORTH : GOLD }]} /><Text style={[styles.liveText, { color: live ? NORTH : GOLD }]}>{live ? t.calculated : formatMinute(minute)}</Text></View></View>
        <View style={styles.directionRow}><View style={[styles.arrowBox, { borderColor: `${directionColor}66`, backgroundColor: `${directionColor}18` }]}><Text style={[styles.arrow, { color: directionColor }]}>{irregular ? '?' : slack ? '•' : north ? '↑' : '↓'}</Text></View><View style={styles.flex}><Text style={[styles.directionTitle, { color: directionColor }]}>{directionTitle}</Text><Text style={styles.directionHelp}>{directionHelp}</Text></View></View>
        {irregular || slack || unbounded ? <View style={styles.irregularLanes}><Text style={styles.irregularLanesText}>{irregular ? t.irregularHelp : slack ? t.slackHelp : t.nextUnavailable}</Text></View> : <FlowLanes north={north} strength={cycleLevel} />}
        <View style={styles.metricRow}><View style={[styles.metric, styles.metricDivider]}><SectionLabel>{t.speed}</SectionLabel><View style={styles.metricValueRow}><Text style={[styles.metricValue, styles.metricTextValue, { color: GOLD }]}>{stageText}</Text></View></View><View style={styles.metric}><SectionLabel>{t.estimated}</SectionLabel><View style={styles.metricValueRow}><Text style={[styles.metricValue, styles.metricTextValue]}>{t.tableSource}</Text></View></View></View>
        <View style={styles.confidenceRow}><SectionLabel>{t.confidence}</SectionLabel><Text style={[styles.confidenceText, { color: irregular || unbounded ? GOLD : NORTH }]}>{irregular ? t.confidenceUnavailable : unbounded ? t.confidenceLimited : t.confidenceRegular}</Text></View>
      </LinearGradient>
      {next ? <Card style={styles.nextCard}><View style={styles.rowBetween}><SectionLabel>{t.nextChange}</SectionLabel><Text style={styles.goldMono}>{formatMinute(next.next - 2)} – {formatMinute(next.next)}</Text></View><View style={styles.countdownRow}><Text style={styles.countdown}>{hours}:{String(minutes).padStart(2, '0')}</Text><Text style={styles.countdownHelp}>{t.untilSlack}</Text></View><View style={styles.progressTrack}><LinearGradient colors={[NORTH, GOLD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${Math.round(next.progress * 100)}%` }]} /></View><View style={styles.rowBetween}><Text style={styles.axisText}>{formatMinute(next.previous)}</Text><Text style={styles.axisText}>{formatMinute(next.next)}</Text></View></Card> : <Card style={styles.nextCard}><SectionLabel>{t.nextChange}</SectionLabel><Text style={styles.irregularNotice}>{t.nextUnavailable}</Text></Card>}
      <Card style={styles.chartCard}><View style={[styles.rowBetween, styles.chartHeader]}><SectionLabel>{t.curve}</SectionLabel><Text style={styles.axisText}>{formatDate(date, language)} · {language === 'el' ? 'σελ. ημέρα' : 'lunar day'} {prediction.lunarDay}</Text></View><CurrentChart date={date} minute={minute} irregularLabel={t.irregular} /></Card>
      <View style={styles.twoColumns}><Card style={styles.smallCard}><SectionLabel>{t.sun}</SectionLabel><Text style={styles.skyTime}>{formatClock(astronomy.sunrise)} · {formatClock(astronomy.sunset)}</Text><Text style={styles.smallHelp}>{t.altitude} {astronomy.sunAltitude.toFixed(1)}° · az {astronomy.sunAzimuth.toFixed(1)}°</Text></Card><Card style={[styles.smallCard, styles.moonCard]}><View style={styles.flex}><SectionLabel>{t.moon}</SectionLabel><Text style={styles.skyTime}>{formatClock(astronomy.moonrise)} · {formatClock(astronomy.moonset)}</Text><Text style={styles.smallHelp}>{astronomy.moonAge.toFixed(1)} {t.days}</Text></View><MoonDisc size={27} phase={astronomy.moonPhase} /></Card></View>
    </View>
  );
}

function DayScreen({ language, date, index, onIndex }: { language: Language; date: Date; index: number; onIndex: (value: number) => void }) {
  const t = copy[language];
  const events = turnEvents(date);
  const timeline = currentTimelineEvents(date);
  return (
    <View style={styles.screenStack}>
      <Card style={styles.daySwitcher}><Pressable disabled={index === 0} onPress={() => onIndex(index - 1)} style={[styles.dayArrow, index === 0 && styles.disabled]} accessibilityRole="button" accessibilityLabel={language === 'el' ? 'Προηγούμενη ημέρα' : 'Previous day'} accessibilityState={{ disabled: index === 0 }}><Text style={styles.dayArrowText}>‹</Text></Pressable><View style={styles.dayCenter}><Text style={styles.dayTitle}>{dayName(date, language, index)}</Text><Text style={styles.axisText}>{formatDate(date, language)}</Text></View><Pressable disabled={index === 5} onPress={() => onIndex(index + 1)} style={[styles.dayArrow, index === 5 && styles.disabled]} accessibilityRole="button" accessibilityLabel={language === 'el' ? 'Επόμενη ημέρα' : 'Next day'} accessibilityState={{ disabled: index === 5 }}><Text style={styles.dayArrowText}>›</Text></Pressable></Card>
      <Card style={styles.chartCard}><SectionLabel style={styles.chartHeader}>{t.curve}</SectionLabel><CurrentChart date={date} irregularLabel={t.irregular} /></Card>
      <View><SectionLabel style={styles.listHeading}>{t.changes}</SectionLabel><View style={styles.changeList}>{events.length === 0 ? <Card style={styles.irregularCard}><Text style={styles.irregularNotice}>{t.irregularHelp}</Text></Card> : events.map((event) => {
        const turn = event.minute;
        const toNorth = event.direction === 'north';
        const color = toNorth ? NORTH : SOUTH;
        const nextEvent = timeline.find((candidate) => candidate.minute > turn);
        const midpoint = nextEvent ? turn + (nextEvent.minute - turn) / 2 : turn;
        return <Card key={`${turn}-${event.direction}`} style={styles.changeCard}><View style={[styles.changeBar, { backgroundColor: color }]} /><Text style={styles.changeTime}>{formatMinute(turn)}</Text><View style={styles.flex}><Text style={[styles.changeDirection, { color }]}>{toNorth ? t.turnsNorth : t.turnsSouth}</Text><Text style={styles.changeSub}>{formatMinute(turn - 2)} – {formatMinute(turn)} · {t.peak} ≈ {formatMinute(midpoint)}</Text></View></Card>;
      })}</View></View>
    </View>
  );
}

function ForecastScreen({ language, baseDate }: { language: Language; baseDate: Date }) {
  const t = copy[language];
  return (
    <View style={styles.screenStack}>
      <Text style={styles.forecastNote}>{t.forecastNote}</Text>
      {Array.from({ length: 6 }, (_, index) => {
        const date = addDays(baseDate, index);
        const turns = turnMinutes(date);
        return <Card key={date.toISOString()} style={styles.forecastCard}><View style={styles.rowBetween}><View style={styles.forecastTitleRow}><Text style={styles.forecastDay}>{dayName(date, language, index)}</Text><Text style={styles.axisText}>{formatDate(date, language, true)}</Text></View><Text style={styles.axisText}>{language === 'el' ? 'σελ.' : 'lunar'} {lunarDay(date)}</Text></View><View style={styles.miniChart}><CurrentChart date={date} mini irregularLabel={t.irregular} /></View><View style={styles.rowBetween}>{turns.length === 0 ? <Text style={styles.irregularForecast}>{t.irregular}</Text> : turns.map((turn) => <Text key={turn} style={styles.forecastTime}>{formatMinute(turn)}</Text>)}</View></Card>;
      })}
    </View>
  );
}

function SkyScreen({ language, date, minute }: { language: Language; date: Date; minute: number }) {
  const t = copy[language];
  const prediction = currentPrediction(date, minute);
  const astronomy = useMemo(() => astronomySnapshot(date, minute), [date, minute]);
  const phaseDates = useMemo(() => upcomingMoonPhases(astronomy.moment), [astronomy.moment]);
  const north = prediction.direction === 'north' ? true : prediction.direction === 'south' ? false : null;
  const mapNote = prediction.direction === 'irregular' ? t.irregularHelp : prediction.direction === 'slack' ? t.slackHelp : t.straitNote;
  return (
    <View style={styles.screenStack}>
      <Pressable onPress={() => openExternal('https://www.openstreetmap.org/?mlat=38.4644&mlon=23.5936#map=15/38.4644/23.5936')} style={({ pressed }) => pressed && styles.pressed} accessibilityRole="link" accessibilityLabel={language === 'el' ? 'Χάρτης παλιάς γέφυρας Χαλκίδας' : 'Old Chalkida bridge map'} accessibilityHint={t.sourceHint}><Card style={styles.mapCard}><View style={[styles.rowBetween, styles.mapHeader]}><SectionLabel>{t.strait}</SectionLabel><Text style={styles.mapSource}>OSM</Text></View><StraitMap north={north} /><Text style={styles.mapNote}>{mapNote}</Text></Card></Pressable>
      <Card style={styles.dialCard}><SectionLabel>{t.dial}</SectionLabel><View style={styles.dial}><SkyDial sunAzimuth={astronomy.sunAzimuth} moonAzimuth={astronomy.moonAzimuth} /></View><View style={styles.dialLegend}><View style={styles.legendInline}><View style={[styles.legendDot, { backgroundColor: GOLD }]} /><Text style={styles.dialLegendText}>{t.sun} {astronomy.sunAzimuth.toFixed(1)}°</Text></View><View style={styles.legendInline}><View style={[styles.legendDot, { backgroundColor: '#E7EEF1' }]} /><Text style={styles.dialLegendText}>{t.moon} {astronomy.moonAzimuth.toFixed(1)}°</Text></View></View></Card>
      <Card style={styles.phasesCard}><View style={styles.rowBetween}><SectionLabel>{t.phases}</SectionLabel><MoonDisc size={42} phase={astronomy.moonPhase} /></View><View style={styles.phaseList}>{t.phaseNames.map((name, index) => <View key={`${name}-${index}`} style={styles.phaseRow}><MoonDisc size={20} phase={[0, 0.25, 0.5, 0.75, 0][index]} /><Text style={styles.phaseName}>{name}</Text><Text style={styles.phaseWhen}>{phaseDates[index] ? formatEventDate(phaseDates[index], language) : '—'}</Text></View>)}</View></Card>
    </View>
  );
}

function GuideScreen({ language }: { language: Language }) {
  const t = copy[language];
  const [enabled, setEnabled] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [notificationStatus, setNotificationStatus] = useState<NotificationSyncStatus>('idle');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [notificationBusy, setNotificationBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadNotificationSettings().then(async (settings) => {
      if (!active) return;
      setEnabled(settings);
      if (!settings.some(Boolean)) return;
      const result = await syncNotificationSettings(settings, language);
      if (active) {
        setNotificationStatus(result.status);
        setScheduledCount(result.count);
      }
    });
    return () => { active = false; };
  }, [language]);

  const toggle = async (index: number) => {
    const next = enabled.map((value, item) => item === index ? !value : value) as NotificationSettings;
    setEnabled(next);
    setNotificationBusy(true);
    const result = await syncNotificationSettings(next, language);
    setNotificationStatus(result.status);
    setScheduledCount(result.count);
    setNotificationBusy(false);
  };
  const statusText = notificationStatus === 'scheduled'
    ? `${scheduledCount} ${t.notificationsScheduled}`
    : notificationStatus === 'denied' ? t.notificationsDenied
      : notificationStatus === 'unsupported' ? t.notificationsUnsupported
        : notificationStatus === 'error' ? t.notificationsError : null;
  return (
    <View style={styles.screenStack}>
      <View><SectionLabel style={styles.listHeading}>{t.notifications}</SectionLabel>{statusText ? <Text accessibilityRole={notificationStatus === 'error' || notificationStatus === 'denied' ? 'alert' : undefined} style={[styles.notificationStatus, notificationStatus === 'denied' || notificationStatus === 'error' ? styles.notificationStatusError : null]}>{statusText}</Text> : null}<View style={styles.changeList}>{t.alerts.map((alert, index) => <Card key={alert[0]} style={styles.alertCard}><View style={styles.flex}><Text style={styles.alertTitle}>{alert[0]}</Text><Text style={styles.alertDetail}>{alert[1]}</Text></View><Switch accessibilityLabel={alert[0]} accessibilityHint={alert[1]} disabled={notificationBusy || notificationStatus === 'unsupported'} value={enabled[index]} onValueChange={() => toggle(index)} trackColor={{ false: '#1C3641', true: NORTH }} thumbColor="#FFFFFF" ios_backgroundColor="#1C3641" /></Card>)}</View></View>
      <Card style={styles.aboutCard}><Text style={styles.aboutTitle}>{t.reliabilityTitle}</Text><Text style={styles.aboutText}>{t.reliabilityIntro}</Text><View style={styles.reliabilityList}><ReliabilityRow color={NORTH} title={t.reliabilityAstronomy} detail={t.reliabilityAstronomyHelp} /><ReliabilityRow color={GOLD} title={t.reliabilityRegular} detail={t.reliabilityRegularHelp} /><ReliabilityRow color={SOUTH} title={t.reliabilityIrregular} detail={t.reliabilityIrregularHelp} /></View></Card>
      <Card style={styles.aboutCard}><Text style={styles.aboutTitle}>{t.aboutTitle}</Text><Text style={styles.aboutText}>{t.about1}</Text><Text style={styles.aboutText}>{t.about2}</Text><Text style={styles.aboutText}>{t.about3}</Text></Card>
      <Card style={styles.sourcesCard}><SectionLabel>{t.sources}</SectionLabel><View style={styles.sourceList}>{[
        [t.municipalitySource, DATA_SOURCES.municipality],
        [t.tableDocumentSource, DATA_SOURCES.currentTable],
        [t.astronomySource, DATA_SOURCES.astronomy],
      ].map(([label, url]) => <Pressable key={url} onPress={() => openExternal(url)} style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]} accessibilityRole="link" accessibilityLabel={label} accessibilityHint={t.sourceHint}><Text style={styles.sourceLinkText}>{label}</Text><Text style={styles.sourceArrow}>↗</Text></Pressable>)}</View></Card>
      <Card style={styles.legendCard}><SectionLabel>{t.legend}</SectionLabel><View style={styles.legendList}>{[[NORTH, t.legendN], [SOUTH, t.legendS], [GOLD, t.legendY]].map(([color, label]) => <View key={label} style={styles.legendRow}><View style={[styles.legendLine, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>)}</View></Card>
      <Text style={styles.disclaimer}>{t.disclaimer}</Text>
    </View>
  );
}

function TabIcon({ tab, active }: { tab: AppTab; active: boolean }) {
  const color = active ? GOLD : DIM;
  if (tab === 'now') return <View style={[styles.circleIcon, { borderColor: color }]}><View style={[styles.circleIconDot, { backgroundColor: color }]} /></View>;
  if (tab === 'day') return <View style={styles.lineIcon}>{[16, 10, 16].map((width, i) => <View key={i} style={{ width, height: 2, borderRadius: 2, backgroundColor: color }} />)}</View>;
  if (tab === 'forecast') return <View style={styles.barIcon}>{[7, 13, 9, 16].map((height, i) => <View key={i} style={{ width: 2.5, height, borderRadius: 2, backgroundColor: color }} />)}</View>;
  if (tab === 'sky') return <View style={[styles.skyIcon, { borderColor: color }]}><View style={[styles.skyHalf, { backgroundColor: color }]} /></View>;
  return <View style={styles.dotsIcon}>{[0, 1, 2].map((item) => <View key={item} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />)}</View>;
}

function BottomTabs({ tab, language, onTab }: { tab: AppTab; language: Language; onTab: (tab: AppTab) => void }) {
  const tabs: AppTab[] = ['now', 'day', 'forecast', 'sky', 'guide'];
  return <View style={styles.bottomNav}>{tabs.map((item, index) => {
    const active = item === tab;
    return <Pressable key={item} onPress={() => onTab(item)} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]} accessibilityRole="tab" accessibilityLabel={copy[language].tabs[index]} accessibilityState={{ selected: active }}><TabIcon tab={item} active={active} /><Text numberOfLines={1} style={[styles.tabLabel, { color: active ? GOLD : DIM }]}>{copy[language].tabs[index]}</Text></Pressable>;
  })}</View>;
}

function DateTimePicker({ visible, language, baseDate, dateIndex, selectedHour, onDate, onHour, onClose }: { visible: boolean; language: Language; baseDate: Date; dateIndex: number; selectedHour: number | null; onDate: (value: number) => void; onHour: (value: number | null) => void; onClose: () => void }) {
  const t = copy[language];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={language === 'el' ? 'Κλείσιμο' : 'Close'} /><SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.sheetHandle} /><View style={styles.rowBetween}><Text style={styles.sheetTitle}>{t.pickerTitle}</Text><Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t.done}><Text style={styles.sheetDone}>{t.done}</Text></Pressable></View>
        <ScrollView style={styles.dayPicker} showsVerticalScrollIndicator={false}>{Array.from({ length: 6 }, (_, index) => {
          const date = addDays(baseDate, index);
          const active = dateIndex === index;
          return <Pressable key={index} onPress={() => onDate(index)} style={[styles.pickerDay, active && styles.pickerDayActive]} accessibilityRole="button" accessibilityLabel={`${dayName(date, language, index)}, ${formatDate(date, language)}`} accessibilityState={{ selected: active }}><Text style={styles.pickerDayName}>{dayName(date, language, index)}</Text><Text style={styles.pickerDayDate}>{formatDate(date, language)}</Text></Pressable>;
        })}</ScrollView>
        <View style={styles.hourTitleRow}><SectionLabel>{t.hour}</SectionLabel><Pressable onPress={() => onHour(null)} accessibilityRole="button" accessibilityLabel={t.live} accessibilityState={{ selected: selectedHour == null }}><Text style={[styles.liveChoice, selectedHour == null && styles.liveChoiceActive]}>{t.live}</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hoursRow}>{HOURS.map((hour) => {
          const active = selectedHour === hour;
          return <Pressable key={hour} onPress={() => onHour(hour)} style={[styles.hourChip, active && styles.hourChipActive]} accessibilityRole="button" accessibilityLabel={`${String(hour).padStart(2, '0')}:00`} accessibilityState={{ selected: active }}><Text style={[styles.hourChipText, active && styles.hourChipTextActive]}>{String(hour).padStart(2, '0')}:00</Text></Pressable>;
        })}</ScrollView>
      </SafeAreaView></View>
    </Modal>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const t = copy.el;
  return (
    <SafeAreaView style={styles.errorRoot}>
      <View style={styles.errorCard} accessibilityRole="alert">
        <Text style={styles.errorMark}>!</Text>
        <Text style={styles.errorTitle}>{t.errorTitle}</Text>
        <Text style={styles.errorBody}>{t.errorBody}</Text>
        <Pressable onPress={() => void retry()} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t.retry}>
          <Text style={styles.retryText}>{t.retry}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function EvriposApp() {
  const [now, setNow] = useState(() => new Date());
  const [language, setLanguage] = useState<Language>('el');
  const [tab, setTab] = useState<AppTab>('now');
  const [dateIndex, setDateIndex] = useState(0);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const baseDate = useMemo(() => startOfDay(now), [now]);
  const selectedDate = useMemo(() => addDays(baseDate, dateIndex), [baseDate, dateIndex]);
  const minute = selectedHour == null ? athensMinute(now) : selectedHour * 60;

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    loadNotificationSettings().then((settings) => {
      if (settings.some(Boolean)) syncNotificationSettings(settings, language);
    });
  }, [language]);

  let content: ReactNode;
  if (tab === 'now') content = <NowScreen language={language} date={selectedDate} minute={minute} live={dateIndex === 0 && selectedHour == null} />;
  else if (tab === 'day') content = <DayScreen language={language} date={selectedDate} index={dateIndex} onIndex={setDateIndex} />;
  else if (tab === 'forecast') content = <ForecastScreen language={language} baseDate={baseDate} />;
  else if (tab === 'sky') content = <SkyScreen language={language} date={selectedDate} minute={minute} />;
  else content = <GuideScreen language={language} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Header language={language} date={selectedDate} minute={minute} onLanguage={setLanguage} onOpenPicker={() => setPickerOpen(true)} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>{content}</ScrollView>
      <BottomTabs tab={tab} language={language} onTab={setTab} />
      <DateTimePicker visible={pickerOpen} language={language} baseDate={baseDate} dateIndex={dateIndex} selectedHour={selectedHour} onDate={setDateIndex} onHour={setSelectedHour} onClose={() => setPickerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG }, flex: { flex: 1 }, scroll: { flex: 1 }, scrollContent: { width: '100%', maxWidth: '100%', paddingBottom: 14, overflow: 'hidden' }, screenStack: { width: '100%', maxWidth: '100%', paddingHorizontal: 20, gap: 12 },
  card: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 20 }, cardBorder: { borderWidth: 1, borderColor: BORDER }, sectionLabel: { color: MUTED, fontFamily: MONO, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.35 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, gap: 11 }, headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }, headerTitleWrap: { flex: 1 }, title: { color: TEXT, fontFamily: SANS, fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: -0.45 }, coordinates: { color: MUTED, fontFamily: MONO, fontSize: 10, fontWeight: '600', marginTop: 4 },
  languageSwitch: { flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden', marginTop: 2 }, languageChip: { paddingVertical: 6, paddingHorizontal: 11 }, languageChipActive: { backgroundColor: GOLD }, languageText: { color: MUTED, fontFamily: SANS, fontSize: 11, fontWeight: '700' }, languageTextActive: { color: BG },
  dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(232,194,122,0.28)', backgroundColor: 'rgba(232,194,122,0.08)' }, dateButtonLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 }, calendarIcon: { width: 12, height: 12, borderWidth: 1.5, borderColor: GOLD, borderRadius: 3 }, calendarTop: { position: 'absolute', left: 1, right: 1, top: 3, height: 1, backgroundColor: GOLD }, dateButtonText: { color: GOLD, fontFamily: MONO, fontSize: 11, fontWeight: '600' }, changeText: { color: '#A58A55', fontFamily: SANS, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }, pressed: { opacity: 0.72 },
  flowCard: { borderRadius: 20, overflow: 'hidden' }, flowTop: { paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, liveWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 }, liveDot: { width: 6, height: 6, borderRadius: 3 }, liveText: { fontFamily: MONO, fontSize: 10, fontWeight: '700' }, directionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 }, arrowBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }, arrow: { fontFamily: SANS, fontSize: 25, fontWeight: '700' }, directionTitle: { fontFamily: SANS, fontSize: 27, lineHeight: 30, fontWeight: '800', letterSpacing: -0.9 }, directionHelp: { color: '#9DB2BD', fontFamily: SANS, fontSize: 12, fontWeight: '500', marginTop: 4 },
  lanes: { height: 78, overflow: 'hidden', backgroundColor: '#04121A', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }, laneRow: { position: 'absolute', left: 0, width: '180%', flexDirection: 'row', gap: 13 }, laneDirection: { position: 'absolute', right: 12, top: 32, fontFamily: MONO, fontSize: 10, fontWeight: '700', letterSpacing: 1 }, irregularLanes: { height: 78, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07151D', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }, irregularLanesText: { color: '#9DB2BD', fontFamily: SANS, fontSize: 11, lineHeight: 17, textAlign: 'center' }, metricRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }, metric: { flex: 1, minWidth: 0, paddingHorizontal: 20, paddingVertical: 14 }, metricDivider: { borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }, metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 5 }, metricValue: { color: TEXT, fontFamily: MONO, fontSize: 26, lineHeight: 30, fontWeight: '700', letterSpacing: -1 }, metricTextValue: { fontSize: 13, lineHeight: 18, letterSpacing: 0.15 }, metricUnit: { color: '#9DB2BD', fontFamily: MONO, fontSize: 12, fontWeight: '700' }, confidenceRow: { paddingHorizontal: 20, paddingVertical: 11, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, confidenceText: { flex: 1, minWidth: 0, textAlign: 'right', fontFamily: MONO, fontSize: 9, lineHeight: 13, fontWeight: '700', letterSpacing: 0.4 },
  nextCard: { paddingHorizontal: 18, paddingVertical: 16 }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, goldMono: { color: GOLD, fontFamily: MONO, fontSize: 11, fontWeight: '600' }, countdownRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8 }, countdown: { color: TEXT, fontFamily: MONO, fontSize: 32, lineHeight: 36, fontWeight: '700', letterSpacing: -1.4 }, countdownHelp: { color: '#9DB2BD', fontFamily: SANS, fontSize: 11.5, fontWeight: '500', flexShrink: 1 }, progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 12, marginBottom: 7 }, progressFill: { height: '100%' }, axisText: { color: '#6C8592', fontFamily: MONO, fontSize: 10, fontWeight: '500' }, chartCard: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, overflow: 'hidden' }, chartHeader: { marginBottom: 11 }, irregularChart: { alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }, irregularChartText: { color: GOLD, fontFamily: MONO, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 }, irregularNotice: { color: '#B7C8D0', fontFamily: SANS, fontSize: 11.5, lineHeight: 18, marginTop: 9 },
  twoColumns: { flexDirection: 'row', gap: 12 }, smallCard: { flex: 1, minWidth: 0, paddingHorizontal: 15, paddingVertical: 14 }, moonCard: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' }, skyTime: { color: TEXT, fontFamily: MONO, fontSize: 13, fontWeight: '600', marginTop: 7 }, smallHelp: { color: '#8FA6B1', fontFamily: SANS, fontSize: 10, marginTop: 4 }, moonDisc: { overflow: 'hidden' },
  daySwitcher: { borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, dayArrow: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }, dayArrowText: { color: '#C3D3DA', fontSize: 24, lineHeight: 27 }, disabled: { opacity: 0.25 }, dayCenter: { alignItems: 'center', gap: 3 }, dayTitle: { color: TEXT, fontFamily: SANS, fontSize: 14, fontWeight: '700' }, listHeading: { marginHorizontal: 2, marginTop: 4, marginBottom: 8 }, changeList: { gap: 8 }, changeCard: { borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 13 }, irregularCard: { padding: 16 }, changeBar: { width: 3, height: 35, borderRadius: 2 }, changeTime: { color: TEXT, fontFamily: MONO, fontSize: 17, fontWeight: '700', letterSpacing: -0.5, width: 52 }, changeDirection: { fontFamily: SANS, fontSize: 12, fontWeight: '700' }, changeSub: { color: MUTED, fontFamily: MONO, fontSize: 9.5, fontWeight: '500', marginTop: 3 },
  forecastNote: { color: '#8FA6B1', fontFamily: SANS, fontSize: 11.5, lineHeight: 18, paddingHorizontal: 2, paddingBottom: 2 }, forecastCard: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }, forecastTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 }, forecastDay: { color: TEXT, fontFamily: SANS, fontSize: 13, fontWeight: '700' }, miniChart: { marginTop: 9 }, forecastTime: { color: '#A8BCC5', fontFamily: MONO, fontSize: 9.5, fontWeight: '500' }, irregularForecast: { color: GOLD, fontFamily: MONO, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8 },
  mapCard: { overflow: 'hidden' }, mapHeader: { paddingHorizontal: 18, paddingVertical: 14 }, mapSource: { color: '#72C6E5', fontFamily: MONO, fontSize: 10, fontWeight: '700' }, osmMap: { width: '100%', height: MAP_HEIGHT, overflow: 'hidden', backgroundColor: '#AAD3DF' }, staticMapImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' }, mapAttribution: { position: 'absolute', right: 0, bottom: 0, paddingHorizontal: 4, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.72)' }, noPointerEvents: { pointerEvents: 'none' }, mapAttributionText: { color: '#4A5860', fontFamily: SANS, fontSize: 7 }, mapNote: { color: '#8CCDE6', fontFamily: SANS, fontSize: 12, lineHeight: 18, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 15 }, dialCard: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: 20 }, dial: { alignItems: 'center', paddingTop: 20 }, dialLegend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 6 }, legendInline: { flexDirection: 'row', alignItems: 'center', gap: 6 }, legendDot: { width: 8, height: 8, borderRadius: 4 }, dialLegendText: { color: '#9DB2BD', fontFamily: MONO, fontSize: 9.5 }, phasesCard: { paddingHorizontal: 18, paddingVertical: 16 }, phaseList: { gap: 11, marginTop: 12 }, phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, phaseName: { flex: 1, color: '#C3D3DA', fontFamily: SANS, fontSize: 11.5, fontWeight: '500' }, phaseWhen: { color: '#8FA6B1', fontFamily: MONO, fontSize: 9.5 },
  alertCard: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, alertTitle: { color: TEXT, fontFamily: SANS, fontSize: 12, fontWeight: '700' }, alertDetail: { color: MUTED, fontFamily: SANS, fontSize: 10.5, fontWeight: '500', marginTop: 3 }, notificationStatus: { color: NORTH, fontFamily: MONO, fontSize: 9.5, lineHeight: 15, marginHorizontal: 2, marginBottom: 8 }, notificationStatusError: { color: GOLD }, aboutCard: { padding: 18 }, aboutTitle: { color: TEXT, fontFamily: SANS, fontSize: 15, fontWeight: '700' }, aboutText: { color: '#B3C4CC', fontFamily: SANS, fontSize: 12, lineHeight: 20, marginTop: 10 }, reliabilityList: { gap: 15, marginTop: 16 }, reliabilityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 }, reliabilityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 }, reliabilityName: { color: TEXT, fontFamily: SANS, fontSize: 11.5, lineHeight: 16, fontWeight: '700' }, reliabilityDetail: { color: MUTED, fontFamily: SANS, fontSize: 10.5, lineHeight: 16, marginTop: 3 }, sourcesCard: { padding: 18 }, sourceList: { marginTop: 11 }, sourceLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }, sourceLinkText: { flex: 1, color: '#8CCDE6', fontFamily: SANS, fontSize: 11.5, lineHeight: 16, fontWeight: '600' }, sourceArrow: { color: GOLD, fontSize: 15 }, legendCard: { padding: 18 }, legendList: { gap: 11, marginTop: 12 }, legendRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, legendLine: { width: 20, height: 3, borderRadius: 2 }, legendText: { color: '#C3D3DA', fontFamily: SANS, fontSize: 11.5 }, disclaimer: { color: '#5D7481', fontFamily: MONO, fontSize: 10, lineHeight: 17, textAlign: 'center', paddingHorizontal: 10, paddingVertical: 3 },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderColor: BORDER, backgroundColor: NAV_BG, paddingTop: 8, paddingBottom: 4 }, tabButton: { flex: 1, minWidth: 0, alignItems: 'center', gap: 5, paddingVertical: 5 }, tabLabel: { fontFamily: SANS, fontSize: 9, fontWeight: '700', letterSpacing: 0.1, maxWidth: '100%' }, circleIcon: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, circleIconDot: { width: 4, height: 4, borderRadius: 2 }, lineIcon: { width: 16, height: 15, justifyContent: 'space-between', alignItems: 'flex-start' }, barIcon: { width: 16, height: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, skyIcon: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, overflow: 'hidden' }, skyHalf: { position: 'absolute', right: 0, width: 8, height: 16 }, dotsIcon: { width: 16, height: 16, alignItems: 'center', justifyContent: 'space-between' },
  modalRoot: { flex: 1, backgroundColor: 'rgba(3,10,14,0.66)', justifyContent: 'flex-end' }, sheet: { backgroundColor: CARD, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 13 }, sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.16)', alignSelf: 'center', marginBottom: 14 }, sheetTitle: { color: TEXT, fontFamily: SANS, fontSize: 15, fontWeight: '700' }, sheetDone: { color: GOLD, fontFamily: SANS, fontSize: 12, fontWeight: '700', padding: 4 }, dayPicker: { maxHeight: 244, marginTop: 13 }, pickerDay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 6 }, pickerDayActive: { backgroundColor: 'rgba(232,194,122,0.14)', borderColor: 'rgba(232,194,122,0.4)' }, pickerDayName: { color: TEXT, fontFamily: SANS, fontSize: 12.5, fontWeight: '700' }, pickerDayDate: { color: '#8FA6B1', fontFamily: MONO, fontSize: 11 }, hourTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 2, marginTop: 10, marginBottom: 8 }, liveChoice: { color: MUTED, fontFamily: MONO, fontSize: 10, fontWeight: '700', padding: 4 }, liveChoiceActive: { color: NORTH }, hoursRow: { gap: 6, paddingBottom: 10 }, hourChip: { minWidth: 59, paddingHorizontal: 11, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' }, hourChipActive: { backgroundColor: GOLD }, hourChipText: { color: '#C3D3DA', fontFamily: MONO, fontSize: 11, fontWeight: '700' }, hourChipTextActive: { color: BG }, errorRoot: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 24 }, errorCard: { width: '100%', maxWidth: 420, padding: 24, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(232,194,122,0.28)', backgroundColor: CARD, alignItems: 'center' }, errorMark: { width: 40, height: 40, borderRadius: 20, textAlign: 'center', textAlignVertical: 'center', color: BG, backgroundColor: GOLD, fontFamily: MONO, fontSize: 24, lineHeight: 40, fontWeight: '800' }, errorTitle: { color: TEXT, fontFamily: SANS, fontSize: 18, lineHeight: 24, fontWeight: '800', textAlign: 'center', marginTop: 16 }, errorBody: { color: '#B3C4CC', fontFamily: SANS, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 8 }, retryButton: { minHeight: 44, marginTop: 18, borderRadius: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: GOLD }, retryText: { color: BG, fontFamily: SANS, fontSize: 12, fontWeight: '800' },
});

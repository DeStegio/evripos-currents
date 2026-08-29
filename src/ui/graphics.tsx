import React, { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle, Defs, G, Line, LinearGradient as SvgLinearGradient, Path, Polygon, Rect, Stop,
  Text as SvgText,
} from 'react-native-svg';

import {
  copy, currentTimelineEvents, currentValueFromEvents, formatMinute, Language, turnEvents,
} from '@/features/evripos-model';

import {
  ACCENT, BRIDGE_LINE, COAST, INK, LAND, MOON_LIT, MUTED, NAVY, NORTH, PAPER, RULE_CHART,
  RULE_FAINT, SANS, SOUTH, WATER,
} from './theme';

const AnimatedLine = Animated.createAnimatedComponent(Line);

export const MAP_HEIGHT = 214;

/* ------------------------------------------------------------------ curve */

const FULL = { width: 330, height: 142, center: 68, amplitude: 48, step: 6 };
const MINI = { width: 300, height: 32, center: 16, amplitude: 12, step: 12 };

export function CurrentChart({
  date, minute, mini = false, irregularLabel,
}: {
  date: Date; minute?: number; mini?: boolean; irregularLabel: string;
}) {
  const { width, height, center, amplitude, step } = mini ? MINI : FULL;
  const timeline = currentTimelineEvents(date);
  const points: string[] = [];
  for (let value = 0; value <= 1440; value += step) {
    const current = currentValueFromEvents(value, timeline);
    if (Number.isFinite(current)) {
      points.push(`${((value / 1440) * width).toFixed(1)},${(center - current * amplitude).toFixed(1)}`);
    }
  }
  if (points.length === 0) {
    return (
      <View style={[styles.irregularChart, { height }]}>
        <Text style={styles.irregularChartText}>{irregularLabel}</Text>
      </View>
    );
  }

  const line = `M${points.join(' L')}`;
  const area = `${line} L${width},${center} L0,${center} Z`;
  const markerX = minute == null ? null : (minute / 1440) * width;
  const markerValue = minute == null ? null : currentValueFromEvents(minute, timeline);
  const markerY = markerValue == null || !Number.isFinite(markerValue)
    ? null
    : center - markerValue * amplitude;
  const gradientId = `evripos-curve-${date.getTime()}-${mini ? 'mini' : 'full'}`;
  const reach = center + amplitude + 8;

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={mini ? 'none' : undefined}
    >
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={NORTH} stopOpacity={mini ? 0.2 : 0.22} />
          <Stop offset="0.499" stopColor={NORTH} stopOpacity={mini ? 0.03 : 0.04} />
          <Stop offset="0.501" stopColor={SOUTH} stopOpacity={mini ? 0.03 : 0.04} />
          <Stop offset="1" stopColor={SOUTH} stopOpacity={mini ? 0.2 : 0.22} />
        </SvgLinearGradient>
      </Defs>
      <Line x1="0" y1={center} x2={width} y2={center} stroke={mini ? RULE_CHART : INK} strokeWidth="1" />
      <Path d={area} fill={`url(#${gradientId})`} />
      <Path d={line} fill="none" stroke={INK} strokeWidth={mini ? 1.1 : 1.5} strokeLinejoin="round" />
      {!mini && turnEvents(date).map((event) => {
        const x = (event.minute / 1440) * width;
        return (
          <G key={`${event.minute}-${event.direction}`}>
            <Line x1={x} y1={center - amplitude - 8} x2={x} y2={reach} stroke={RULE_CHART} strokeWidth="1" />
            <SvgText
              x={Math.min(Math.max(x, 15), width - 15)}
              y={height - 2}
              fill={MUTED}
              fontSize="9.5"
              fontFamily={SANS}
              fontWeight="500"
              textAnchor="middle"
            >
              {formatMinute(event.minute)}
            </SvgText>
          </G>
        );
      })}
      {!mini && markerX != null && markerY != null ? (
        <G>
          <Line x1={markerX} y1="0" x2={markerX} y2={reach} stroke={ACCENT} strokeWidth="1.5" />
          <Circle cx={markerX} cy={markerY} r="4.5" fill={ACCENT} />
        </G>
      ) : null}
      {!mini ? (
        <>
          <SvgText x="2" y="11" fill={NORTH} fontSize="9.5" fontFamily={SANS} fontWeight="600">N</SvgText>
          <SvgText x="2" y={height - 26} fill={SOUTH} fontSize="9.5" fontFamily={SANS} fontWeight="600">S</SvgText>
        </>
      ) : null}
    </Svg>
  );
}


/* ----------------------------------------------------------- strait scene */

const STRAIT_WIDTH = 390;
const STRAIT_HEIGHT = 140;
const FLOW_ROWS = [52, 66, 80, 94];
const DASH_PERIOD = 52;

/**
 * Schematic of the channel seen from above: mainland at the top, Evia at the bottom,
 * the bridge as the pale column in the middle, and the water running through it.
 * `north` is null when the model declines to predict a direction.
 */
export function StraitView({
  north, strength, language,
}: {
  north: boolean | null; strength: number; language: Language;
}) {
  const [drift] = useState(() => new Animated.Value(0));
  const still = north == null;

  useEffect(() => {
    if (still) {
      drift.setValue(0);
      return undefined;
    }
    drift.setValue(0);
    const loop = Animated.loop(Animated.timing(drift, {
      toValue: 1,
      duration: Math.max(1200, (2.6 - strength * 1.4) * 1000),
      easing: Easing.linear,
      useNativeDriver: false,
    }));
    loop.start();
    return () => loop.stop();
  }, [drift, still, strength]);

  const flow = still ? RULE_CHART : north ? NORTH : SOUTH;
  const offset = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, north ? -DASH_PERIOD : DASH_PERIOD],
  });
  const arrowFrom = north ? 328 : 62;
  const arrowTo = north ? 354 : 36;
  const compass = language === 'el' ? (north ? 'Β' : 'Ν') : north ? 'N' : 'S';

  return (
    <Svg width="100%" height={STRAIT_HEIGHT} viewBox={`0 0 ${STRAIT_WIDTH} ${STRAIT_HEIGHT}`}>
      <Rect x="0" y="0" width={STRAIT_WIDTH} height={STRAIT_HEIGHT} fill={WATER} />
      <Path d={`M0,0 H${STRAIT_WIDTH} V26 C300,30 250,44 190,42 C120,40 70,30 0,36 Z`} fill={LAND} />
      <Path d={`M0,36 C70,30 120,40 190,42 C250,44 300,30 ${STRAIT_WIDTH},26`} fill="none" stroke={COAST} strokeWidth="1.2" />
      <Path d={`M0,${STRAIT_HEIGHT} H${STRAIT_WIDTH} V112 C310,104 250,116 180,110 C110,104 60,116 0,108 Z`} fill={LAND} />
      <Path d={`M0,108 C60,116 110,104 180,110 C250,116 310,104 ${STRAIT_WIDTH},112`} fill="none" stroke={COAST} strokeWidth="1.2" />

      {FLOW_ROWS.map((y, index) => {
        const strong = index === 1 || index === 2;
        return (
          <AnimatedLine
            key={y}
            x1={north === false ? STRAIT_WIDTH - 8 : 8}
            y1={y}
            x2={north === false ? 8 : STRAIT_WIDTH - 8}
            y2={y}
            stroke={flow}
            strokeWidth={strong ? 2.4 : 1.6}
            strokeDasharray="20 32"
            strokeDashoffset={still ? 0 : offset}
            opacity={still ? 0.35 : strong ? 0.95 : 0.5}
          />
        );
      })}

      {still ? null : (
        <G>
          <Line x1={arrowFrom} y1="73" x2={arrowTo} y2="73" stroke={flow} strokeWidth="2.6" />
          <Polygon
            points={north ? `${arrowTo + 12},73 ${arrowTo},67 ${arrowTo},79` : `${arrowTo - 12},73 ${arrowTo},67 ${arrowTo},79`}
            fill={flow}
          />
        </G>
      )}

      <Rect x="184" y="0" width="22" height={STRAIT_HEIGHT} fill={PAPER} opacity="0.96" />
      <Line x1="184" y1="0" x2="184" y2={STRAIT_HEIGHT} stroke={BRIDGE_LINE} strokeWidth="1" />
      <Line x1="206" y1="0" x2="206" y2={STRAIT_HEIGHT} stroke={BRIDGE_LINE} strokeWidth="1" />
      <Line x1="195" y1="0" x2="195" y2={STRAIT_HEIGHT} stroke={BRIDGE_LINE} strokeWidth="1" strokeDasharray="5 6" />
      <Rect x="181" y="38" width="28" height="7" fill={ACCENT} />
      <Rect x="181" y="104" width="28" height="7" fill={ACCENT} />

      <StraitLabel x={14} y={20} fill={MUTED}>{copy[language].mainland}</StraitLabel>
      <StraitLabel x={14} y={132} fill={MUTED}>{copy[language].evia}</StraitLabel>
      <StraitLabel x={214} y={20} fill={NAVY}>{copy[language].bridge}</StraitLabel>
      {still ? null : (
        <SvgText
          x={north ? 372 : 18}
          y="77"
          fill={flow}
          fontSize="10"
          fontFamily={SANS}
          fontWeight="700"
          textAnchor="middle"
        >
          {compass}
        </SvgText>
      )}
    </Svg>
  );
}

function StraitLabel({ x, y, fill, children }: { x: number; y: number; fill: string; children: string }) {
  return (
    <SvgText x={x} y={y} fill={fill} fontSize="9" fontFamily={SANS} fontWeight="600" letterSpacing="1.26">
      {children}
    </SvgText>
  );
}

/* -------------------------------------------------------------- moon disc */

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
  const sign = phase <= 0.5 ? 1 : -1;
  for (let index = 0; index <= steps; index += 1) {
    const { x, y } = chord(index);
    points.push([center + sign * x, center + y]);
  }
  for (let index = steps; index >= 0; index -= 1) {
    const { x, y } = chord(index);
    points.push([center + sign * Math.cos(phase * Math.PI * 2) * x, center + y]);
  }
  return `M${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L')} Z`;
}

export function MoonDisc({ size = 24, phase = 0 }: { size?: number; phase?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={NAVY} />
      <Path d={moonLightPath(size, phase)} fill={MOON_LIT} />
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill="none" stroke="rgba(18,38,58,0.25)" />
    </Svg>
  );
}

/* ------------------------------------------------------------- sky azimuth */

export function SkyDial({ sunAzimuth, moonAzimuth }: { sunAzimuth: number; moonAzimuth: number }) {
  const center = 78;
  const point = (azimuth: number, radius: number) => {
    const angle = ((azimuth - 90) * Math.PI) / 180;
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
  };
  const sun = point(sunAzimuth, 62);
  const moon = point(moonAzimuth, 62);
  return (
    <Svg width={156} height={156} viewBox="0 0 156 156">
      <Circle cx={center} cy={center} r="62" fill="none" stroke={RULE_CHART} strokeWidth="1" />
      <Circle cx={center} cy={center} r="34" fill="none" stroke={RULE_FAINT} strokeWidth="1" />
      {(['N', 'E', 'S', 'W'] as const).map((mark, index) => {
        const angle = ((index * 90 - 90) * Math.PI) / 180;
        return (
          <SvgText
            key={mark}
            x={center + 73 * Math.cos(angle)}
            y={center + 73 * Math.sin(angle) + 3.5}
            fill={MUTED}
            fontSize="9.5"
            fontFamily={SANS}
            fontWeight="600"
            letterSpacing="0.95"
            textAnchor="middle"
          >
            {mark}
          </SvgText>
        );
      })}
      <Circle cx={sun.x} cy={sun.y} r="5.5" fill={ACCENT} />
      <Circle cx={moon.x} cy={moon.y} r="4.5" fill={NAVY} />
      <Rect x={center - 2} y={center - 2} width="4" height="4" fill={RULE_CHART} />
    </Svg>
  );
}

/* ------------------------------------------------------------- tab icons */

export function TabIcon({ tab, color }: { tab: string; color: string }) {
  const shared = {
    width: 18,
    height: 18,
    viewBox: '0 0 18 18',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (tab === 'now') {
    return <Svg {...shared}><Circle cx="9" cy="9" r="6.5" /><Path d="M9 5.2v4l2.6 1.6" /></Svg>;
  }
  if (tab === 'day') {
    return (
      <Svg {...shared}>
        <Path d="M2.5 6.2h13M2.5 9h13M2.5 11.8h13" />
        <Circle cx="11.5" cy="6.2" r="1.6" fill={color} stroke="none" />
      </Svg>
    );
  }
  if (tab === 'forecast') {
    return <Svg {...shared}><Path d="M2.5 12.5c2.2 0 2.2-5 4.4-5s2.2 5 4.4 5 2.2-5 4.2-5" /></Svg>;
  }
  if (tab === 'map') {
    return (
      <Svg {...shared}>
        <Path d="M9 16s5-4.6 5-8.2A5 5 0 0 0 4 7.8C4 11.4 9 16 9 16z" />
        <Circle cx="9" cy="7.6" r="1.8" />
      </Svg>
    );
  }
  if (tab === 'alerts') {
    return (
      <Svg {...shared}>
        <Path d="M4.6 12.4V8.2a4.4 4.4 0 1 1 8.8 0v4.2l1.2 1.6H3.4z" />
        <Path d="M7.4 15.6a1.7 1.7 0 0 0 3.2 0" />
      </Svg>
    );
  }
  return (
    <Svg {...shared}>
      <Path d="M3.2 3.6h4.2c1 0 1.6.6 1.6 1.5v9.3c0-.9-.6-1.5-1.6-1.5H3.2z" />
      <Path d="M14.8 3.6h-4.2c-1 0-1.6.6-1.6 1.5v9.3c0-.9.6-1.5 1.6-1.5h4.2z" />
    </Svg>
  );
}


const styles = StyleSheet.create({
  irregularChart: { alignItems: 'center', justifyContent: 'center' },
  osmMap: { width: '100%', height: MAP_HEIGHT, overflow: 'hidden', backgroundColor: WATER },
  mapAttribution: { position: 'absolute', right: 0, bottom: 0, paddingHorizontal: 4, paddingVertical: 2, backgroundColor: 'rgba(251,248,242,0.82)' },
  noPointerEvents: { pointerEvents: 'none' },
  mapAttributionText: { color: MUTED, fontFamily: SANS, fontSize: 7 },
  irregularChartText: { color: ACCENT, fontFamily: SANS, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.9 },
});


/* ---------------------------------------------------------- OSM strait map */

const CHALKIDA_MAP = require('../../assets/images/chalkida-map.png');

/**
 * The real bridge, over an OpenStreetMap still. The overlay geometry is tuned to
 * this image, so the height stays at 214 rather than the 228 the mock uses for its
 * schematic. Only the palette changed.
 */
export function StraitMap({ north, label }: { north: boolean | null; label: string }) {
  const flow = north == null ? RULE_CHART : north ? NORTH : SOUTH;
  return (
    <View style={styles.osmMap}>
      <Image accessibilityLabel={label} resizeMode="cover" source={CHALKIDA_MAP} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 354 214" preserveAspectRatio="none">
        <Path
          d="M123 45 C143 70 160 92 177 107 C193 128 210 156 231 188"
          fill="none"
          stroke={flow}
          strokeWidth="4"
          strokeDasharray="10 8"
          opacity={north == null ? 0.5 : 0.9}
        />
        {north == null ? null : [{ x: 145, y: 73 }, { x: 208, y: 153 }].map((arrow) => (
          <Polygon
            key={arrow.y}
            points="-13,-9.5 13,0 -13,9.5"
            fill={flow}
            stroke={PAPER}
            strokeWidth="1.5"
            strokeLinejoin="round"
            transform={`translate(${arrow.x} ${arrow.y}) rotate(${north ? 135 : 315})`}
          />
        ))}
        <Rect x="170" y="100" width="14" height="14" fill={ACCENT} />
      </Svg>
      <View style={[styles.mapAttribution, styles.noPointerEvents]}>
        <Text style={styles.mapAttributionText}>© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}

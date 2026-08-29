/**
 * Guards the two properties a release build has to keep:
 *
 *  1. Nothing on screen is a fixture. Every value is derived from the instant it is
 *     shown, so distinct instants must produce distinct output.
 *  2. The Athens clock stays right even on an engine that ships no time-zone database,
 *     which is the case Hermes can land in inside a release APK. The rule-based
 *     fallback must agree with ICU everywhere, including both DST switch instants.
 */
import { strict as assert } from 'node:assert';

import {
  astronomySnapshot, ATHENS_OFFSET_SOURCE, athensMinute, athensOffsetByRule, currentPrediction,
  dateAtMinute, formatClock, formatDate, formatEventDate, formatMinute, lunarDay, startOfDay,
  turnMinutes, upcomingMoonPhases,
} from '../src/features/evripos-model';

const ATHENS = 'Europe/Athens';

/** Independent reference offset, read straight from the platform time-zone database. */
function icuOffsetMinutes(time: number) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ATHENS,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(time));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
  return Math.round((asUtc - time) / 60_000);
}

/* 1 — the fallback must match ICU across every hour of a seven-year span. */
{
  assert.equal(ATHENS_OFFSET_SOURCE, 'intl', 'Node has ICU, so the probe should select the Intl path here');
  let checked = 0;
  const start = Date.UTC(2024, 0, 1);
  const end = Date.UTC(2031, 0, 1);
  for (let time = start; time < end; time += 3_600_000) {
    const rule = athensOffsetByRule(time);
    const icu = icuOffsetMinutes(time);
    assert.equal(rule, icu, `Athens offset disagrees at ${new Date(time).toISOString()}: rule ${rule}, ICU ${icu}`);
    checked += 1;
  }
  console.log(`Athens offset fallback matches ICU on ${checked.toLocaleString('en-GB')} hourly samples (2024–2030).`);
}

/* 2 — exact behaviour either side of both DST switches. */
{
  const cases: [string, number][] = [
    ['2026-03-29T00:59:00Z', 120], ['2026-03-29T01:00:00Z', 180],
    ['2026-10-25T00:59:00Z', 180], ['2026-10-25T01:00:00Z', 120],
    ['2027-03-28T01:00:00Z', 180], ['2027-10-31T01:00:00Z', 120],
  ];
  for (const [iso, expected] of cases) {
    const time = Date.parse(iso);
    assert.equal(athensOffsetByRule(time), expected, `rule offset wrong at ${iso}`);
    assert.equal(icuOffsetMinutes(time), expected, `ICU offset wrong at ${iso}`);
  }
  console.log('DST switch instants resolve identically in both paths.');
}

/* 3 — formatters are pure functions of the instant, with no locale data involved. */
{
  const sample = new Date(Date.UTC(2026, 7, 29, 23, 59));
  assert.equal(formatClock(sample), '02:59');
  assert.equal(formatEventDate(sample), '30/08/2026, 02:59');
  assert.equal(formatDate(new Date(Date.UTC(2026, 7, 29, 12))), '29/08/2026');
  assert.equal(formatDate(new Date(Date.UTC(2026, 7, 29, 12)), true), '29/08');
  assert.equal(formatClock(null), '—');
  console.log('Formatters reproduce the ICU strings byte for byte.');
}

/* 4 — nothing is static: distinct instants give distinct readings. */
{
  const day = startOfDay(new Date());
  const readings = new Set<string>();
  for (let minute = 0; minute < 1440; minute += 37) {
    const prediction = currentPrediction(day, minute);
    const sky = astronomySnapshot(day, minute);
    readings.add([
      prediction.direction, prediction.stage, prediction.cycleLevel.toFixed(6),
      sky.sunAzimuth.toFixed(4), sky.moonAzimuth.toFixed(4), sky.moonPhase.toFixed(6),
    ].join('|'));
  }
  assert.ok(readings.size > 30, `expected the reading to move through the day, saw ${readings.size} distinct states`);

  const turnsToday = turnMinutes(day).join(',');
  const turnsIn40Days = turnMinutes(new Date(day.getTime() + 40 * 86_400_000)).join(',');
  assert.notEqual(turnsToday, turnsIn40Days, 'reversal times must follow the lunar day, not a fixture');

  const azimuthNow = astronomySnapshot(day, 600).sunAzimuth;
  const azimuthIn90Days = astronomySnapshot(new Date(day.getTime() + 90 * 86_400_000), 600).sunAzimuth;
  assert.ok(Math.abs(azimuthNow - azimuthIn90Days) > 1, 'sun azimuth must change across seasons');
  console.log(`Live derivation confirmed: ${readings.size} distinct states across one day.`);
}

/* 5 — the moon phase list is computed and correctly ordered against its fixed labels. */
{
  const from = dateAtMinute(startOfDay(new Date()), athensMinute(new Date()));
  const phases = upcomingMoonPhases(from);
  assert.equal(phases.length, 5, 'five upcoming phases are rendered');
  for (let index = 0; index < phases.length; index += 1) {
    assert.ok(phases[index] > from, `phase ${index} must be in the future`);
    if (index > 0) assert.ok(phases[index] > phases[index - 1], 'phases must ascend');
  }
  const spacing = (phases[4].getTime() - phases[0].getTime()) / 86_400_000;
  assert.ok(spacing > 27 && spacing < 31, `new moon to new moon should be a lunation, got ${spacing.toFixed(2)} days`);
  console.log(`Moon phases computed live: ${phases[0].toISOString().slice(0, 10)} → ${phases[4].toISOString().slice(0, 10)}.`);
}

/* 6 — none of the mock's placeholder values survived into the model. */
{
  const day = startOfDay(new Date());
  const sky = astronomySnapshot(day, 600);
  // A single real time may coincide with a mock one; all four matching would not.
  const allFour = [sky.sunrise, sky.sunset, sky.moonrise, sky.moonset].map((v) => formatClock(v)).join(' ');
  assert.notEqual(allFour, '06:26 20:44 18:53 03:00', 'sun and moon times are the mock fixtures');
  assert.notEqual(sky.sunAzimuth.toFixed(1), '309.6', 'sun azimuth is the mock fixture');
  assert.notEqual(sky.moonAzimuth.toFixed(1), '143.2', 'moon azimuth is the mock fixture');
  assert.ok(lunarDay(day) >= 0 && lunarDay(day) <= 29, 'lunar day is in range');
  console.log('No mock placeholder values present.');
}

console.log(`\nLive model checks passed. Offset source on this runtime: ${ATHENS_OFFSET_SOURCE}.`);
console.log(`Right now in Chalkida: ${formatMinute(athensMinute(new Date()))}, lunar day ${lunarDay(startOfDay(new Date()))}.`);

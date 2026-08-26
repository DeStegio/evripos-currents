import assert from 'node:assert/strict';

import {
  addDays, astronomySnapshot, athensMinute, currentPrediction, dateAtMinute, lunarDay,
  startOfDay, turnEvents, upcomingMoonPhases,
} from '../src/features/evripos-model';

const summerDay = startOfDay(new Date('2026-08-25T11:00:00Z'));
assert.equal(summerDay.toISOString(), '2026-08-25T12:00:00.000Z');
assert.equal(lunarDay(summerDay), 12);
assert.deepEqual(turnEvents(summerDay).map((event) => event.minute), [120, 500, 855, 1236]);

const nextSummerDay = startOfDay(new Date('2026-08-27T11:00:00Z'));
assert.equal(lunarDay(nextSummerDay), 14, 'Lunar day must be elapsed time from the precise new moon, not scaled illumination.');
assert.deepEqual(turnEvents(nextSummerDay).map((event) => event.minute), [180, 560, 915, 1296]);

const irregularDay = startOfDay(new Date('2026-08-20T11:00:00Z'));
assert.equal(lunarDay(irregularDay), 7);
assert.deepEqual(turnEvents(irregularDay), []);

const winterDayTen = startOfDay(new Date('2026-01-29T12:00:00Z'));
assert.equal(lunarDay(winterDayTen), 10);
assert.deepEqual(turnEvents(winterDayTen).map((event) => event.minute), [1, 380, 735, 1116]);

// The table is EET. Clock changes must be applied to each event, not once to
// the whole day: the early event can sit on the other side of the transition.
const springClockChange = startOfDay(new Date('2026-03-29T10:00:00Z'));
assert.deepEqual(turnEvents(springClockChange).map((event) => event.minute), [1, 440, 795, 1176]);
assert.equal(turnEvents(springClockChange)[0].moment.toISOString(), '2026-03-28T22:01:00.000Z');

const autumnClockChange = startOfDay(new Date('2026-10-25T10:00:00Z'));
assert.deepEqual(turnEvents(autumnClockChange).map((event) => event.minute), [180, 500, 855, 1236]);
assert.equal(turnEvents(autumnClockChange)[0].moment.toISOString(), '2026-10-25T00:00:00.000Z');

// Late fourth intervals belong to the next civil date. They must spill over
// from the previous table row instead of being sorted into the wrong day.
const spillOverDay = startOfDay(new Date('2026-08-18T10:00:00Z'));
const spillOverEvents = turnEvents(spillOverDay);
assert.equal(spillOverEvents[0].standardMinute, 1386);
assert.equal(spillOverEvents[0].direction, 'north');
assert.equal(spillOverEvents[0].minute, 6);

for (let offset = 0; offset < 35; offset += 1) {
  const date = addDays(startOfDay(new Date('2026-08-12T10:00:00Z')), offset);
  const day = lunarDay(date);
  const events = turnEvents(date);
  if ([7, 8, 9, 22, 23, 24].includes(day)) {
    assert.equal(events.length, 0, `Lunar day ${day} must not invent a direction.`);
    continue;
  }
  assert.ok(events.length === 3 || events.length === 4, `Regular lunar day ${day} must have three or four civil-day reversals.`);
  events.forEach((event, index) => {
    assert.ok(event.minute >= 0 && event.minute < 1440);
    if (index > 0) assert.ok(event.moment > events[index - 1].moment);
    assert.equal(currentPrediction(date, event.minute).direction, event.direction);
  });
}

assert.equal(currentPrediction(spillOverDay, 10).direction, 'north', 'The post-midnight event must carry over from the previous table row.');

assert.equal(dateAtMinute(summerDay, 120).toISOString(), '2026-08-24T23:00:00.000Z');
assert.equal(athensMinute(new Date('2026-08-25T11:15:00Z')), 14 * 60 + 15);

const astronomy = astronomySnapshot(summerDay, 14 * 60 + 15);
assert.ok(Math.abs(astronomy.sunAzimuth - 203.93) < 0.1);
assert.ok(Math.abs(astronomy.sunAltitude - 60.26) < 0.1);

const phases = upcomingMoonPhases(new Date('2026-08-01T00:00:00Z'));
assert.ok(Math.abs(phases[0].getTime() - new Date('2026-08-12T17:37:00Z').getTime()) < 2 * 60_000);
assert.ok(Math.abs(phases[1].getTime() - new Date('2026-08-20T02:46:00Z').getTime()) < 2 * 60_000);
assert.ok(Math.abs(phases[2].getTime() - new Date('2026-08-28T04:18:00Z').getTime()) < 2 * 60_000);

console.log('Evripos model reference checks passed.');

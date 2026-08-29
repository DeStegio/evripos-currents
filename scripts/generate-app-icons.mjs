/**
 * Renders every launcher asset from assets/images/evripos-icon.svg.
 *
 * The project has no SVG rasteriser, and the artwork is four primitives in a 64-unit
 * box, so they are drawn directly here: a rounded plate, a faint horizon rule, the
 * strait wave as a round-capped stroke, and the bridge marker. Sampling is 4x4
 * supersampled per pixel, which is what gives the curve its clean edge.
 *
 * Run with: node scripts/generate-app-icons.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Jimp from 'jimp-compact';

const IMAGES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');

const NAVY = [0x14, 0x39, 0x5c];
const PAPER = [0xf3, 0xef, 0xe6];
const ACCENT = [0xe4, 0x66, 0x1f];

const BOX = 64;
const PLATE_RADIUS = 14;
const HORIZON = { x1: 8, x2: 56, y: 32, halfWidth: 0.45, opacity: 0.34 };
const WAVE_HALF_WIDTH = 1.5;
const MARKER = { x: 18, y: 19.6, r: 4.2 };
const SUPERSAMPLE = 4;

/** `M4 32 C13 11 22 11 32 32` then the mirrored relative `c10 21 19 21 28 0`. */
const WAVE_SEGMENTS = [
  [[4, 32], [13, 11], [22, 11], [32, 32]],
  [[32, 32], [42, 53], [51, 53], [60, 32]],
];

const WAVE_POINTS = WAVE_SEGMENTS.flatMap(([p0, p1, p2, p3], index) => {
  const steps = 240;
  const points = [];
  for (let step = index === 0 ? 0 : 1; step <= steps; step += 1) {
    const t = step / steps;
    const u = 1 - t;
    points.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return points;
});

/**
 * Testing every sample against every segment is hundreds of millions of comparisons,
 * so segments are bucketed by x. A sample then looks at one bucket, and the bucket's
 * y-extent rejects the large majority of the canvas before any distance is computed.
 */
const BUCKET_MIN = -8;
const BUCKET_MAX = 72;
const BUCKETS = [];
for (let index = 0; index < BUCKET_MAX - BUCKET_MIN; index += 1) BUCKETS.push({ segments: [], yMin: Infinity, yMax: -Infinity });

for (let index = 1; index < WAVE_POINTS.length; index += 1) {
  const a = WAVE_POINTS[index - 1];
  const b = WAVE_POINTS[index];
  const from = Math.floor(Math.min(a[0], b[0]) - WAVE_HALF_WIDTH) - BUCKET_MIN;
  const to = Math.ceil(Math.max(a[0], b[0]) + WAVE_HALF_WIDTH) - BUCKET_MIN;
  for (let slot = Math.max(0, from); slot <= Math.min(BUCKETS.length - 1, to); slot += 1) {
    BUCKETS[slot].segments.push(a, b);
    BUCKETS[slot].yMin = Math.min(BUCKETS[slot].yMin, a[1], b[1]);
    BUCKETS[slot].yMax = Math.max(BUCKETS[slot].yMax, a[1], b[1]);
  }
}

/** True when the point is within the stroke; endpoints are included, which rounds the caps. */
function onWave(x, y) {
  const slot = Math.floor(x) - BUCKET_MIN;
  if (slot < 0 || slot >= BUCKETS.length) return false;
  const bucket = BUCKETS[slot];
  if (bucket.segments.length === 0) return false;
  if (y < bucket.yMin - WAVE_HALF_WIDTH || y > bucket.yMax + WAVE_HALF_WIDTH) return false;

  const limit = WAVE_HALF_WIDTH * WAVE_HALF_WIDTH;
  const { segments } = bucket;
  for (let index = 0; index < segments.length; index += 2) {
    const [ax, ay] = segments[index];
    const [bx, by] = segments[index + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared));
    const px = x - (ax + t * dx);
    const py = y - (ay + t * dy);
    if (px * px + py * py <= limit) return true;
  }
  return false;
}

function insidePlate(x, y) {
  const dx = Math.abs(x - BOX / 2) - (BOX / 2 - PLATE_RADIUS);
  const dy = Math.abs(y - BOX / 2) - (BOX / 2 - PLATE_RADIUS);
  if (dx <= 0 || dy <= 0) return Math.max(dx, dy) <= 0 || Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) <= PLATE_RADIUS;
  return Math.hypot(dx, dy) <= PLATE_RADIUS;
}

function over(base, colour, alpha) {
  if (base[3] === 0) return [colour[0], colour[1], colour[2], alpha];
  const out = alpha + base[3] * (1 - alpha);
  if (out === 0) return [0, 0, 0, 0];
  return [
    (colour[0] * alpha + base[0] * base[3] * (1 - alpha)) / out,
    (colour[1] * alpha + base[1] * base[3] * (1 - alpha)) / out,
    (colour[2] * alpha + base[2] * base[3] * (1 - alpha)) / out,
    out,
  ];
}

/**
 * @param {number} size          output edge in pixels
 * @param {object} options
 * @param {boolean} options.plate    draw the navy rounded plate behind the artwork
 * @param {number}  options.scale    shrink the artwork about the centre (adaptive safe zone)
 * @param {number[]|null} options.mono  flatten wave and marker to one colour
 * @param {boolean} options.horizon  include the faint horizon rule
 */
async function render(size, { plate = false, scale = 1, mono = null, horizon = true }) {
  const image = await Jimp.create(size, size, 0x00000000);
  const data = image.bitmap.data;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let sumA = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;

      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const u = ((px + (sx + 0.5) / SUPERSAMPLE) / size) * BOX;
          const v = ((py + (sy + 0.5) / SUPERSAMPLE) / size) * BOX;
          // Artwork coordinates, so shrinking scales stroke weights with the shapes.
          const gx = (u - BOX / 2) / scale + BOX / 2;
          const gy = (v - BOX / 2) / scale + BOX / 2;

          let pixel = [0, 0, 0, 0];
          if (plate && insidePlate(u, v)) pixel = over(pixel, NAVY, 1);
          if (horizon && gx >= HORIZON.x1 && gx <= HORIZON.x2 && Math.abs(gy - HORIZON.y) <= HORIZON.halfWidth) {
            pixel = over(pixel, mono ?? PAPER, HORIZON.opacity);
          }
          if (onWave(gx, gy)) pixel = over(pixel, mono ?? PAPER, 1);
          if (Math.hypot(gx - MARKER.x, gy - MARKER.y) <= MARKER.r) pixel = over(pixel, mono ?? ACCENT, 1);

          sumA += pixel[3];
          sumR += pixel[0] * pixel[3];
          sumG += pixel[1] * pixel[3];
          sumB += pixel[2] * pixel[3];
        }
      }

      const samples = SUPERSAMPLE * SUPERSAMPLE;
      const alpha = sumA / samples;
      const offset = (py * size + px) * 4;
      data[offset] = sumA === 0 ? 0 : Math.round(sumR / sumA);
      data[offset + 1] = sumA === 0 ? 0 : Math.round(sumG / sumA);
      data[offset + 2] = sumA === 0 ? 0 : Math.round(sumB / sumA);
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  return image;
}

async function solid(size, colour) {
  const image = await Jimp.create(size, size, 0x00000000);
  const data = image.bitmap.data;
  for (let index = 0; index < data.length; index += 4) {
    data[index] = colour[0];
    data[index + 1] = colour[1];
    data[index + 2] = colour[2];
    data[index + 3] = 255;
  }
  return image;
}

// Android masks the adaptive foreground down to roughly the central 66%, so the
// artwork is shrunk to fit the safe circle on every launcher shape.
const SAFE_ZONE = 0.62;

const outputs = [
  ['icon.png', () => render(1024, { plate: true })],
  ['favicon.png', () => render(64, { plate: true })],
  ['android-icon-background.png', () => solid(1024, NAVY)],
  ['android-icon-foreground.png', () => render(1024, { scale: SAFE_ZONE })],
  ['android-icon-monochrome.png', () => render(1024, { scale: SAFE_ZONE, mono: PAPER, horizon: false })],
  ['splash-icon.png', () => render(512, { horizon: false })],
];

for (const [name, build] of outputs) {
  const image = await build();
  await image.writeAsync(path.join(IMAGES, name));
  console.log(`wrote ${name} (${image.bitmap.width}x${image.bitmap.height})`);
}

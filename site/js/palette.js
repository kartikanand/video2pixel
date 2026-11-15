// Palette parsing, validation and fetching. Pure logic, no DOM access, so it
// can be unit tested with `node --test`.

export const MAX_COLORS = 64;
const MAX_RESPONSE_BYTES = 64 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const LOSPEC_HOSTS = new Set(['lospec.com', 'www.lospec.com']);
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,99}$/i;
const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export class PaletteError extends Error {
  name = 'PaletteError';
}

/** Parses one hex colour ("#abc", "abc", "AABBCC") to [r, g, b], or null. */
export function parseHex(text) {
  const match = HEX_RE.exec(String(text).trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
  const n = Number.parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Perceived brightness (Rec. 709 luma), 0-255. */
export function luma([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function toHex([r, g, b]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Validates a list of hex strings and returns an array of [r, g, b]. */
export function normalizeColors(list) {
  if (!Array.isArray(list)) throw new PaletteError('Palette has no colours.');
  const colors = list.map((entry) => {
    const rgb = parseHex(entry);
    if (!rgb) throw new PaletteError(`"${String(entry).slice(0, 20)}" is not a valid hex colour.`);
    return rgb;
  });
  if (colors.length < 2) throw new PaletteError('A palette needs at least two colours.');
  if (colors.length > MAX_COLORS) throw new PaletteError(`Palettes are limited to ${MAX_COLORS} colours.`);
  return colors;
}

/** Parses free text such as "#000, #fff" or a newline separated list. */
export function parsePaletteText(text) {
  const parts = String(text).split(/[\s,;]+/).filter(Boolean);
  return normalizeColors(parts);
}

/**
 * Extracts a Lospec palette slug from either a bare slug ("moondrom") or a
 * lospec.com palette URL. Anything else is rejected, so user input can never
 * redirect the request to another host.
 */
export function parseLospecInput(input) {
  const value = String(input).trim();
  if (!value) throw new PaletteError('Enter a Lospec palette URL or name.');

  if (SLUG_RE.test(value)) return value.toLowerCase();

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new PaletteError('That is not a lospec.com palette URL or name.');
  }
  if (url.protocol !== 'https:' || !LOSPEC_HOSTS.has(url.hostname) || url.port || url.username || url.password) {
    throw new PaletteError('Only https://lospec.com palettes are supported.');
  }
  const match = /^\/palette-list\/([^/]+?)(?:\.(?:json|csv|hex))?\/?$/i.exec(url.pathname);
  if (!match || !SLUG_RE.test(match[1])) {
    throw new PaletteError('Expected a URL like https://lospec.com/palette-list/moondrom');
  }
  return match[1].toLowerCase();
}

/** Orders colours dark to light, which is what the brightness mapping expects. */
export function sortByBrightness(colors) {
  return [...colors].sort((a, b) => luma(a) - luma(b));
}

/**
 * Builds a 256-entry lookup table mapping a brightness value to a colour index,
 * splitting the 0-255 range into equal bands, one per colour.
 */
export function buildLookup(count) {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) {
    lut[i] = Math.min(count - 1, Math.floor((i / 256) * count));
  }
  return lut;
}

export async function fetchLospecPalette(input, { signal } = {}) {
  const slug = parseLospecInput(input);
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`https://lospec.com/palette-list/${slug}.json`, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new PaletteError('Could not reach Lospec. Check your connection and try again.');
  }
  if (response.status === 404) throw new PaletteError(`No Lospec palette named "${slug}".`);
  if (!response.ok) throw new PaletteError(`Lospec returned an error (${response.status}).`);

  const body = await response.text();
  if (body.length > MAX_RESPONSE_BYTES) throw new PaletteError('Palette response was too large.');

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new PaletteError('Lospec returned something that is not a palette.');
  }
  const name = typeof data?.name === 'string' ? data.name.slice(0, 80) : slug;
  return { name, colors: normalizeColors(data?.colors) };
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PaletteError,
  buildLookup,
  fetchLospecPalette,
  normalizeColors,
  parseHex,
  parseLospecInput,
  parsePaletteText,
  sortByBrightness,
} from '../site/js/palette.js';

test('parseHex handles 3/6 digits, optional #, rejects junk', () => {
  assert.deepEqual(parseHex('#fff'), [255, 255, 255]);
  assert.deepEqual(parseHex('2A242B'), [42, 36, 43]);
  for (const bad of ['', 'red', '#ggg', '#12345', 'url(x)', '#fffffff']) assert.equal(parseHex(bad), null);
});

test('parseLospecInput accepts slugs and genuine lospec URLs', () => {
  assert.equal(parseLospecInput('Moondrom'), 'moondrom');
  assert.equal(parseLospecInput('https://lospec.com/palette-list/moondrom'), 'moondrom');
  assert.equal(parseLospecInput('https://www.lospec.com/palette-list/pico-8.json'), 'pico-8');
});

test('parseLospecInput rejects look-alike and hostile URLs', () => {
  const hostile = [
    'https://evil.com/?https://lospec.com/palette-list/x', // passed the old unanchored regex
    'https://lospec.com.evil.com/palette-list/x',
    'https://evil.com/lospec.com/palette-list/x',
    'https://lospecXcom/palette-list/x',
    'http://lospec.com/palette-list/x',
    'https://user:pw@lospec.com/palette-list/x',
    'https://lospec.com:8443/palette-list/x',
    'https://lospec.com/palette-list/../../admin',
    'https://lospec.com/other/x',
    'javascript:alert(1)',
    '',
  ];
  for (const input of hostile) assert.throws(() => parseLospecInput(input), PaletteError, input);
});

test('palette text parsing and limits', () => {
  assert.deepEqual(parsePaletteText('#000, #fff\n#f00'), [[0, 0, 0], [255, 255, 255], [255, 0, 0]]);
  assert.throws(() => parsePaletteText('#000'), PaletteError);
  assert.throws(() => parsePaletteText('#000, nope'), PaletteError);
  assert.throws(() => normalizeColors(Array(65).fill('#000')), PaletteError);
});

test('sortByBrightness orders dark to light without mutating input', () => {
  const input = [[255, 255, 255], [0, 0, 0], [128, 128, 128]];
  assert.deepEqual(sortByBrightness(input), [[0, 0, 0], [128, 128, 128], [255, 255, 255]]);
  assert.deepEqual(input[0], [255, 255, 255]);
});

test('buildLookup covers every brightness with equal bands', () => {
  const lut = buildLookup(4);
  assert.equal(lut[0], 0);
  assert.equal(lut[63], 0);
  assert.equal(lut[64], 1);
  assert.equal(lut[255], 3);
  assert.ok(lut.every((i) => i >= 0 && i < 4));
});

test('fetchLospecPalette validates the response', async (t) => {
  const respond = (body, init = {}) => t.mock.method(globalThis, 'fetch', async () => new Response(body, init));

  respond(JSON.stringify({ name: 'Test', colors: ['000000', 'ffffff'] }));
  assert.deepEqual(await fetchLospecPalette('test'), { name: 'Test', colors: [[0, 0, 0], [255, 255, 255]] });
  assert.equal(fetch.mock.calls[0].arguments[0], 'https://lospec.com/palette-list/test.json');

  respond('nope');
  await assert.rejects(fetchLospecPalette('test'), PaletteError);
  respond('{}', { status: 404 });
  await assert.rejects(fetchLospecPalette('test'), /No Lospec palette/);
  respond(JSON.stringify({ colors: ['zzz', '000'] }));
  await assert.rejects(fetchLospecPalette('test'), PaletteError);
  respond('x'.repeat(70_000));
  await assert.rejects(fetchLospecPalette('test'), /too large/);
});

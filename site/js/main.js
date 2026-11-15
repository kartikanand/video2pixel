import { CameraError, startCamera, stopCamera } from './camera.js';
import {
  PaletteError,
  fetchLospecPalette,
  normalizeColors,
  parsePaletteText,
  sortByBrightness,
  toHex,
} from './palette.js';
import { PRESETS } from './presets.js';
import { PixelRenderer } from './renderer.js';

const $ = (id) => document.getElementById(id);

const els = {
  video: $('source'),
  canvas: $('stage'),
  empty: $('empty'),
  status: $('status'),
  start: $('start'),
  stop: $('stop'),
  snapshot: $('snapshot'),
  mirror: $('mirror'),
  preset: $('preset'),
  lospecForm: $('lospec-form'),
  lospecInput: $('lospec-input'),
  customForm: $('custom-form'),
  customInput: $('custom-input'),
  sort: $('sort'),
  invert: $('invert'),
  size: $('size'),
  sizeOut: $('size-out'),
  swatches: $('swatches'),
  paletteName: $('palette-name'),
};

const renderer = new PixelRenderer(els.canvas);
const state = { name: '', colors: [], running: false, frameHandle: 0 };
let lospecRequest = null;

function say(message, { error = false } = {}) {
  els.status.textContent = message;
  els.status.dataset.kind = error ? 'error' : 'info';
}

/* ---------- palette ---------- */

function applyPalette(name, colors) {
  state.name = name;
  state.colors = colors;
  refreshPalette();
}

function refreshPalette() {
  let colors = state.colors;
  if (els.sort.checked) colors = sortByBrightness(colors);
  if (els.invert.checked) colors = [...colors].reverse();
  renderer.setPalette(colors);

  els.swatches.replaceChildren(
    ...colors.map((rgb) => {
      const li = document.createElement('li');
      const hex = toHex(rgb);
      li.style.setProperty('--swatch', hex);
      li.title = hex;
      li.setAttribute('aria-label', hex);
      return li;
    }),
  );
  els.paletteName.textContent = `${state.name} · ${colors.length} colours`;
  if (!state.running) renderer.clear(colors[0]);
}

async function run(task) {
  try {
    await task();
  } catch (error) {
    if (error?.name === 'AbortError') return;
    const known = error instanceof PaletteError || error instanceof CameraError;
    say(known ? error.message : 'Something went wrong.', { error: true });
    if (!known) console.error(error);
  }
}

for (const preset of PRESETS) els.preset.append(new Option(preset.name, preset.id));

els.preset.addEventListener('change', () => {
  const preset = PRESETS.find((p) => p.id === els.preset.value);
  if (!preset) return;
  applyPalette(preset.name, normalizeColors(preset.colors));
  say(`Loaded ${preset.name}.`);
});

els.lospecForm.addEventListener('submit', (event) => {
  event.preventDefault();
  lospecRequest?.abort();
  const controller = new AbortController();
  lospecRequest = controller;
  run(async () => {
    say('Loading palette…');
    const { name, colors } = await fetchLospecPalette(els.lospecInput.value, { signal: controller.signal });
    applyPalette(name, colors);
    els.preset.value = '';
    say(`Loaded ${name} from Lospec.`);
  });
});

els.customForm.addEventListener('submit', (event) => {
  event.preventDefault();
  run(async () => {
    applyPalette('Custom', parsePaletteText(els.customInput.value));
    els.preset.value = '';
    say('Loaded custom palette.');
  });
});

els.sort.addEventListener('change', refreshPalette);
els.invert.addEventListener('change', refreshPalette);

/* ---------- settings ---------- */

function updateSize() {
  const size = Number(els.size.value);
  renderer.setBlockSize(size);
  els.sizeOut.textContent = `${size}px`;
}
els.size.addEventListener('input', updateSize);
els.mirror.addEventListener('change', () => renderer.setMirror(els.mirror.checked));

/* ---------- camera loop ---------- */

function drawFrame() {
  if (!state.running) return;
  const { video } = els;
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    renderer.draw(video, video.videoWidth, video.videoHeight);
  }
  scheduleFrame();
}

function scheduleFrame() {
  const { video } = els;
  state.frameHandle = 'requestVideoFrameCallback' in video
    ? video.requestVideoFrameCallback(drawFrame)
    : requestAnimationFrame(drawFrame);
}

function setRunning(running) {
  state.running = running;
  els.start.disabled = running;
  els.stop.disabled = !running;
  els.snapshot.disabled = !running;
  els.empty.hidden = running;
}

els.start.addEventListener('click', () => run(async () => {
  els.start.disabled = true;
  say('Waiting for camera permission…');
  try {
    await startCamera(els.video);
  } catch (error) {
    els.start.disabled = false;
    throw error;
  }
  setRunning(true);
  say('Camera is on. Nothing leaves your device.');
  scheduleFrame();
}));

function stop() {
  if (!state.running) return;
  setRunning(false);
  if ('cancelVideoFrameCallback' in els.video) els.video.cancelVideoFrameCallback(state.frameHandle);
  else cancelAnimationFrame(state.frameHandle);
  stopCamera(els.video);
  refreshPalette();
  say('Camera stopped.');
}
els.stop.addEventListener('click', stop);
window.addEventListener('pagehide', stop);

els.snapshot.addEventListener('click', () => {
  els.canvas.toBlob((blob) => {
    if (!blob) return say('Could not save the image.', { error: true });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video2pixel-${Date.now()}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    say('Saved a snapshot.');
  }, 'image/png');
});

/* ---------- init ---------- */

updateSize();
renderer.setMirror(els.mirror.checked);
els.preset.value = PRESETS[0].id;
applyPalette(PRESETS[0].name, normalizeColors(PRESETS[0].colors));

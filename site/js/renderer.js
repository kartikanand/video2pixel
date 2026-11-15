// Turns video frames into pixel art on a canvas using only the 2D canvas API.
//
// Each frame is downscaled by the browser onto a tiny canvas, mapped through a
// brightness -> palette lookup table, then scaled back up without smoothing.

import { buildLookup } from './palette.js';

export class PixelRenderer {
  #output;
  #outputCtx;
  #small = document.createElement('canvas');
  #smallCtx = this.#small.getContext('2d', { willReadFrequently: true });
  #lut = buildLookup(2);
  #colors = [[0, 0, 0], [255, 255, 255]];
  #blockSize = 10;
  #mirror = true;
  #targetWidth = 640;

  constructor(outputCanvas) {
    this.#output = outputCanvas;
    this.#outputCtx = outputCanvas.getContext('2d', { alpha: false });
  }

  setPalette(colors) {
    this.#colors = colors;
    this.#lut = buildLookup(colors.length);
  }

  setBlockSize(size) {
    this.#blockSize = size;
  }

  setMirror(mirror) {
    this.#mirror = mirror;
  }

  /** Draws one frame from any CanvasImageSource with known dimensions. */
  draw(source, sourceWidth, sourceHeight) {
    if (!sourceWidth || !sourceHeight) return;

    const cols = Math.max(2, Math.round(this.#targetWidth / this.#blockSize));
    const rows = Math.max(2, Math.round((cols * sourceHeight) / sourceWidth));

    if (this.#small.width !== cols || this.#small.height !== rows) {
      this.#small.width = cols;
      this.#small.height = rows;
      this.#output.width = cols * this.#blockSize;
      this.#output.height = rows * this.#blockSize;
    }

    const ctx = this.#smallCtx;
    ctx.save();
    if (this.#mirror) {
      ctx.translate(cols, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(source, 0, 0, cols, rows);
    ctx.restore();

    const frame = ctx.getImageData(0, 0, cols, rows);
    const px = frame.data;
    const lut = this.#lut;
    const colors = this.#colors;
    for (let i = 0; i < px.length; i += 4) {
      const brightness = (px[i] * 54 + px[i + 1] * 183 + px[i + 2] * 19) >> 8;
      const [r, g, b] = colors[lut[brightness]];
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
    ctx.putImageData(frame, 0, 0);

    const out = this.#outputCtx;
    out.imageSmoothingEnabled = false;
    out.drawImage(this.#small, 0, 0, this.#output.width, this.#output.height);
  }

  /** Fills the canvas with a flat colour (used for the idle state). */
  clear(color = [0, 0, 0]) {
    this.#output.width = 640;
    this.#output.height = 480;
    this.#outputCtx.fillStyle = `rgb(${color.join(' ')})`;
    this.#outputCtx.fillRect(0, 0, 640, 480);
  }
}

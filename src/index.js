import P5 from 'p5';

/**
 *
 * @param {number} bright - Brightness value of pixel, between [0-255].
 * @param {string[]} palette - Array of colors to map pixel brightness to.
 * @returns {string} Hex representation of color
 */
function getColorFromPalette(bright, palette) {
  const intervals = palette.length;
  /**
   * For 'n' the intervals are -
   * 0(0/n) - 1/n
   * 1/2 - 2/n
   * 3/n - 4/n
   * ...
   * n-1/n - 1(n/n)
   */
  let cIndex = -1;
  for (let i = 0; i < intervals; i += 1) {
    if (bright <= 255 * ((i + 1) / intervals)) {
      cIndex = i;
      break;
    }
  }

  return palette[cIndex];
}

/**
 *
 * @param {string} Url.
 * @returns {Boolean}
 */
function checkIsLospecUrl(url) {
  const re = /https:\/\/lospec.com\/palette-list\//;
  return !!re.test(url);
}

const getConfig = (() => {
  const config = {
    windowWidth: 640,
    windowHeight: 480,
    video: '',
    palette: '',
    pixelSize: 10,
    videoReady: false,
    gapx: 0,
    gapy: 0,
  };

  return () => config;
})();

function loadPaletteUrl(p, paletteUrl) {
  const jsonPaletteUrl = `${paletteUrl}.json`;
  p.loadJSON(jsonPaletteUrl, (jsonData) => {
    const config = getConfig();
    config.palette = jsonData.colors.map((colorCode) =>
      p.color(`#${colorCode}`)
    );
  });
}

function initPalette(p) {
  const paletteUrl = 'https://lospec.com/palette-list/moondrom';
  loadPaletteUrl(p, paletteUrl);
}

function handleVideoLoadedCallback(p, config) {
  if (!config.video) {
    return;
  }

  const videoWidth = config.video.width;
  const videoHeight = config.video.height;
  const aspectRatio = Math.floor(videoWidth / videoHeight);

  const newVideoWidth = Math.floor(config.windowWidth / config.pixelSize);
  const newVideoHeight = Math.floor(newVideoWidth / aspectRatio);

  if (newVideoWidth !== videoWidth || newVideoHeight !== videoHeight) {
    config.video.size(newVideoWidth, newVideoHeight);
  }

  config.video.loop();
  config.video.hide();
  config.video.volume(0);

  config.windowHeight = Math.floor(config.windowWidth / aspectRatio);

  p.resizeCanvas(config.windowWidth, config.windowHeight);

  config.videoReady = true;
}

function handleLoadWebcam(p, ev) {
  ev.preventDefault();

  const config = getConfig();
  config.videoReady = false;
  config.video = p.createCapture(p.VIDEO, () => {
    if (!config.palette || config.palette.length === 0) {
      initPalette(p);
    }

    handleVideoLoadedCallback(p, config);
  });
}

function handleLoadPaletteUrl(p, ev) {
  ev.preventDefault();

  const palette = document.getElementById('js-palette').value;
  if (!palette || palette.length === 0) {
    return;
  }

  const paletteUrl = checkIsLospecUrl(palette)
    ? palette
    : `https://lospec.com/palette-list/${palette}`;

  loadPaletteUrl(paletteUrl);
}

function handleLoadPaletteList(p, ev) {
  ev.preventDefault();

  const paletteList = document.getElementById('js-palette-list').value;
  if (!paletteList || paletteList.length === 0) {
    return;
  }

  const palette = paletteList
    .split(',')
    .map((s) => s.strip())
    .map((s) => s.toLowerCase())
    .map((hexCode) => p.color(hexCode));

  const config = getConfig();
  config.palette = palette;
}

function handleChangePixelSize(p, ev) {
  ev.preventDefault();

  const pixelSize = ev.target.value;
  const config = getConfig();

  config.pixelSize = parseInt(pixelSize, 10);
  config.videoReady = false;

  handleVideoLoadedCallback(p, config);
}

function handleChangeGap(p, ev) {
  ev.preventDefault();

  const { name } = ev.target;
  const val = parseInt(ev.target.value, 10);

  const config = getConfig();

  config[name] = val;
  config.videoReady = false;

  handleVideoLoadedCallback(p, config);
}

function createPixel(p, x, y, gapx, gapy, pixelSize, pixelColor) {
  p.noStroke();
  p.fill(pixelColor);
  p.rect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
}

const initSketch = (p) => {
  p.setup = () => {
    const config = getConfig();

    // Set the pixel density to 1 to ease up things
    p.pixelDensity(1);
    p.createCanvas(config.windowWidth, config.windowHeight);
  };

  p.draw = () => {
    const config = getConfig();
    if (!config.videoReady || !config.palette || !(config.palette.length > 0)) {
      p.push();
      p.textSize(32);
      p.fill(p.color('black'));
      p.text('No Video and/or Colors', 0, 100);
      p.pop();
      return;
    }

    p.background(getColorFromPalette(255, config.palette));

    const { gapx } = config;
    const { gapy } = config;

    config.video.loadPixels();
    for (let y = 0; y < config.video.height; y += 1) {
      for (let x = 0; x < config.video.width; x += 1) {
        const pixelIndex = (x + y * config.video.width) * 4;
        const r = config.video.pixels[pixelIndex + 0];
        const g = config.video.pixels[pixelIndex + 1];
        const b = config.video.pixels[pixelIndex + 2];

        const bright = (r + g + b) / 3;
        const color = getColorFromPalette(bright, config.palette);

        createPixel(p, x, y, gapx, gapy, config.pixelSize, color);
      }
    }
  };
};

document.addEventListener('DOMContentLoaded', () => {
  const canvasRoot = 'video-root';
  const p = new P5(initSketch, canvasRoot);

  document
    .getElementById('js-load-webcam')
    .addEventListener('click', handleLoadWebcam.bind(null, p));

  document
    .getElementById('js-load-palette')
    .addEventListener('click', handleLoadPaletteUrl.bind(null, p));

  document
    .getElementById('js-load-palette-list')
    .addEventListener('click', handleLoadPaletteList.bind(null, p));

  document
    .getElementById('js-change-pixel-size')
    .addEventListener('input', handleChangePixelSize.bind(null, p));

  [...document.querySelectorAll('.js-change-gap')].forEach((slider) => {
    slider.addEventListener('input', handleChangeGap.bind(null, p));
  });
});

import P5 from 'p5';
import Palette from './Palette';
import Video from './Video';

const PALETTE_URL = 'https://lospec.com/palette-list/moondrom';

export default class App {
  constructor(appRoot) {
    // Start and stop mechanism
    this.ready = false;

    // Core config
    this.windowWidth = 640;
    this.windowHeight = 480;
    this.video = null;
    this.palette = null;
    this.pixelSize = 10;

    // Initialize P5 library
    this.p = new P5((p) => {
      p.setup = () => {
        // Set the pixel density to 1 to ease up things
        p.pixelDensity(1);
        p.createCanvas(this.windowWidth, this.windowHeight);
      };

      p.draw = () => {
        if (this.ready && this.video) {
          this.video.draw();
        }
      };
    }, appRoot);

    // Add event listeners
    document
      .getElementById('js-load-webcam')
      .addEventListener('click', this.handleLoadWebcam.bind(this));

    document
      .getElementById('js-load-palette')
      .addEventListener('click', this.handleLoadPaletteUrl.bind(this));

    document
      .getElementById('js-load-palette-list')
      .addEventListener('click', this.handleLoadPaletteList.bind(this));
  }

  start() {
    this.ready = true;
  }

  stop() {
    this.ready = false;
  }

  async handleLoadWebcam(ev) {
    ev.preventDefault();

    this.palette = await Palette.FromLospec(this.p, PALETTE_URL);
    this.video = await Video.FromWebcam(
      this.p,
      this.palette,
      this.pixelSize,
      this.windowWidth,
      this.windowHeight
    );
    this.video.start();
  }

  async handleLoadPaletteUrl(ev) {
    ev.preventDefault();

    const paletteInput = document.getElementById('js-palette').value;
    if (!paletteInput || paletteInput.length === 0) {
      return;
    }

    this.palette = await Palette.FromLospec(this.p, paletteInput);
    this.video.setPalette(this.palette);
  }

  async handleLoadPaletteList(ev) {
    ev.preventDefault();

    const paletteList = document.getElementById('js-palette-list').value;
    if (!paletteList || paletteList.length === 0) {
      return;
    }

    this.palette = Palette.FromText(this.p, paletteList);
    this.video.setPalette(this.palette);
  }

  async handleChangePixelSize(ev) {
    ev.preventDefault();

    this.pixelSize = parseInt(ev.target.value, 10);
    this.video.setPixelSize(this.pixelSize);
  }
}

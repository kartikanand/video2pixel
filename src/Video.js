export default class Video {
  constructor(p, video, palette, pixelSize, windowWidth, windowHeight) {
    this.ready = false;

    this.p = p;
    this.video = video;
    this.palette = palette;
    this.pixelSize = pixelSize;
    this.windowWidth = windowWidth;
    this.windowHeight = windowHeight;
  }

  draw() {
    if (!this.ready) {
      this.p.push();
      this.p.textSize(32);
      this.p.fill(this.p.color('black'));
      this.p.text('No Video and/or Colors', 0, 100);
      this.p.pop();

      return;
    }

    this.p.background(this.palette.getColor(255));

    this.video.loadPixels();
    for (let y = 0; y < this.video.height; y += 1) {
      for (let x = 0; x < this.video.width; x += 1) {
        const pixelIndex = (x + y * this.video.width) * 4;
        const r = this.video.pixels[pixelIndex + 0];
        const g = this.video.pixels[pixelIndex + 1];
        const b = this.video.pixels[pixelIndex + 2];

        const brightness = (r + g + b) / 3;
        this.createPixel(x, y, brightness);
      }
    }
  }

  start() {
    if (!this.video) {
      return;
    }

    this.video.loop();
    this.video.hide();
    this.video.volume(0);

    const videoWidth = this.video.width;
    const videoHeight = this.video.height;
    const aspectRatio = Math.floor(videoWidth / videoHeight);

    const newVideoWidth = Math.floor(this.windowWidth / this.pixelSize);
    const newVideoHeight = Math.floor(newVideoWidth / aspectRatio);

    if (newVideoWidth !== videoWidth || newVideoHeight !== videoHeight) {
      this.video.size(newVideoWidth, newVideoHeight);
    }

    this.windowHeight = Math.floor(this.windowWidth / aspectRatio);

    this.p.resizeCanvas(this.windowWidth, this.windowHeight);

    this.ready = true;
  }

  setPixelSize(pixelSize) {
    this.pixelSize = pixelSize;
  }

  setPalette(palette) {
    this.palette = palette;
  }

  createPixel(x, y, brightness) {
    const pixelColor = this.palette.getColor(brightness);

    this.p.noStroke();
    this.p.fill(pixelColor);
    this.p.rect(
      x * this.pixelSize,
      y * this.pixelSize,
      this.pixelSize,
      this.pixelSize
    );
  }

  static async FromWebcam(p, palette, pixelSize, windowWidth, windowHeight) {
    return new Promise((resolve) => {
      const videoCapture = p.createCapture(p.VIDEO, () => {
        const video = new Video(
          p,
          videoCapture,
          palette,
          pixelSize,
          windowWidth,
          windowHeight
        );

        resolve(video);
      });
    });
  }
}

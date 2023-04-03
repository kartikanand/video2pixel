export default class Palette {
  constructor(p, palette) {
    this.p = p;
    this.palette = palette;
  }

  /**
   *
   * @param {number} bright - Brightness value of pixel, between [0-255].
   * @param {string[]} palette - Array of colors to map pixel brightness to.
   * @returns {string} Hex representation of color
   */
  getColor(bright) {
    const intervals = this.palette.length;

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

    return this.palette[cIndex];
  }

  invert() {
    this.palette = this.palette.reverse();
  }

  /**
   *
   * @param {string} Url.
   * @returns {Boolean}
   */
  static checkIsLospecUrl(url) {
    const re = /https:\/\/lospec.com\/palette-list\//;
    return !!re.test(url);
  }

  static async FromLospec(p, lospec) {
    const paletteUrl = Palette.checkIsLospecUrl(lospec)
      ? lospec
      : `https://lospec.com/palette-list/${lospec}`;

    const jsonPaletteUrl = `${paletteUrl}.csv`;
    const resp = await fetch(jsonPaletteUrl);
    const data = await resp.text();

    const palette = data
      .split(',')
      .slice(2)
      .map((colorCode) => p.color(`#${colorCode}`));

    return new Palette(p, palette);
  }

  static FromText(p, paletteList) {
    if (!paletteList || paletteList.length === 0) {
      throw new Error('Empty palette list');
    }

    const palette = paletteList
      .split(',')
      .map((s) => s.trim())
      .map((s) => s.toLowerCase())
      .map((hexCode) => p.color(hexCode));

    return new Palette(p, palette);
  }
}

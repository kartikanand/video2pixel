# video2pixel

Turn your webcam into retro pixel art, coloured with any palette from [Lospec](https://lospec.com/palette-list).

**Demo: <https://kartikanand.github.io/video2pixel/>**

Everything runs in your browser. Video never leaves your device; the only network request the app makes is fetching a palette from lospec.com when you ask for one.

## Features

- Live pixelation with an adjustable pixel size
- Built-in presets (Moondrom, Game Boy, CGA, PICO-8, ...) that work offline
- Load any Lospec palette by name or URL, or paste your own hex colours
- Sort palette dark to light, or invert it
- Mirror view and one-click PNG snapshots

## Development

There is no build step and no dependencies. The site is plain HTML, CSS and ES modules in [`site/`](site).

```sh
python3 -m http.server -d site 8000   # then open http://localhost:8000
node --test tests/                    # unit tests, needs Node 22+
```

Pushes to `main` run the tests and deploy `site/` to GitHub Pages (see [`.github/workflows/pages.yml`](.github/workflows/pages.yml)).

## Security notes

- A strict Content-Security-Policy (`<meta>` in `index.html`) allows only same-origin scripts and styles, and network access only to `https://lospec.com`.
- Lospec input is parsed with `new URL()`, restricted to `https://lospec.com/palette-list/<slug>` and re-built from the slug, so it cannot point the request elsewhere. Responses are size-limited, time-limited and every colour is validated.
- No third-party scripts, styles or fonts are loaded.
- GitHub Actions are pinned to commit SHAs and the workflow runs with read-only permissions except for the deploy job, which never runs on pull requests.

## License

MIT

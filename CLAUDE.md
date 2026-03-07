# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Magnet Player is a browser-based torrent streaming site built with **WebTorrent** and **WebRTC**. Users paste a magnet URI, torrent file URL, or info hash, and the largest file in the torrent is streamed directly in the browser. Only WebRTC-seeded torrents are supported.

Hosted on GitHub Pages at `https://ferrolho.github.io/magnet-player/`.

## Build & Development

This is a **Jekyll** site with **Browserify** for JS bundling.

```bash
# Install Ruby dependencies
bundle install

# Install JS dependencies (for browserify)
npm install

# Bundle JS (main.js -> bundle.js)
browserify js/main.js -o js/bundle.js

# Serve locally
bundle exec jekyll serve
```

The site is served from the `gh-pages` branch (which is also the main/only branch).

## Architecture

- **Jekyll** handles site generation (`_config.yml`, `_layouts/`, `_includes/`, `_sass/`)
- **`js/webtorrent.js`** — Core torrent logic: creates a WebTorrent client, handles form/URL-hash input, downloads torrents, streams the largest file into `#output`, and updates download statistics (peers, progress, speed, ETA)
- **`js/main.js`** — UI glue: clipboard functionality, responsive input sizing, kudos widget. Requires `webtorrent.js` and is the Browserify entry point
- **`js/bundle.js`** — Browserify output (committed to repo, must be regenerated after JS changes)
- **WebTorrent** is loaded from CDN (`cdn.jsdelivr.net`), not bundled locally
- jQuery, Bootstrap JS, clipboard.js, and kudosplease are vendored in `js/` or loaded from CDN
- Styling uses the Jekyll **minima** theme with custom SCSS in `_sass/player.scss`

## Key Details

- After editing `js/main.js` or `js/webtorrent.js`, you must run `browserify js/main.js -o js/bundle.js` to regenerate the bundle
- Torrent sharing works via URL hash fragment (e.g., `#<infoHash>`), parsed in `onHashChange()` in `webtorrent.js`
- The announce tracker list in `webtorrent.js` is filtered to WebSocket-only (`wss://`) trackers for browser compatibility

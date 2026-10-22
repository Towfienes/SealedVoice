# Visual asset credits

All seal, keyhole, envelope, arrow, blocked-path and folded-F shapes were drawn directly as SVG for SealedVoice / Team Fprinciples. No stock photography, downloaded icon pack, traced logo or image-generation output is used. PNGs are raster exports of those SVG sources.

## Asset inventory

| Asset | Source / authorship |
|---|---|
| [`logo-mark.svg`](../public/brand/logo-mark.svg), [`app/icon.svg`](../app/icon.svg) | Original wax-seal/keyhole geometry, created for SealedVoice. Checked at 32px. |
| [`logo-wordmark.svg`](../public/brand/logo-wordmark.svg), [`logo-wordmark-light.svg`](../public/brand/logo-wordmark-light.svg) | Original seal plus **Fraunces** lettering converted to vector paths. |
| [`team-fprinciples.svg`](../public/brand/team-fprinciples.svg) | Original folded-F emblem and **Public Sans** lettering for Team Fprinciples · RMIT SGS. |
| [`architecture.svg`](architecture.svg), [`architecture.png`](architecture.png) | Original four-layer diagram derived from the project's spec/plan and vault interfaces. **Fraunces**, **Public Sans** and **IBM Plex Mono** lettering. Red crosses mark design enforcement points, not captured live verdicts. |
| [`00-title.svg`](video/00-title.svg), [`00-title.png`](video/00-title.png) | Original opening card, original seal and outlined **Fraunces / Public Sans**. |
| [`01-possibility.svg`](video/01-possibility.svg), [`01-possibility.png`](video/01-possibility.png) | Original card; dialogue from the team's [demo script](DEMO_SCRIPT.md). |
| [`02-constraint.svg`](video/02-constraint.svg), [`02-constraint.png`](video/02-constraint.png) | Original identity-envelope drawing; wording supplied in the round-two brief. The document is a synthetic illustration. |
| [`03-prototype.svg`](video/03-prototype.svg), [`03-prototype.png`](video/03-prototype.png) | Original three-envelope drawing, based on the spec's role separation. |
| [`04-what-changes.svg`](video/04-what-changes.svg), [`04-what-changes.png`](video/04-what-changes.png) | Original typographic card based on the prototype's shared-authority goal and documented limits. |
| [`05-outro.svg`](video/05-outro.svg), [`05-outro.png`](video/05-outro.png) | Original team emblem and seal. “Built with TideCloak” is a custom typographic credit badge, not a reproduction of Tide's official logo. Repository URL belongs to this project. |
| [`og.svg`](../public/brand/og.svg), [`og.png`](../public/brand/og.png) | Original social preview; same seal and outlined **Fraunces / Public Sans**. |

The palette is taken exactly from `app/sealedvoice.css`: paper `#f5f1e8`, paper-2 `#ece6d8`, card `#fffdf8`, ink `#17212b`, ink-2 `#414d59`, navy `#1f3a5f`, navy-2 `#12233f`, wax `#a8322a`, wax-dark `#8a2822`.

## Font sources and retained notices

The typefaces match `app/layout.tsx`. They are **not original project fonts**. Their glyphs are outlined in each SVG, so no installed font, remote font request or fallback is required to view the finished assets. No modified font binary is distributed.

Sources are pinned to Google Fonts revision [`45e3d5269e4a17d823f6d84470bc084dc5ae46f6`](https://github.com/google/fonts/tree/45e3d5269e4a17d823f6d84470bc084dc5ae46f6); source-font SHA-256 hashes are recorded in [`brand/asset-manifest.json`](brand/asset-manifest.json).

| Typeface | Copyright / source | Licence notice |
|---|---|---|
| Fraunces | Copyright 2018 The Fraunces Project Authors ([upstream](https://github.com/undercasetype/Fraunces)); [source TTF](https://raw.githubusercontent.com/google/fonts/45e3d5269e4a17d823f6d84470bc084dc5ae46f6/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf). Display instance: weight 700, optical size 72, SOFT 0, WONK 1. | SIL Open Font License 1.1; [full notice](brand/licenses/Fraunces-OFL.txt). |
| Public Sans | Copyright 2015 The Public Sans Project Authors ([upstream](https://github.com/uswds/public-sans)); [source TTF](https://raw.githubusercontent.com/google/fonts/45e3d5269e4a17d823f6d84470bc084dc5ae46f6/ofl/publicsans/PublicSans%5Bwght%5D.ttf). Weights 400 and 600. | SIL Open Font License 1.1; [full notice](brand/licenses/PublicSans-OFL.txt). |
| IBM Plex Mono | Copyright © 2017 IBM Corp., reserved font name “Plex”; [source TTF](https://raw.githubusercontent.com/google/fonts/45e3d5269e4a17d823f6d84470bc084dc5ae46f6/ofl/ibmplexmono/IBMPlexMono-Regular.ttf). Regular weight, used for the actual HTTP endpoint label. | SIL Open Font License 1.1; [full notice](brand/licenses/IBMPlexMono-OFL.txt). |

The existing README's official “Built with TideCloak” badge remains hosted at [tide.org/badges/built-with-tidecloak.svg](https://tide.org/badges/built-with-tidecloak.svg). TideCloak and RMIT SGS are named for attribution; no official university crest is incorporated into the new artwork.

## Editing and exports

See [`brand/README.md`](brand/README.md) for integration, dimensions, regeneration and verification. The SVG files are the masters; PNG files are ready for the video editor. Original lettering remains accessible through SVG titles/descriptions and path-group labels.

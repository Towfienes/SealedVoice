# SealedVoice visual handoff

The existing “sealed envelope + wax seal + institutional trust” direction is retained: a paper-white keyhole pressed into an irregular wax-red seal, with Fraunces display type and Public Sans body text. The folded-F team emblem is separate from the product seal. All geometry is original; font sources/notices are in [CREDITS.md](../CREDITS.md).

## Integration

- **UI header:** `/brand/logo-mark.svg`, 96×96 viewBox, transparent. Use at 32–40px and keep an accessible name on the surrounding product link. The UI stream owns integration; this branch edits no page or CSS.
- **Wordmark:** `/brand/logo-wordmark.svg` for paper/light backgrounds; `/brand/logo-wordmark-light.svg` for navy/dark backgrounds. Text is outlined, not a font dependency.
- **Favicon:** `app/icon.svg`; Next exposes the icon automatically. Do not also create a competing app icon file.
- **Team:** `/brand/team-fprinciples.svg` for the outro/editor. The symbol is an original F with a folded corner; it is not an RMIT crest.
- **Social preview:** `/brand/og.png`, exactly **1200×630**, with editable `og.svg`. Adding Open Graph metadata is a separate UI/lead integration step; merely shipping this file does not change social metadata.
- **Architecture:** `docs/architecture.svg` plus a **1920×1080** PNG for the editor. It describes the design and intended blocks; it does not invent actual Tide error text or certify live results.

## Video cards

Each master and PNG is **1920×1080**, opaque, with all lettering outlined. Import the PNGs at native dimensions without stretching. Keep a short transition within the existing 120-second edit; title cards do not add extra runtime to the script.

| File stem under `docs/video/` | Use in the existing script |
|---|---|
| `00-title` | Opening logo/tagline; transition into Possibility. |
| `01-possibility` | The opening Head of School / IT scenario, 0:00–0:20. The narration must qualify its premise as the script requires. |
| `02-constraint` | Named-report constraint, 0:20–0:40. |
| `03-prototype` | Three-envelope and TideCloak/Forseti role explanation, 0:40–1:43. |
| `04-what-changes` | Shared-authority goal and remaining limits, 1:43–2:00. |
| `05-outro` | End within the same two-minute limit; team, TideCloak credit and repo URL. |

These are design/title assets, not UI screenshots or live security evidence. A simulated app recording still needs its persistent SIMULATED label. The mandatory opening/tagline come from the brief; the identity guardian, browser, metadata and deletion caveats remain in the script/README.

## Regenerate

Requires Python 3 with fontTools available and `rsvg-convert` on PATH; no application dependencies or package-manager changes are needed. Download the three pinned source TTFs linked in [CREDITS.md](../CREDITS.md) into a local font directory as `fraunces.ttf`, `publicsans.ttf` and `mono.ttf`. Source hashes are recorded in `asset-manifest.json`.

```bash
python3 docs/brand/generate_assets.py --fonts /path/to/local-fonts
python3 docs/brand/verify_assets.py
ruff check docs/brand
ruff format --check docs/brand
```

The generator instantiates the declared variable-font axes, converts glyphs to paths, checks every text line against its canvas, and exports the SVG masters/PNG copies. It stops on missing glyphs rather than silently substituting another font.

## Visual checks

The seal was inspected at 32px and 384px. All six video PNGs, the social image and architecture were inspected at full export size. The first diagram draft had branch lines crossing denial captions; those lines were shortened before final export. Final checks include browser rendering, font-independent SVG structure and exact PNG dimensions. Build/unit results and live README evidence are recorded in the PR; no live result is inferred from these illustrations.

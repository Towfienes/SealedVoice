"""Render original SealedVoice vector artwork with outlined, OFL-licensed type.

Usage: python3 docs/brand/generate_assets.py --fonts /path/to/font-directory
The directory contains fraunces.ttf, publicsans.ttf and mono.ttf from CREDITS.md.
Requires existing fontTools and rsvg-convert; no application dependencies change.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import subprocess
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
PAPER = "#f5f1e8"
PAPER2 = "#ece6d8"
WHITE = "#fffdf8"
NAVY = "#12233f"
BLUE = "#1f3a5f"
INK = "#17212b"
MUTED = "#414d59"
RED = "#a8322a"
DARK_RED = "#8a2822"
FONT_COMMIT = "45e3d5269e4a17d823f6d84470bc084dc5ae46f6"
FONT_PATHS = {
    "fraunces": "ofl/fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf",
    "publicsans": "ofl/publicsans/PublicSans[wght].ttf",
    "mono": "ofl/ibmplexmono/IBMPlexMono-Regular.ttf",
}


def number(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


class Lettering:
    """Use genuine font glyph outlines, not substituted browser fonts."""

    def __init__(self, path: Path, axes: dict[str, float] | None = None) -> None:
        font = TTFont(path)
        self.font = instantiateVariableFont(font, axes, inplace=False) if axes else font
        self.glyphs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.units = self.font["head"].unitsPerEm
        self.cache: dict[str, tuple[str, tuple[float, float, float, float] | None]] = {}

    def width(self, text: str, size: float) -> float:
        return (
            sum(self.font["hmtx"].metrics[self.cmap[ord(c)]][0] for c in text)
            * size
            / self.units
        )

    def paths(
        self, text: str, x: float, y: float, size: float
    ) -> tuple[str, list[float]]:
        cursor = x
        scale = size / self.units
        pieces: list[str] = []
        boxes: list[tuple[float, float, float, float]] = []
        for char in text:
            glyph = self.cmap[ord(char)]
            if glyph not in self.cache:
                pen = SVGPathPen(self.glyphs, ntos=number)
                self.glyphs[glyph].draw(pen)
                bounds = BoundsPen(self.glyphs)
                self.glyphs[glyph].draw(bounds)
                self.cache[glyph] = (pen.getCommands(), bounds.bounds)
            commands, bounds = self.cache[glyph]
            if commands:
                pieces.append(
                    f'<path transform="translate({number(cursor)} {number(y)}) scale({scale:.8f} {-scale:.8f})" d="{commands}"/>'
                )
            if bounds:
                left, bottom, right, top = bounds
                boxes.append(
                    (
                        cursor + left * scale,
                        y - top * scale,
                        cursor + right * scale,
                        y - bottom * scale,
                    )
                )
            cursor += self.font["hmtx"].metrics[glyph][0] * scale
        box = [
            min(b[0] for b in boxes),
            min(b[1] for b in boxes),
            max(b[2] for b in boxes),
            max(b[3] for b in boxes),
        ]
        return "".join(pieces), box


@dataclass
class Artwork:
    width: int
    height: int
    title: str
    description: str
    parts: list[str] = field(default_factory=list)
    labels: list[dict[str, Any]] = field(default_factory=list)

    def add(self, markup: str) -> None:
        self.parts.append(markup)

    def rect(
        self,
        x: float,
        y: float,
        width: float,
        height: float,
        fill: str,
        radius: float = 0,
    ) -> None:
        self.add(
            f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="{radius}" fill="{fill}"/>'
        )

    def text(
        self,
        face: Lettering,
        text: str,
        x: float,
        y: float,
        size: float,
        fill: str = NAVY,
        max_width: float | None = None,
    ) -> None:
        if max_width and face.width(text, size) > max_width:
            size *= max_width / face.width(text, size)
        paths, bounds = face.paths(text, x, y, size)
        self.add(
            f'<g fill="{fill}" aria-label="{html.escape(text, quote=True)}">{paths}</g>'
        )
        self.labels.append(
            {
                "text": text,
                "size": round(size, 2),
                "bounds": [round(v, 2) for v in bounds],
            }
        )
        if (
            bounds[0] < -1
            or bounds[1] < -1
            or bounds[2] > self.width + 1
            or bounds[3] > self.height + 1
        ):
            raise ValueError(f"Text falls outside {self.title}: {text}: {bounds}")

    def xml(self) -> str:
        return f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.width}" height="{self.height}" viewBox="0 0 {self.width} {self.height}" role="img" aria-labelledby="title desc"><title id="title">{html.escape(self.title)}</title><desc id="desc">{html.escape(self.description)} Lettering is outlined; no external font is required.</desc>{"".join(self.parts)}</svg>\n'


def inner_svg(path: Path) -> str:
    root = ET.parse(path).getroot()
    return "".join(
        ET.tostring(child, encoding="unicode")
        for child in root
        if child.tag.rsplit("}", 1)[-1] not in {"title", "desc"}
    )


def seal(canvas: Artwork, x: float, y: float, size: float) -> None:
    canvas.add(
        f'<g transform="translate({x} {y}) scale({size / 96})">{inner_svg(ROOT / "public/brand/logo-mark.svg")}</g>'
    )


def cross(canvas: Artwork, x: float, y: float, size: float = 22) -> None:
    canvas.add(
        f'<path d="M{x - size} {y - size}L{x + size} {y + size}M{x + size} {y - size}L{x - size} {y + size}" fill="none" stroke="{RED}" stroke-width="9" stroke-linecap="round"/>'
    )


def envelope(
    canvas: Artwork, x: float, y: float, width: float, height: float, body: str = PAPER2
) -> None:
    canvas.rect(x, y, width, height, body, 9)
    canvas.add(
        f'<path d="M{x} {y}L{x + width / 2} {y + height * 0.52}L{x + width} {y}" fill="{WHITE}"/>'
    )
    canvas.add(
        f'<path d="M{x} {y + height}L{x + width * 0.36} {y + height * 0.46}M{x + width} {y + height}L{x + width * 0.64} {y + height * 0.46}" fill="none" stroke="{NAVY}" stroke-width="3" opacity=".22"/>'
    )
    seal(canvas, x + width / 2 - height * 0.19, y + height * 0.32, height * 0.38)


def team_symbol(
    canvas: Artwork, x: float, y: float, size: float, light: bool = False
) -> None:
    fill = WHITE if light else NAVY
    canvas.add(
        f'<g transform="translate({x} {y}) scale({size / 96})"><path fill="{fill}" d="M8 8H76V27H29V44H65V62H29V88H8Z"/><path fill="{RED}" d="M76 8H94V27Z"/></g>'
    )


def save(
    canvas: Artwork, relative: str, manifest: list[dict[str, Any]], png: bool = False
) -> None:
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(canvas.xml(), encoding="utf-8")
    ET.parse(path)
    if png:
        subprocess.run(
            ["rsvg-convert", str(path), "-o", str(path.with_suffix(".png"))], check=True
        )
    manifest.append(
        {
            "file": relative,
            "width": canvas.width,
            "height": canvas.height,
            "labels": canvas.labels,
        }
    )


def make_logos(
    display: Lettering, body: Lettering, bold: Lettering, manifest: list[dict[str, Any]]
) -> tuple[Artwork, Artwork]:
    width = math.ceil(184 + display.width("SealedVoice", 96) + 24)
    logo = Artwork(
        width, 160, "SealedVoice", "The original wax-seal mark and Fraunces wordmark."
    )
    seal(logo, 16, 16, 128)
    logo.text(display, "SealedVoice", 184, 115, 96)
    save(logo, "public/brand/logo-wordmark.svg", manifest)
    light = Artwork(width, 160, "SealedVoice, light wordmark", logo.description)
    seal(light, 16, 16, 128)
    light.text(display, "SealedVoice", 184, 115, 96, WHITE)
    save(light, "public/brand/logo-wordmark-light.svg", manifest)
    team = Artwork(
        700,
        160,
        "Team Fprinciples · RMIT SGS",
        "An original folded-F symbol and team name; no university crest or endorsement is implied.",
    )
    team_symbol(team, 16, 18, 112)
    team.text(bold, "Fprinciples", 164, 82, 64)
    team.text(body, "Team Fprinciples · RMIT SGS", 164, 126, 26)
    save(team, "public/brand/team-fprinciples.svg", manifest)
    return logo, team


def architecture(
    display: Lettering,
    body: Lettering,
    bold: Lettering,
    mono: Lettering,
    manifest: list[dict[str, Any]],
) -> None:
    art = Artwork(
        1920,
        1080,
        "SealedVoice architecture and insider blocked paths",
        "Design overview: browser encryption, ciphertext server, TideCloak quorum and Forseti on ORKs. Red crosses indicate intended enforcement points, not recorded live results. Browser trust, metadata and deletion remain limits.",
    )
    art.rect(0, 0, 1920, 1080, PAPER)
    art.text(display, "Who can open each envelope?", 96, 160, 91, max_width=1728)
    art.text(body, "One report. Separate authority at every layer.", 100, 228, 36)
    xs = [96, 552, 1008, 1464]
    titles = ["Browser", "App server", "TideCloak", "Tide ORKs"]
    for i, (x, title) in enumerate(zip(xs, titles, strict=True)):
        dark = i in {0, 2}
        art.rect(x, 300, 360, 360, NAVY if dark else PAPER2, 12)
        art.text(display, title, x + 28, 366, 51, WHITE if dark else NAVY, 304)
        if i < 3:
            art.add(
                f'<path d="M{x + 377} 480H{x + 436}M{x + 423} 467L{x + 436} 480L{x + 423} 493" fill="none" stroke="{BLUE}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
            )
    art.text(bold, "Encrypts 3 envelopes", 124, 425, 28, WHITE, 304)
    art.text(body, "Content · Identity · Council", 124, 467, 24, WHITE, 304)
    for offset in [0, 94, 188]:
        envelope(art, 124 + offset, 520, 82, 59)
    art.text(body, "Plaintext stays in the browser", 124, 624, 23, WHITE, 304)
    art.text(bold, "Ciphertext only", 580, 425, 31)
    art.text(body, "No sign-in token on POST", 580, 472, 25, max_width=304)
    art.text(body, "No reporter identity field", 580, 514, 25, max_width=304)
    art.text(mono, "POST /api/reports", 580, 579, 24)
    art.text(body, "IP / timing still visible", 580, 624, 24)
    art.text(body, "Roles + governed changes", 1036, 425, 25, WHITE, 304)
    art.text(bold, "2 of 3 admins approve", 1036, 473, 28, WHITE, 304)
    for i in range(3):
        art.add(
            f'<circle cx="{1080 + i * 105}" cy="554" r="24" fill="{WHITE if i < 2 else DARK_RED}"/>'
        )
    art.text(body, "Independent role holders", 1036, 624, 24, WHITE, 304)
    art.text(bold, "Forseti policy", 1492, 425, 31)
    art.text(body, "Role + time lock", 1492, 471, 28)
    art.text(body, "No server-held master key", 1492, 513, 23, max_width=304)
    for i in range(5):
        art.add(
            f'<circle cx="{1510 + i * 60}" cy="565" r="12" fill="{RED if i < 3 else BLUE}"/>'
        )
    art.text(body, "Staging ORK: t=3, n=5", 1492, 624, 24, max_width=304)
    art.add(
        f'<path d="M395 900H1644M732 900V834M1188 900V834M1644 900V834" fill="none" stroke="{RED}" stroke-width="4"/>'
    )
    for x in [732, 1188, 1644]:
        cross(art, x, 720)
    art.text(bold, "Dr. Hung", 96, 873, 40, RED)
    art.text(body, "Insider admin", 96, 921, 28)
    art.text(body, "DB access ≠ plaintext", 568, 800, 27, max_width=340)
    art.text(body, "Self-grant needs quorum", 1018, 800, 27, max_width=340)
    art.text(body, "Wrong role / too early: denied", 1474, 800, 27, max_width=340)
    art.text(
        body,
        "Design overview. Real ORK / QEA outcomes must be verified separately.",
        96,
        1000,
        27,
    )
    art.text(
        body,
        "Trusted browser required. Metadata and IP remain visible. Deletion / withholding is not prevented.",
        96,
        1042,
        26,
        max_width=1728,
    )
    save(art, "docs/architecture.svg", manifest, png=True)


def video_cards(
    display: Lettering,
    body: Lettering,
    bold: Lettering,
    logo: Artwork,
    team: Artwork,
    manifest: list[dict[str, Any]],
) -> None:
    def frame(title: str, background: str, description: str) -> Artwork:
        art = Artwork(1920, 1080, title, description)
        art.rect(0, 0, 1920, 1080, background)
        return art

    art = frame(
        "SealedVoice — Verified, never exposed.",
        PAPER,
        "Opening title for the SealedVoice demo.",
    )
    scale = 1536 / logo.width
    art.add(
        f'<g transform="translate(192 280) scale({scale})">{"".join(logo.parts)}</g>'
    )
    tagline = "Verified, never exposed."
    art.text(body, tagline, (1920 - body.width(tagline, 57)) / 2, 700, 57)
    art.text(body, "Team Fprinciples · RMIT SGS", 144, 960, 29)
    art.text(body, "A university reporting prototype", 1260, 960, 28, max_width=516)
    save(art, "docs/video/00-title.svg", manifest, png=True)

    art = frame(
        "Possibility",
        NAVY,
        "Opening scenario: the Head of School demands the student's identity; IT cannot supply it. The demo script qualifies the premise's limits.",
    )
    art.text(display, "“Find out which", 144, 338, 112, WHITE, 1260)
    art.text(display, "student wrote this.”", 144, 470, 112, WHITE, 1360)
    art.text(body, "The Head of School", 150, 548, 34, PAPER)
    art.text(bold, "“I can’t. Nobody can.”", 144, 766, 66, WHITE, 1450)
    seal(art, 1508, 618, 238)
    art.text(body, "Possibility", 144, 960, 34, WHITE)
    art.text(body, "The opening scenario", 1420, 960, 28, PAPER, 356)
    save(art, "docs/video/01-possibility.svg", manifest, png=True)

    art = frame(
        "Constraint",
        PAPER,
        "The law requires your name. Your name is what gets you punished. A synthetic identity document becomes a sealed envelope.",
    )
    art.text(body, "The law requires your name.", 144, 280, 58)
    art.text(display, "Your name is what", 144, 505, 108, max_width=1200)
    art.text(display, "gets you punished.", 144, 638, 108, max_width=1200)
    art.rect(1430, 306, 304, 300, WHITE, 5)
    art.text(bold, "Identity", 1460, 375, 35, max_width=244)
    art.text(body, "Verified student", 1460, 432, 27, max_width=244)
    art.text(body, "Synthetic example", 1460, 478, 24, MUTED, 244)
    envelope(art, 1378, 525, 408, 262)
    art.text(body, "Constraint", 144, 960, 34)
    art.text(body, "The accused may run the system.", 1190, 960, 28, max_width=586)
    save(art, "docs/video/02-constraint.svg", manifest, png=True)

    art = frame(
        "Prototype",
        PAPER,
        "Three independent envelopes for investigator, guardian and council; TideCloak governs roles and Forseti governs opening.",
    )
    art.text(display, "Three envelopes.", 144, 269, 112)
    art.text(display, "Separate authority.", 144, 398, 112)
    art.text(body, "TideCloak governs roles. Forseti governs opening.", 148, 487, 38)
    for x, first, second in [
        (144, "Content", "Inspector Lan"),
        (706, "Identity", "Guardian Minh"),
        (1268, "Council copy", "After the time lock"),
    ]:
        envelope(art, x, 596, 508, 210)
        art.text(bold, first, x, 866, 37)
        art.text(body, second, x, 917, 29)
    art.text(body, "Prototype · browser-side sealing", 144, 1005, 27)
    art.text(
        body,
        "Design overview; see validation for live results.",
        1130,
        1005,
        26,
        max_width=646,
    )
    save(art, "docs/video/03-prototype.svg", manifest, png=True)

    art = frame(
        "What changes",
        RED,
        "Shared authority is the prototype's goal. Browser trust, metadata and deletion remain limits.",
    )
    art.text(display, "Power needs", 144, 354, 150, WHITE, 1632)
    art.text(display, "more than one person.", 144, 536, 135, WHITE, 1632)
    art.text(body, "A verified identity. A separate investigator.", 150, 714, 47, WHITE)
    art.text(
        body,
        "An independent guardian. A council access path.",
        150,
        785,
        47,
        WHITE,
        1632,
    )
    art.text(body, "What changes", 144, 960, 34, WHITE)
    art.text(
        body,
        "Browser trust, metadata and deletion remain limits.",
        1030,
        960,
        28,
        WHITE,
        746,
    )
    save(art, "docs/video/04-what-changes.svg", manifest, png=True)

    art = frame(
        "Team Fprinciples — RMIT SGS",
        NAVY,
        "Team Fprinciples outro, a custom typographic Built with TideCloak credit badge, and the repository URL. No official university or Tide logo is reproduced.",
    )
    team_symbol(art, 144, 270, 176, light=True)
    art.text(bold, "Fprinciples", 380, 392, 126, WHITE, 1150)
    art.text(body, "Team Fprinciples · RMIT SGS", 386, 474, 36, PAPER)
    seal(art, 1490, 286, 286)
    art.rect(144, 620, 590, 142, WHITE, 10)
    art.text(body, "Built with", 176, 672, 29)
    art.text(bold, "TideCloak", 174, 733, 53)
    art.text(body, "github.com/Towfienes/SealedVoice", 144, 930, 45, WHITE, 1500)
    save(art, "docs/video/05-outro.svg", manifest, png=True)


def social(display: Lettering, body: Lettering, manifest: list[dict[str, Any]]) -> None:
    art = Artwork(
        1200,
        630,
        "SealedVoice — Verified, never exposed.",
        "A university reporting prototype by Team Fprinciples, RMIT SGS.",
    )
    art.rect(0, 0, 1200, 630, NAVY)
    art.text(display, "SealedVoice", 76, 259, 105, WHITE, 760)
    art.text(body, "Verified,", 80, 360, 54, WHITE)
    art.text(body, "never exposed.", 80, 427, 54, WHITE)
    seal(art, 870, 180, 260)
    art.text(body, "Team Fprinciples · RMIT SGS", 80, 557, 26, PAPER)
    save(art, "public/brand/og.svg", manifest, png=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fonts", type=Path, required=True)
    args = parser.parse_args()
    display = Lettering(
        args.fonts / "fraunces.ttf", {"wght": 700, "opsz": 72, "SOFT": 0, "WONK": 1}
    )
    body = Lettering(args.fonts / "publicsans.ttf", {"wght": 400})
    bold = Lettering(args.fonts / "publicsans.ttf", {"wght": 600})
    mono = Lettering(args.fonts / "mono.ttf")
    manifest: list[dict[str, Any]] = []
    logo, team = make_logos(display, body, bold, manifest)
    architecture(display, body, bold, mono, manifest)
    video_cards(display, body, bold, logo, team, manifest)
    social(display, body, manifest)
    provenance = {
        name: {
            "path": path,
            "sha256": hashlib.sha256(
                (args.fonts / f"{name}.ttf").read_bytes()
            ).hexdigest(),
        }
        for name, path in FONT_PATHS.items()
    }
    (ROOT / "docs/brand/asset-manifest.json").write_text(
        json.dumps(
            {"font_commit": FONT_COMMIT, "fonts": provenance, "assets": manifest},
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(
        f"Generated {len(manifest)} SVG assets, 8 PNG exports; all outlined lettering fits its canvas."
    )


if __name__ == "__main__":
    main()

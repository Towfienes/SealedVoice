"""Check the delivered vector masters and raster exports without app dependencies."""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SVG = "{http://www.w3.org/2000/svg}"


def main() -> None:
    manifest = json.loads((ROOT / "docs/brand/asset-manifest.json").read_text())
    sources = [ROOT / item["file"] for item in manifest["assets"]]
    sources.extend([ROOT / "public/brand/logo-mark.svg", ROOT / "app/icon.svg"])
    for path in sources:
        root = ET.parse(path).getroot()
        assert root.tag == f"{SVG}svg", f"Not SVG: {path}"
        assert (
            root.find(f"{SVG}path") is not None or root.find(f"{SVG}g") is not None
        ), path
        for node in root.iter():
            tag = node.tag.rsplit("}", 1)[-1]
            assert tag not in {"text", "script", "foreignObject", "image"}, (path, tag)
            assert not any(key.rsplit("}", 1)[-1] == "href" for key in node.attrib), (
                path
            )
    for item in manifest["assets"]:
        for label in item["labels"]:
            left, top, right, bottom = label["bounds"]
            assert -1 <= left <= right <= item["width"] + 1, label
            assert -1 <= top <= bottom <= item["height"] + 1, label
    cards = sorted((ROOT / "docs/video").glob("*.png"))
    assert len(cards) == 6, f"Expected six cards, got {len(cards)}"
    rasters = cards + [ROOT / "docs/architecture.png", ROOT / "public/brand/og.png"]
    for path in rasters:
        expected = (1200, 630) if path.name == "og.png" else (1920, 1080)
        with Image.open(path) as image:
            assert image.size == expected, (path, image.size)
            assert image.mode in {"RGB", "RGBA"}, (path, image.mode)
            if image.mode == "RGBA":
                assert image.getchannel("A").getextrema() == (255, 255), path
            image.verify()
    print(
        f"PASS: {len(sources)} SVGs, {len(rasters)} PNGs, all lettering outlined, no external resources, correct dimensions."
    )


if __name__ == "__main__":
    main()

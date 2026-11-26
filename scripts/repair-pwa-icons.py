#!/usr/bin/env python3
"""Repair Android PWA raster icons and publish fixed-expenses v1.3.2."""
from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parents[1]
icon192 = root / "icons/icon-192.png"
icon512 = root / "icons/icon-512.png"
with Image.open(icon192) as src:
    if src.size != (192, 192):
        raise SystemExit(f"Expected selected icon to be 192x192, got {src.size}")
    src.convert("RGBA").resize((512, 512), Image.Resampling.LANCZOS).save(icon512, format="PNG", optimize=True)
with Image.open(icon512) as check:
    if check.size != (512, 512) or check.format != "PNG":
        raise SystemExit("512px PNG validation failed")

manifest_path = root / "manifest.webmanifest"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest["icons"] = [
    {"src": "./icons/icon-192.png?v=1.3.2", "sizes": "192x192", "type": "image/png", "purpose": "any"},
    {"src": "./icons/icon-512.png?v=1.3.2", "sizes": "512x512", "type": "image/png", "purpose": "any"}
]
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

index_path = root / "index.html"
index = index_path.read_text(encoding="utf-8")
assert "1.3.1" in index
index = index.replace("1.3.1", "1.3.2")
index_path.write_text(index, encoding="utf-8")

sw_path = root / "sw.js"
sw = sw_path.read_text(encoding="utf-8")
assert "fixed-expenses-v1.3.1" in sw
sw = sw.replace("fixed-expenses-v1.3.1", "fixed-expenses-v1.3.2")
sw = sw.replace("'./icons/icon-512.svg'", "'./icons/icon-512.png'")
sw_path.write_text(sw, encoding="utf-8")

version_path = root / "version.json"
version = json.loads(version_path.read_text(encoding="utf-8"))
version["version"] = "1.3.2"
version["notes"] = [
    "앱 아이콘 PNG 규격 오류 수정: 실제 192×192 및 512×512 PNG 제공",
    "Chrome 설치형 웹앱 아이콘 캐시 갱신을 위한 아이콘 URL 변경",
    "기존 v1.3.1 수입·지출·백업·상단 메뉴 기능 유지",
]
version_path.write_text(json.dumps(version, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Icon repair complete: 192 PNG + 512 PNG verified; PWA version 1.3.2")

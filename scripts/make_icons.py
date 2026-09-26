#!/usr/bin/env python3
"""Render the extension icons (green rounded square with a crescent) as PNGs.

Stdlib only; 4x4 supersampling for anti-aliasing.
Usage: python3 scripts/make_icons.py
"""

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
BG = (31, 111, 74)
FG = (247, 246, 242)
SS = 4


def inside_rounded_square(x: float, y: float, radius: float) -> bool:
    cx = min(max(x, radius), 1 - radius)
    cy = min(max(y, radius), 1 - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius**2


def inside_crescent(x: float, y: float) -> bool:
    outer = (x - 0.47) ** 2 + (y - 0.5) ** 2 <= 0.30**2
    inner = (x - 0.59) ** 2 + (y - 0.43) ** 2 <= 0.25**2
    return outer and not inner


def render(size: int) -> bytes:
    rows = []
    for py in range(size):
        row = bytearray([0])  # PNG filter type: none
        for px in range(size):
            bg = fg = 0
            for sy in range(SS):
                for sx in range(SS):
                    x = (px + (sx + 0.5) / SS) / size
                    y = (py + (sy + 0.5) / SS) / size
                    if inside_rounded_square(x, y, 0.22):
                        if inside_crescent(x, y):
                            fg += 1
                        else:
                            bg += 1
            total = SS * SS
            alpha = (bg + fg) / total
            if alpha == 0:
                row += bytes(4)
                continue
            mix = fg / (bg + fg)
            rgb = [round(b * (1 - mix) + f * mix) for b, f in zip(BG, FG)]
            row += bytes(rgb + [round(alpha * 255)])
        rows.append(bytes(row))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(b"".join(rows), 9))
        + chunk(b"IEND", b"")
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (16, 48, 128):
        (OUT / f"icon-{size}.png").write_bytes(render(size))
    print(f"wrote icons to {OUT}")


if __name__ == "__main__":
    main()

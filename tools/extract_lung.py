"""Cut the lung illustration out of a背景稿, drop its background and emit lung-data.js.

用法：python tools/extract_lung.py "C:/path/to/背景圖.png"
來源圖的肺插圖固定在右上角淡色色塊上，這支腳本把它裁出來、把周圍淡色洗成透明，
放大兩倍存成 assets/lung.png，再轉成 data URI 給海報用（匯出 PNG 時外部圖檔載不到）。
"""

from __future__ import annotations

import base64
import sys
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "assets" / "lung-source.png"
# 來源圖右上角的裁切框（比例），比肺葉本身寬一點，留給洗背景的餘裕。
CROP = (0.820, 0.030, 0.985, 0.240)
# 洗背景：相鄰像素色差小於這個值就算同一片背景，白色氣管與深色肺葉會被擋下來。
TOLERANCE = 14


def remove_background(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    transparent = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if 0 <= x < width and 0 <= y < height and not transparent[y * width + x]:
            transparent[y * width + x] = 1
            queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        r, g, b, _ = pixels[x, y]
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < width and 0 <= ny < height):
                continue
            if transparent[ny * width + nx]:
                continue
            nr, ng, nb, _ = pixels[nx, ny]
            if abs(nr - r) + abs(ng - g) + abs(nb - b) <= TOLERANCE:
                push(nx, ny)

    for y in range(height):
        for x in range(width):
            if transparent[y * width + x]:
                r, g, b, _ = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)
    return image


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    image = Image.open(source).convert("RGB")
    width, height = image.size
    box = (
        int(CROP[0] * width), int(CROP[1] * height),
        int(CROP[2] * width), int(CROP[3] * height),
    )
    lung = remove_background(image.crop(box))
    lung = lung.resize((lung.width * 2, lung.height * 2), Image.LANCZOS)

    # 洗背景失敗（容差抓錯）最常見的兩種下場：四角沒洗掉、或連肺葉都被洗穿。
    pixels = lung.load()
    for corner in ((0, 0), (lung.width - 1, 0), (0, lung.height - 1), (lung.width - 1, lung.height - 1)):
        assert pixels[corner][3] == 0, f"角落沒洗成透明：{corner}"
    assert pixels[lung.width // 2 - lung.width // 6, lung.height // 2][3] > 200, "肺葉被洗穿了"

    destination = ROOT / "assets" / "lung.png"
    lung.save(destination)
    payload = base64.b64encode(destination.read_bytes()).decode("ascii")
    (ROOT / "lung-data.js").write_text(
        f'window.LUNG_ASSET="data:image/png;base64,{payload}";\n', encoding="utf-8"
    )
    print(f"{destination} {lung.size}")


if __name__ == "__main__":
    main()

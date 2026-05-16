"""
从四角泛洪去除与边角连通的近白背景，输出 RGBA（不碰被绿色隔开的内部白点）。
用法：.venv\\Scripts\\python frontend/scripts/knockout_white_bg.py
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "src" / "assets" / "ip-brand.png"
    if not src.is_file():
        raise SystemExit(f"missing {src}")

    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()

    def spread_white(r: int, g: int, b: int) -> bool:
        # 略宽以吃掉抗锯齿浅边，但避免吃进浅绿高光
        return r >= 238 and g >= 238 and b >= 238

    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_edge_seed(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            return
        r, g, b, _ = px[x, y]
        # 整圈边缘作种子：吃掉与底边相连的白条（不必连到角）
        if spread_white(r, g, b):
            seen[y][x] = True
            q.append((x, y))

    for x in range(w):
        try_edge_seed(x, 0)
        try_edge_seed(x, h - 1)
    for y in range(h):
        try_edge_seed(0, y)
        try_edge_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h or seen[ny][nx]:
                continue
            r2, g2, b2, _ = px[nx, ny]
            if spread_white(r2, g2, b2):
                seen[ny][nx] = True
                q.append((nx, ny))

    img.save(src, format="PNG", optimize=True)
    print(f"OK: wrote RGBA -> {src}")


if __name__ == "__main__":
    main()

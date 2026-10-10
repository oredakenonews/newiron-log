#!/usr/bin/env python3
"""トレーナー画像に焼き込まれた市松模様（透過風の偽背景）を実際の透過に変換する。

外周からのフラッドフィルで「グレー〜白の低彩度ピクセル」だけを辿って透過化する。
キャラクター内部の白（服・ハイライト）は線画で囲まれていて外周から到達できないため残る。
使い方: python3 scripts/remove-checkerboard.py [ファイル...]（無指定なら public/gazou の *_bu.png + billybu.png）
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GAZOU = ROOT / 'public' / 'gazou'

# 市松の2色（白/ #C9C9C9）とその中間ブレンドを拾う判定
def is_checker(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    return (mx - mn) <= 14 and mn >= 170


def process(path: Path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()

    removed = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            q.append((x, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if removed[i]:
            continue
        r, g, b, a = px[x, y]
        if not is_checker(r, g, b):
            continue
        removed[i] = 1
        q.append((x + 1, y)); q.append((x - 1, y))
        q.append((x, y + 1)); q.append((x, y - 1))

    # 透過化＋境界1pxを半透過にしてギザつきを和らげる
    n = 0
    for y in range(h):
        for x in range(w):
            if removed[y * w + x]:
                r, g, b, a = px[x, y]
                px[x, y] = (r, g, b, 0)
                n += 1
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if removed[i]:
                continue
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and removed[ny * w + nx]:
                    if is_checker(r, g, b):
                        px[x, y] = (r, g, b, 110)
                    break

    im.save(path)
    print(f'{path.name}: {n}px ({n * 100 // (w * h)}%) を透過化')


def main():
    args = [Path(a) for a in sys.argv[1:]]
    if not args:
        args = sorted(GAZOU.glob('*_bu.png')) + [GAZOU / 'billybu.png']
    for p in args:
        process(p)


if __name__ == '__main__':
    main()

# 新トレーナー画像の作成メモ（LEON / JADE）

2026-10-12、見た目が被っていた日本人男性キャラ（DAIKI・KENJI）を外し、性格の枠を新キャラ2人に引き継いだ。
今は `public/gazou/leon_bu.png` / `jade_bu.png` にシルエットの仮画像が入っている。本物のイラストができたら差し替える。

## 画像の条件（既存8人と揃える）

- 1024×1024 の正方形PNG、胸から上（バストアップ）、正面〜やや斜め、顔は画像の上寄り
- 既存キャラと同じ画風: 日本のアニメ／マンガ調、くっきりした主線、セル塗り
- 背景は無地の白か薄いグレー（市松模様でも可。下の手順で透過にできる）
- トレーニングウェア姿

## 生成用プロンプト

**LEON（理論派・ドイツ出身・34歳男性）**

> Anime-style bust-up portrait of a 34-year-old German man, personal trainer and sports scientist. Short neat light-brown hair, calm intelligent blue eyes, slight confident smile, clean-shaven, athletic but lean build. Wearing a fitted dark navy training t-shirt. Clean bold line art, cel shading, Japanese anime/manga illustration style, front-facing, centered, plain white background, square 1:1.

**JADE（ストイック・アメリカ出身・31歳女性）**

> Anime-style bust-up portrait of a 31-year-old Black American woman, former amateur boxer and physical coach. Dark skin, short natural hair or tight braids pulled back, focused determined expression, strong defined shoulders and arms. Wearing a black athletic tank top. Clean bold line art, cel shading, Japanese anime/manga illustration style, front-facing, centered, plain white background, square 1:1.

## 差し替え手順

1. 画像を `public/gazou/leon_bu.png` / `public/gazou/jade_bu.png` に上書き保存
2. 背景を透過にする: `python3 scripts/remove-checkerboard.py public/gazou/leon_bu.png public/gazou/jade_bu.png`
3. コミットして `npm run ios:testflight`

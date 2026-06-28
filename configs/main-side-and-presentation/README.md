# テーマ: Main / Side and Presentation

Nape Pro を**唯一のメインポインティングデバイス**として使うことを前提にした設定プロファイル。
**横置き・横置き（設定用）・プレゼン縦持ち**の 3 つの持ち方をカバーし、
**ジェスチャとスクロールを使いやすく**することを狙う。

| 項目 | 値 |
|------|----|
| コンフィグ | [`nape-pro-settings-2026-06-28.json`](nape-pro-settings-2026-06-28.json) |
| エクスポート日 | 2026-06-28 |
| ファームウェア | `010205...`（v1.2.5 系）|
| レイヤー数 | 9（うち実質 0〜3 が個別。4〜8 は同一）|
| DPI | 400 / 800 / 1600 / 3200 / 4000（現在 1600）|

復元方法は [`../../tools/README.md`](../../tools/README.md) のインポート手順を参照。

> ⚠️ **既知の制限**: インポートでは**トラックボールの回転角度（向き設定）は復元されない**。
> 詳細は末尾「既知の制限」を参照。

## Nape Pro とは

Keychron Nape Pro は、キーボード手前（nape）に置いて親指で操作する小型ワイヤレストラックボール。

- 25mm セラミック製トラックボール＋**6 ボタン（M1・M2・01〜04）＋スクロールホイール**、PixArt PAW3222 センサー、1kHz ポーリング。
- Bluetooth / 2.4GHz / USB-C 接続、ZMK 系ファームウェア。
- 目玉機能 **OctaShift**: **デバイスの向きを検知して自動でレイヤ（ボタン割当）を切り替える**。
  横置き（ラップトップ風に左右へ）でも縦持ち（スタンドアロン）でも、両端ボタンが主クリック等に適応する。

> 本テーマの「横置き／横置き設定用／プレゼン縦持ち」は、OctaShift が向きに応じて切り替える各レイヤに対応する。

## 物理レイアウト

横置き時、左側に **M1（上）/ M2（下）**、中央にトラックボール、その四隅に **01（左上）/ 02（左下）/ 03（右上）/ 04（右下）**、
右側に **スクロールホイール**。キーマップの列 (Col0-6) と物理ボタンの対応は実機表示から確定済み:

| 物理 | M1 | M2 | 01 | 02 | 03 | 04 | 予備 |
|------|----|----|----|----|----|----|------|
| 列   | Col4 | Col5 | Col2 | Col3 | Col0 | Col1 | Col6 |

## テーマのコンセプト

- **横置き（メイン）**: ラップトップ風に手前へ置いた通常操作。左右クリック＋戻る／進む＋ホイールスクロール。
- **横置き（設定用）**: 修飾キー（Ctrl/Shift）やジェスチャを併用し、ズーム・横スクロール等の調整操作を行う。
- **プレゼン縦持ち**: 縦に持ち替えてプレゼンのページ送り。**F5 でスライドショー開始、←/→ でページ送り**。
- マウスを別途持たず、**これ 1 台で完結**させる前提。スクロールとジェスチャを最優先に配置。

## レイヤごとの解説図

各図は現在のコンフィグを実機レイアウトに重ねたもの（[`tools/build-layer-diagrams.js`](../../tools/build-layer-diagrams.js) で生成）。

### Layer 0 — 横置き・基本ポインタ
![Layer 0](diagrams/layer-0.svg)

### Layer 1 — 横置き・フルマウス
![Layer 1](diagrams/layer-1.svg)

### Layer 2 — 横置き・設定/ジェスチャ
左Ctrl / 左Shift を併用し、`Ctrl+ホイール`でズーム、`Shift+ホイール`で横スクロール等の調整操作向け。
![Layer 2](diagrams/layer-2.svg)

### Layer 3 — プレゼン縦持ち
F5 でスライドショー開始、←/→ でページ送り。縦持ち時に対応。
![Layer 3](diagrams/layer-3.svg)

### Layer 4〜8 — 横置き・ジェスチャ付き（同一）
![Layer 4-8](diagrams/layer-4.svg)

## レイヤ一覧表

`独自(0x____)` は Keychron 独自コード。実機ラベルから `0x5229=ボールジェスチャ`, `0x522A=ボールスクロール`,
`0x522B=モード/レイヤ（全レイヤ共通）` が判明。`0x7Exx`・`0x023E` は未解読（ジェスチャ系と推定）。

| Layer | 役割（推定） | M1 | M2 | 01 | 02 | 03 | 04 | ホイール CW/CCW |
|-------|-------------|----|----|----|----|----|----|-----------------|
| 0 | 横置き・基本ポインタ | 左クリック | 右クリック | 戻る | なし | ボールスクロール | なし | 音量+/音量− |
| 1 | 横置き・フルマウス | ボールジェスチャ | ボールスクロール | 戻る | 左クリック | 進む | 右クリック | スクロール↓/↑ |
| 2 | 横置き・設定/ジェスチャ | 独自(0x7E25) | 独自(0x7E26) | 左Ctrl | 左クリック | 左Shift | 右クリック | スクロール↓/↑ |
| 3 | プレゼン縦持ち | 左クリック | 右クリック | → | ← | 独自(0x023E) | F5 | スクロール↓/↑ |
| 4〜8 | 横置き・ジェスチャ付き | 左クリック | 右クリック | 戻る | 独自(0x7E2C) | ボールスクロール | 独自(0x7E2B) | 音量+/音量− |

> Layer 1 は実機写真の既定割当（M1=ボールジェスチャ, M2=ボールスクロール, 01=戻る, 02=左クリック, 03=進む, 04=右クリック）と一致する。
> 予備ボタン（Col6）は全レイヤで `モード/レイヤ (0x522B)`。OctaShift の向き切替に関わると推定。

## 既知の制限

- **回転角度（トラックボールの向き設定）はインポートで復元されない。** 現状のエクスポート/インポートは
  キーマップ・エンコーダ・DPI・combos/gesture/tapholds/profile を対象としており、向き／回転角度に相当する
  設定（`KC_USER_CMD_NAPE_GET_LAYER_ORI 0xa7,0x38` 等）は未対応。復元後は Launcher で回転角度を手動設定すること。
- `0x7Exx` / `0x023E` のカスタムコードは未解読。

## メモ

- レイヤ4〜8 が同一なのは予備（未使用）と思われる。OctaShift の向き割当でどの向きがどのレイヤを使うかが
  決まるため、対応関係は別途要確認。

## 出典（Nape Pro 情報）

- [Tom's Hardware: Keychron unveils new Nape Pro trackball](https://www.tomshardware.com/peripherals/mice/keyboard-giant-keychron-unveils-new-nape-pro-trackball-with-programmable-buttons-low-profile-design-promotes-ergonomic-scrolling-without-leaving-your-keyboard)
- [TechPowerUp: Keychron Unveils Nape Pro Wireless Trackball Mouse (CES 2026)](https://www.techpowerup.com/345036/keychron-unveils-nape-pro-wireless-trackball-mouse-and-new-keyboards-at-ces-2026)
- [Yanko Design: Hands-on at CES 2026](https://www.yankodesign.com/2026/01/08/keychrons-nape-pro-turns-your-mechanical-keyboard-into-a-laptop-style-trackball-rig-hands-on-at-ces-2026/)

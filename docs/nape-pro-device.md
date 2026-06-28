# Keychron Nape Pro デバイス概要

設定プロファイル（[`../configs/`](../configs/)）に依存しない、デバイス共通の解説。
通信仕様は [`nape-pro-hid-protocol.md`](nape-pro-hid-protocol.md) を参照。

## Nape Pro とは

Keychron Nape Pro は、キーボード手前（nape＝うなじ）に置いて親指で操作する小型ワイヤレストラックボール。
マウスを別途持たずにポインティングを完結させることを狙ったモジュール型デバイス。

## 主なスペック

- 25mm セラミック製トラックボール
- **6 ボタン（M1・M2・01〜04）＋ スクロールホイール**
- PixArt PAW3222 センサー、Realtek チップ、最大 1kHz ポーリング
- 接続: Bluetooth / 2.4GHz ドングル / USB-C 有線
- ZMK 系ファームウェア（Keychron 独自拡張あり）
- 1/4-20 三脚マウント対応（角度付き設置が可能）

## OctaShift（向き検知）

Nape Pro の目玉機能。**デバイスの向き（横置き／縦置き／角度付き）を検知して、自動でレイヤ
（ボタン割当）を切り替える**。両端の M1 / M2 はどの向きでも押しやすい位置にあり、向きに応じて
主クリック等へ適応する。

> 各設定プロファイルの「横置き／縦持ち」などの使い分けは、OctaShift が向きごとに切り替えるレイヤに対応する。
> 各レイヤには回転角（0〜315°, 45°刻み）も設定でき、本リポジトリのツールでバックアップ/復元できる。

## 物理レイアウト

横置き時の配置:

- 左側: **M1（上）/ M2（下）**
- 中央: トラックボール
- ボール四隅: **01（左上）/ 02（左下）/ 03（右上）/ 04（右下）**
- 右側: **スクロールホイール**

キーマップのマトリクス列 (Col0-6) と物理ボタンの対応（実機表示から確定）:

| 物理 | M1 | M2 | 01 | 02 | 03 | 04 | 予備 |
|------|----|----|----|----|----|----|------|
| 列(col) | 4 | 5 | 2 | 3 | 0 | 1 | 6 |

キーコードの対応表は [`nape-pro-hid-protocol.md` 第5章](nape-pro-hid-protocol.md#5-キーコード対応実測で判明分) を参照。

## レイヤ番号のズレ（表示 vs 内部）— 仮説

⚠️ **仮説（実機の Launcher 表示との突き合わせに基づく。ファームウェアソースでは未確認）**

Launcher が画面に表示するレイヤ番号と、デバイス内部（VIA キーマップ）の index が **1 ずれている** と思われる。
具体的には **device VIA index 0 が Launcher に現れない「ベース」レイヤ** で、表示は次のように対応する:

| device VIA index | Launcher 表示 |
|------------------|---------------|
| 0 | （非表示）ベース |
| 1 | Layer 0 |
| 2 | Layer 1 |
| 3 | Layer 2 |
| 4〜8 | Layer 3〜7 |

根拠: 実機写真の既定レイアウト（M1=ボールジェスチャ, M2=ボールスクロール, 01=戻る, 02=左クリック,
03=進む, 04=右クリック）が、エクスポートの **device index 1** と一致する。Launcher 上ではこれが
先頭（Layer 0）に見える。

> **重要**: エクスポート/インポートは一貫して device VIA index で読み書きするため、**この表示ズレは
> 復元動作に影響しない**（往復で同じ index を使うため整合する）。影響するのは「人間がレイヤ番号で
> 会話するとき」だけ。本リポジトリの図・表は device index を基準に、Launcher 表示番号を併記する。

### 回転角と「上方向」（実機確認済み）

各レイヤの回転角（0〜315°, 45°刻み）はボール出力の「上方向」を回転させる。物理ボタンとの対応は次のとおり
（実機で確認）。角度が増えると**反時計回り**に回る。

| 回転角 | 上に来る向き（ボタン）|
|--------|----------------------|
| 0° | 03 / 04 側（右）|
| 90° | 01 / 03 側（上の行）|
| 180° | 01 / 02 側（左）|
| 270° | 02 / 04 側（下の行）|

本リポジトリのレイヤ図では、この向きを青い矢印（「上」）で示す。
例: Launcher Layer 0（device index 1, 90°）は 01/03 側が上。

## 出典

- [Tom's Hardware: Keychron unveils new Nape Pro trackball](https://www.tomshardware.com/peripherals/mice/keyboard-giant-keychron-unveils-new-nape-pro-trackball-with-programmable-buttons-low-profile-design-promotes-ergonomic-scrolling-without-leaving-your-keyboard)
- [TechPowerUp: Keychron Unveils Nape Pro Wireless Trackball Mouse (CES 2026)](https://www.techpowerup.com/345036/keychron-unveils-nape-pro-wireless-trackball-mouse-and-new-keyboards-at-ces-2026)
- [Yanko Design: Hands-on at CES 2026](https://www.yankodesign.com/2026/01/08/keychrons-nape-pro-turns-your-mechanical-keyboard-into-a-laptop-style-trackball-rig-hands-on-at-ces-2026/)

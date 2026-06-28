# Keychron Nape Pro HID プロトコル リファレンス（体系版）

Nape Pro と Keychron Launcher 間の WebHID 通信仕様を体系的にまとめた、本リポジトリの正典。
エクスポート/インポートツール（[`../tools/`](../tools/)）はこの仕様に基づく。

- 解析対象: Keychron Launcher V1.3.8（`main.6acda9251655b3a5.js`, Angular production build）
- デバイス: Nape Pro（VendorId=13364, ProductId=1088）/ ファーム v1.2.3-ZK・v1.2.5-ZK
- 根拠: 基礎調査（実機 HID キャプチャ）＋ Launcher バンドルのソース実測・ライブキャプチャ

関連ドキュメント:
- 基礎調査の経緯: [`keychron-launcher-investigation.md`](keychron-launcher-investigation.md)
- 回転角対応の調査記録: [`rotation-angle-investigation.md`](rotation-angle-investigation.md)

---

## 1. 通信の基本

| 項目 | 値 |
|------|----|
| API | WebHID |
| 対象インタフェース | usagePage = `0xFF60`（Vendor / QMK RAW HID）, reportId = `0` |
| パケット長 | 32 バイト固定（`sendReport(0, Uint8Array(32))`）|
| コマンド第1バイト | コマンドグループ（`0xA7`=Nape 独自, `0x04/0x05/0x14/0x15`=VIA, `0xA1`=ファーム）|
| 応答 | 同じインタフェースの `inputreport`。先頭バイトが要求と一致するものを採用 |

> Nape Pro 接続時は HID インタフェースが 3 つ見えるが、設定通信は usagePage=`0xFF60` のデバイスのみ使用する。

## 2. コマンドグループと enum

Nape 独自コマンドは第1バイト `0xA7`（=167, `KC_MISC_CMD_GROUP`）＋第2バイトのサブコマンド。
サブコマンドは Launcher 内で複数の enum に分かれて定義されている。

| enum | 用途 | 代表値 |
|------|------|--------|
| `KC_USER_CMD_NAPE_*` | 回転角・DPI・combos 等の主要設定 | 32〜57 |
| `K`（Sleep 専用） | スリープタイマー | Get=11, Set=12 |
| `vt`（常時モード専用） | 常時ジェスチャー/スクロール | Set=50, Get=51 |
| `ie`（ポーリング専用） | ポーリングレート | Get=13, Set=14 |
| VIA 標準 | キーマップ・エンコーダ | 0x04/0x05/0x14/0x15 |

### 2.1 KC_USER_CMD_NAPE_* enum（0xA7 グループ）

| 値(10/16) | 名前 | 方向 |
|----------:|------|------|
| 32 / 0x20 | GET_ORI（全体回転角） | GET |
| 33 / 0x21 | GET_DPI | GET |
| 34 / 0x22 | SET_DPI | SET |
| 35 / 0x23 | SET_DPI_VALUE | SET |
| 36 / 0x24 | GET_DPI_VALUE | GET |
| 37 / 0x25 | SET_TAPHOLDS | SET |
| 38 / 0x26 | GET_TAPHOLDS | GET |
| 39 / 0x27 | SET_COMBOS | SET |
| 40 / 0x28 | GET_COMBOS | GET |
| 41 / 0x29 | SET_GESTURE | SET |
| 42 / 0x2a | GET_GESTURE | GET |
| 43 / 0x2b | SET_PROFILE | SET |
| 44 / 0x2c | GET_PROFILE | GET |
| 45 / 0x2d | SET_LAYER（レイヤー切替） | SET |
| 46 / 0x2e | DEL_COMBOS | SET |
| 47 / 0x2f | DEL_TAPHOLDS | SET |
| 49 / 0x31 | GET_BAT_REPORT | GET |
| 52 / 0x34 | SET_ORI（全体回転角） | SET |
| 56 / 0x38 | GET_LAYER_ORI（レイヤー別回転角） | GET |
| 57 / 0x39 | SET_LAYER_ORI（レイヤー別回転角） | SET |

> 50/51/53/54/55 は本 enum に存在しない（別 enum `vt` 等で使用）。

### 2.2 その他 enum

| enum.名前 | 値(10/16) | 用途 |
|-----------|----------:|------|
| K.Get_Sleep | 11 / 0x0b | スリープ取得 |
| K.Set_Sleep | 12 / 0x0c | スリープ設定 |
| ie.Get | 13 / 0x0d | ポーリング取得 |
| ie.Set | 14 / 0x0e | ポーリング設定 |
| vt.Set_Force_Gesture_Scroll | 50 / 0x32 | 常時モード設定 |
| vt.Get_Force_Gesture_Scroll | 51 / 0x33 | 常時モード取得 |

### 2.3 VIA 標準コマンド（第1バイトがそのままコマンド）

| 値(10/16) | 名前 |
|----------:|------|
| 18 / 0x12 | DYNAMIC_KEYMAP_GET_BUFFER |
| 19 / 0x13 | DYNAMIC_KEYMAP_SET_BUFFER |
| 20 / 0x14 | DYNAMIC_KEYMAP_GET_ENCODER |
| 21 / 0x15 | DYNAMIC_KEYMAP_SET_ENCODER |
| 4 / 0x04 | DYNAMIC_KEYMAP_GET_KEYCODE |
| 5 / 0x05 | DYNAMIC_KEYMAP_SET_KEYCODE |
| 163 / 0xA3 | KC_GET_CURRENT_LAYER |
| 161 / 0xA1 | ファームウェアバージョン取得 |

---

## 3. 設定ごとの仕様

各表記は「バイト列（10進）」。`lo/hi` は LE u16 の下位/上位バイト。未使用バイトは 0 埋め。

### 3.1 回転角（OctaShift 向き出力）

値は `0〜7`、`値 × 45 = 度`（0°/45°/…/315°）。応答は `byte[2]` に値。

| 操作 | パケット | 応答 |
|------|----------|------|
| 全体 取得 | `[167, 32]` | `byte[2]` = 値 |
| 全体 設定 | `[167, 52, value]` | — |
| レイヤー別 取得 | `[167, 56, layer]` | `byte[2]` = 値 |
| レイヤー別 設定 | `[167, 57, layer, value]` | — |

- `layer` = 0〜8。`value` = `Math.floor(degrees/45) & 0x07`。
- 45 の倍数でない角度は切り捨て。8 以上は送らないこと（firmware 未定義動作）。

### 3.2 DPI

| 操作 | パケット | 応答 |
|------|----------|------|
| 現在レベル 取得 | `[167, 33]` | `byte[2]` = レベル |
| レベル値 取得 | `[167, 36, level]` | `byte[2,3]` = DPI（LE u16）|
| レベル値 設定 | `[167, 35, level, lo, hi]` | — |
| 現在レベル 設定 | `[167, 34, level]` | — |

5 段階（level 0〜4）。例: 400/800/1600/3200/4000。

### 3.3 combos（同時押し）— インデックス反復（最大30件）

GET=0x28 / SET=0x27 / DEL=0x2e。**1フレーム=1件**。全件一括取得は無く、index を 0〜29 で反復する。

| 操作 | パケット | 応答（GET）|
|------|----------|-----------|
| 取得 | `[167, 40, index]` | 下表 |
| 設定 | `[167, 39, index, to_lo, to_hi, layer, cols, tap_lo, tap_hi, held_lo, held_hi]` | — |
| 削除 | `[167, 46, index]` | — |

GET 応答: `[2]=index, [3,4]=timeout(LE,ms), [5]=layer, [6]=cols, [7,8]=tap(LE), [9,10]=held(LE)`。

- **読み取り**: index を 0 から増やし、`cols==0` または **500ms 無応答**で打ち切り（以降は未登録）。最大 30 件。
- **cols** はトリガー列のビットマスク（`bit N = col N`）。col↔ボタン: `0=03, 1=04, 2=01, 3=02, 4=M1, 5=M2`。
  例: `cols=5(0b101)` → col0(03) + col2(01) の同時押し。`cols=0x0F` は anti-ghosting でブロック。
- **timeout**: 同時押し判定の猶予（既定 200ms）。`tap`=出力キーコード、`held`=長押し出力（0=なし）。
- **削除はシフトダウン**（index N+1 が N に詰まる）。複数削除は**高い index から降順**に。
- インポート手順: 新データを index 0..N_new-1 に SET → 余剰（N_old>N_new）を降順 DEL。

> 参考フレーム `[167,40,0,200,0,0,5,70,0,0,…]` = index0 / timeout200ms / layer0 / cols=5(03+01) /
> tap=0x46(Print Screen) / held=0 →「レイヤ0で 03+01 同時押し=Print Screen」。

### 3.3b tap-hold（タップ&ホールド）— (layer,col) アドレス

GET=0x26 / SET=0x25 / DEL=0x2f。スロット番号ではなく**物理キー座標**でアドレスする。

| 操作 | パケット | 応答（GET）|
|------|----------|-----------|
| 取得 | `[167, 38, layer, 0, col]` | `[2]=layer, [3]=row(0), [4]=col, [5,6]=tap(LE), [7,8]=held(LE)` |
| 設定 | `[167, 37, layer, 0, col, tap_lo, tap_hi, held_lo, held_hi]` | — |
| 削除 | `[167, 47, layer, 0, col]` | — |

- col は 0〜5（combos と同じ col↔ボタン対応）。GET は常に応答（未設定は tap=held=0）。
- 削除はシフトしない（座標アドレスのため）。

### 3.3c gesture（ボールジェスチャ）— 単一フレーム

GET=0x2a / SET=0x29。4 方向を 1 フレームで読み書き（インデックス無し）。

| 操作 | パケット |
|------|----------|
| 取得 | `[167, 42]` → 応答 `[2,3]=up, [4,5]=down, [6,7]=left, [8,9]=right`（各 LE u16）|
| 設定 | `[167, 41, up_lo, up_hi, down_lo, down_hi, left_lo, left_hi, right_lo, right_hi]` |

### 3.3d profile

GET=0x2c / SET=0x2b は enum 定義のみで、**Launcher v1.3.8 では未実装**（対応サービスなし）。本ツールは扱わない。

### 3.4 常時ジェスチャー/スクロールモード

`byte[2]`/`byte[3]` は**独立した 0/1 バイト**（ビットマスクではない）。

| 操作 | パケット | 応答 |
|------|----------|------|
| 取得 | `[167, 51]` | `byte[2]`=gesture, `byte[3]`=scroll |
| 設定 | `[167, 50, gesture, scroll]` | — |

UI は排他選択（片方のみ 1）を保証する。両方 1 は送らないこと。

### 3.5 スリープタイマー

3 つの秒値を LE u16 で持つ。**GET 応答は byte[2]=0 のパディングがあり、SET にはパディングが無い**点に注意。

| 操作 | パケット |
|------|----------|
| 取得 | `[167, 11]` → 応答 `[167, 11, 0, bl_lo, bl_hi, sl_lo, sl_hi, ms_lo, ms_hi, …]` |
| 設定 | `[167, 12, bl_lo, bl_hi, sl_lo, sl_hi, ms_lo, ms_hi]` |

| フィールド | GET 応答オフセット | SET オフセット | 意味 |
|------------|-------------------:|--------------:|------|
| backlight | [3,4] | [2,3] | バックライト消灯時間（秒, UI 非表示）|
| sleep | [5,6] | [4,5] | スリープ時間（秒, UI の HH:MM:SS）|
| magnetScan | [7,8] | [6,7] | 磁気スキャン間隔（秒, UI 非表示）|

例: スリープ 600 秒（00:10:00）→ `sl_lo=0x58(88), sl_hi=0x02`。値 0 は「無効」の可能性があるため最小 60 秒程度を推奨。backlight/magnetScan を変えない場合は GET 値をそのまま送り返す。

### 3.6 ポーリングレート

インデックス方式。`index = log2(8000 / Hz)`、`Hz = 8000 >> index`。

| 操作 | パケット | 備考 |
|------|----------|------|
| 取得 | `[167, 13]` → 応答 `byte[6]` = 現在 index | `byte[5]` はサポートビットマスク |
| 設定 | `[167, 14, index, index]` | byte[2]=byte[3]（同値）|

| Hz | index |
|---:|------:|
| 8000 | 0 |
| 4000 | 1 |
| 2000 | 2 |
| 1000 | 3 |
| 500 | 4 |
| 250 | 5 |
| 125 | 6 |

Nape Pro の UI 表示は 125/500/1000 のみ（公式保証範囲）。

### 3.7 バッテリー（参照のみ・設定ではない）

| 操作 | パケット | 応答 |
|------|----------|------|
| 取得 | `[167, 49]` | `byte[2]`=残量%, `byte[3]`=充電中(1/0) |

### 3.8 キーマップ（VIA 標準）

| 操作 | パケット | 応答 |
|------|----------|------|
| 取得 | `[4, layer, row, col]` | キーコード = `byte[4]<<8 | byte[5]` |
| 設定 | `[5, layer, row, col, hi, lo]` | — |

Nape Pro は row=0, col=0〜6（7 スロット）、layer=0〜8。

### 3.9 エンコーダ（VIA 標準）

| 操作 | パケット | 応答 |
|------|----------|------|
| 取得 | `[20, layer, 0, dir]` | キーコード = `byte[4]<<8 | byte[5]` |
| 設定 | `[21, layer, 0, dir, hi, lo]` | — |

`dir`: 0=CCW（反時計回り）, 1=CW（時計回り）。encoder index は 0 固定（1 個）。

### 3.10 ファームウェアバージョン

`[0xA1]` → 応答の `byte[1]` 以降が ASCII 文字列（v1.2.3 は `"v1.2.3-ZK …"`、v1.2.5 は `"010205…"` 形式に変化）。

---

## 4. 永続化（保存）

**専用の COMMIT/SAVE コマンドは存在せず、全 SET は即時永続化される。** SET 後に追加の保存コマンドを
送ってはいけない（二重書き込みになる）。VIA 標準コマンドも自動で EEPROM 保存される。

---

## 5. キーコード対応（実測で判明分）

`byte[4]<<8 | byte[5]` で得る VIA キーコード。標準コードと Keychron 独自コードが混在する。

| コード(10) | 意味 | コード(10) | 意味 |
|-----------:|------|-----------:|------|
| 0 | なし | 209 | 左クリック |
| 210 | 右クリック | 211 | 中クリック |
| 212 | 戻る | 213 | 進む |
| 217 | スクロール↑ | 218 | スクロール↓ |
| 169 | 音量+ | 170 | 音量− |
| 224 | 左Ctrl | 225 | 左Shift |
| 62 | F5 | 79 | →（右矢印） |
| 80 | ←（左矢印） | | |
| 21033 (0x5229) | ボールジェスチャ | 21034 (0x522A) | ボールスクロール |
| 21035 (0x522B) | モード/レイヤ | 32293/32294/32299/32300 (0x7E..) | 独自（ジェスチャ系・未解読）|

### 物理ボタンとマトリクス列の対応（横置き時）

実機ラベルから確定。左に M1/M2、中央トラックボール、四隅に 01〜04、右にスクロールホイール。

| 物理 | M1 | M2 | 01 | 02 | 03 | 04 | 予備 |
|------|----|----|----|----|----|----|------|
| 列(col) | 4 | 5 | 2 | 3 | 0 | 1 | 6 |

---

## 6. 安全上の制約

- **回転角**: `value` は 0〜7 のみ。`Math.floor(deg/45) & 0x07` で範囲内に丸める。
- **スリープ**: LE u16。0 は「無効」の可能性。未変更フィールドは GET 値を流用。
- **ポーリング**: UI 範囲（125/500/1000Hz = index 6/4/3）外は公式保証外。
- **常時モード**: gesture と scroll を同時に 1 にしない。
- **combos**: 最大 30 件。`cols=0x0F` は anti-ghosting でブロック。余剰削除は降順 DEL。
- **保存コマンドは送らない**（即時永続のため）。
- 書き込み前に必ずフルエクスポートでバックアップを取る。

---

## 7. エクスポート JSON スキーマ（v1.3）

```jsonc
{
  "version": "1.3",
  "device": "Keychron Nape Pro",
  "exportDate": "ISO8601",
  "firmware": "…",
  "launcherVersion": "1.3.8 | null",
  "layerCount": 9,
  "keymap": [[k0..k6], …],            // レイヤー×7列の VIA キーコード
  "encoders": [{ "ccw": kc, "cw": kc }, …],
  "dpi": { "currentLevel": n, "levels": [{ "level": n, "dpi": n }, …] },
  "orientation": { "global": 0-7, "perLayer": [0-7, …] },   // ×45=度
  "combos": [{ "index": n, "timeout": ms, "layer": n, "cols": bitmask, "tap": kc, "held": kc }, …],
  "tapholds": [{ "layer": n, "col": 0-5, "tap": kc, "held": kc }, …],
  "gesture": { "up": kc, "down": kc, "left": kc, "right": kc },
  "deviceSettings": {
    "alwaysGesture": 0|1, "alwaysScroll": 0|1,
    "sleepBacklightSec": n, "sleepSec": n, "sleepMagnetScanSec": n,
    "pollingIndex": n, "pollingRateHz": n
  },
  "battery": { "percent": n, "charging": true|false }   // 参照のみ・非インポート
}
```

インポートで復元する範囲: keymap / encoders / dpi / orientation / combos / tapholds / gesture / deviceSettings。
`battery` は参照情報のため書き戻さない。profile は未実装のため対象外。
v1.2 以前の `rawSettings` 形式もインポートは後方互換で読める（1フレームのみ）。

---

## 8. 改訂履歴

- v1.0: keymap / encoders / dpi / rawSettings
- v1.1: orientation（回転角）追加
- v1.2: deviceSettings（常時モード・スリープ・ポーリング）追加、battery を参照情報として分離
- v1.3: combos を全件インデックス反復（最大30件）に、tap-hold を (layer,col) 全件に、gesture を構造化。
  旧 `rawSettings`（1フレーム）を廃し構造化フィールドへ（profile は未実装のため除外）

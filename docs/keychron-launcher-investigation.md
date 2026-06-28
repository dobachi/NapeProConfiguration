# Keychron Launcher — Nape Pro 設定エクスポート/インポート 基礎調査レポート

Keychron Launcher には Nape Pro 設定のエクスポート/インポート機能が標準で存在しないため、
WebHID API を直接叩くブラウザコンソール用スクリプトで設定をバックアップ/復元できるよう調査した記録。

> **⚠️ 免責**: 本調査・スクリプトは Keychron 公式の方法ではなく、非公式に WebHID を直接操作するもの。
> 利用はすべて自己責任で行うこと。設定書き込みに伴う破損・初期化等の不具合について作者は責任を負わない。
> 詳細は [`../tools/README.md`](../tools/README.md) の免責事項を参照。

> 調査は Claude (Sonnet 4.6) を用いて実施。実機での動作確認済み（後述の「実測データ」参照）。

## アプリケーション構成

- フレームワーク: Angular (Production Build)
- バンドル: `main.6acda9251655b3a5.js`（約 4MB）
- バージョン: Launcher V1.3.8
- 通信方式: WebHID API

## WebHID デバイス構成

Nape Pro 接続時、3 つの HID デバイスインタフェースが認識される。

| Index | usagePage         | usage | reportId | 役割                          |
|-------|-------------------|-------|----------|-------------------------------|
| 0     | 0xFF60 (Vendor)   | 0x61  | 0        | 設定通信用 (QMK RAW HID)      |
| 1     | 0x000C            | 0x01  | 2        | Consumer Control (未 open)    |
| 2     | 0x008C            | 0x01  | 177/178  | Keychron 独自プロトコル       |

全通信はデバイス 0 (usagePage=0xFF60) の 32 バイトパケットで行う。

## コマンドプロトコル

### 標準 VIA 互換コマンド

| コマンド                          | バイト                          | 説明                              |
|-----------------------------------|---------------------------------|-----------------------------------|
| DYNAMIC_KEYMAP_GET_LAYER_COUNT    | `[0x11]`                        | レイヤー数取得 → 9 レイヤー       |
| DYNAMIC_KEYMAP_GET_KEYCODE        | `[0x04, layer, row, col]`       | 各キーのキーコード取得            |
| DYNAMIC_KEYMAP_SET_KEYCODE        | `[0x05, layer, row, col, hi, lo]` | キーコード書き込み              |
| DYNAMIC_KEYMAP_GET_ENCODER        | `[0x14, layer, enc_id, cw]`     | エンコーダーキーコード取得        |
| DYNAMIC_KEYMAP_SET_ENCODER        | `[0x15, layer, enc_id, cw, hi, lo]` | エンコーダーキーコード書き込み |
| DYNAMIC_KEYMAP_GET_BUFFER         | `[0x12, off_hi, off_lo, size]`  | キーマップバッファ一括読み出し    |

### Keychron 独自コマンド (KC_MISC_CMD_GROUP = 0xa7 + サブコマンド)

| サブコマンド (GET)                | 値    | 対応 SET | 説明                          |
|-----------------------------------|-------|----------|-------------------------------|
| KC_USER_CMD_NAPE_GET_DPI          | 0x21  | 0x22     | 現在の DPI レベル番号         |
| KC_USER_CMD_NAPE_GET_DPI_VALUE    | 0x24  | 0x23     | 各 DPI レベルの値 (little-endian) |
| KC_USER_CMD_NAPE_GET_TAPHOLDS     | 0x26  | 0x25     | タップホールド設定            |
| KC_USER_CMD_NAPE_GET_COMBOS       | 0x28  | 0x27     | コンボ設定                    |
| KC_USER_CMD_NAPE_GET_GESTURE      | 0x2a  | 0x29     | ジェスチャ設定                |
| KC_USER_CMD_NAPE_GET_PROFILE      | 0x2c  | 0x2b     | プロファイル設定              |
| KC_USER_CMD_NAPE_GET_LAYER_ORI    | 0x38  | -        | レイヤー向き設定              |

> GET→SET のマッピングはインポートスクリプトで使用（`0x28→0x27`, `0x2a→0x29`, `0x26→0x25`, `0x2c→0x2b`）。

## Nape Pro キー構成

- マトリクス: Row=0, Col=0〜6（7 ボタン）
- エンコーダー: 1 個（トラックボール、CCW/CW）
- レイヤー: 9 レイヤー

## 実測データ（実機確認）

調査中に実際にデバイスから読み出せた値:

- レイヤー数: 9
- DPI レベル: 5 段階（400 / 800 / 1600 / 3200 / 4000 DPI）
- 現在の DPI レベル: 2 (1600 DPI)
- ファームウェア: `v1.2.3-ZK Jun 3 2026 17:59:21`

## ファームウェア互換性

| バージョン       | 確認日       | 結果                                   |
|------------------|--------------|----------------------------------------|
| v1.2.3-ZK (Jun 3 2026)  | 初回調査     | 全コマンド動作確認                    |
| v1.2.5-ZK (Jun 15 2026) | 再確認       | 全コマンド変化なし・スクリプト修正不要 |

v1.2.5-ZK での全コマンド再テスト結果（いずれも前回と挙動一致）:

| 項目                          | 結果       | 備考                              |
|-------------------------------|------------|-----------------------------------|
| レイヤー数取得 `0x11`         | 変化なし   | 9 レイヤー                        |
| キーマップ取得 `0x04`         | 変化なし   | `r[4]<<8 \| r[5]`                 |
| エンコーダー取得 `0x14`       | 変化なし   | `r[4]<<8 \| r[5]`                 |
| DPI 取得 `0xa7, 0x24`         | 変化なし   | `r[3]*256+r[2]` (little-endian)   |
| rawSettings 取得              | 変化なし   | combos / gesture / tapholds       |
| SET_KEYCODE `0x05`            | 変化なし   | 書き込み・読み戻し一致            |
| SET_ENCODER `0x15`            | 変化なし   | 書き込み・読み戻し一致            |
| SET_DPI_VALUE `0xa7, 0x23`    | 変化なし   | 800DPI 書き込み確認               |
| SET_DPI `0xa7, 0x22`          | 変化なし   | レベル 2 選択確認                 |

## 今後の拡張方針

- **raw bytes 解析**: コンボ/タップホールド/ジェスチャ（`0xa7 0x28` 等）のレスポンスフォーマットを
  さらに調べれば、人間が読める JSON 化が可能。
- **インポート機能**: `DYNAMIC_KEYMAP_SET_KEYCODE [0x05]`、`DYNAMIC_KEYMAP_SET_ENCODER [0x15]`、
  `KC_USER_CMD_NAPE_SET_DPI_VALUE [0xa7, 0x23]` 等で設定を書き戻せる（実装済み: `tools/import-nape-pro-settings.js`）。
- **UI ボタン追加**: Angular は production build のためコンポーネントへ直接アクセスできないが、
  DOM にボタンを動的追加して UI 上に「エクスポートボタン」を置くことは可能。

## 関連ファイル

- エクスポートスクリプト: [`tools/export-nape-pro-settings.js`](../tools/export-nape-pro-settings.js)
- インポートスクリプト: [`tools/import-nape-pro-settings.js`](../tools/import-nape-pro-settings.js)
- 使い方: [`tools/README.md`](../tools/README.md)

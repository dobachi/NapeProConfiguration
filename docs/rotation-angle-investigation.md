# 回転角（向き設定）のエクスポート/インポート対応 調査

現状のエクスポート/インポートは**トラックボールの回転角（OctaShift の向き設定）を扱えない**。
これを対応させるための調査記録と手順。

## 背景

- Nape Pro の **OctaShift** はデバイスの向き（横置き／縦置き／角度付き）を検知してレイヤを切り替える。
  角度付き設置（1/4-20 三脚マウント対応）に合わせ、ボール移動方向を補正する「回転角」を持つと考えられる。
- 公開情報に Launcher の RAW HID プロトコル詳細はない（ZMK ベースだが Keychron 独自部分は非公開）。
  → 実機観測でリバースエンジニアリングする。

## 既知の手がかり

- 基礎調査で発見済み: `KC_USER_CMD_NAPE_GET_LAYER_ORI = 0x38`（向き設定の GET）。
  これが回転角を含む可能性が高い。詳細は [`keychron-launcher-investigation.md`](keychron-launcher-investigation.md)。
- GET/SET の対応はコマンドごとにバラつく（規則性は弱い）:

  | 設定 | GET | SET |
  |------|-----|-----|
  | DPI レベル | 0x21 | 0x22 |
  | DPI 値 | 0x24 | 0x23 |
  | タップホールド | 0x26 | 0x25 |
  | コンボ | 0x28 | 0x27 |
  | ジェスチャ | 0x2a | 0x29 |
  | プロファイル | 0x2c | 0x2b |
  | **向き設定** | **0x38** | **0x37?（仮説）** |

  → 多くは `SET = GET - 1`。よって **SET_LAYER_ORI = 0x37** が第一候補（ただし要検証）。

## 調査手順

読み取り専用プローブ [`../tools/probe-layer-orientation.js`](../tools/probe-layer-orientation.js) を使う。

1. **基準取得**: Launcher 接続状態でプローブを実行し、出力 JSON を保存。
   同時に Launcher 上で現在の各向きの回転角（数値）をメモする。
2. **角度変更**: Launcher で**ある 1 つの向きの回転角だけ**を分かりやすい値に変更（例: 0° → 45°）。
3. **再取得**: もう一度プローブを実行して JSON を保存。
4. **差分比較**: 2 回の `a7 38 ...` レスポンスを比較し、変化したバイト位置と値から
   - 回転角がどのバイトに入るか（1 バイト=0-255 か、2 バイト=0-359 リトルエンディアンか）
   - 何向き分のデータがあるか（インデックス 0..7 のどれが有効か）
   を特定する。

## 実装方針（特定後）

- **エクスポート**: `[0xa7, 0x38]`（必要なら各向きインデックス）の raw bytes を JSON の
  `rawSettings.layerOri` 等として保存（combos 等と同じ方式）。
- **インポート**: 特定した SET コマンド（候補 `0x37`）で書き戻す。
  - SET の検証は**慎重に**: まず現在値をエクスポート退避 → 1 向きだけ書き込み → 読み戻して一致確認 →
    Launcher 表示と突き合わせ、の順で行う。
  - 万一に備え、書き込み前に必ずフルバックアップ（通常のエクスポート）を取る。

## ステータス

- [x] 既知 GET コマンド (0x38) の特定
- [x] 読み取り専用プローブスクリプト作成
- [ ] 実機プローブ出力の取得（基準）
- [ ] 角度変更後のプローブ出力の取得（差分用）
- [ ] 角度バイト・向き数の特定
- [ ] SET コマンドの特定・検証
- [ ] export/import への実装

## 出典

- [Yanko Design: Nape Pro hands-on (CES 2026, OctaShift/角度付き設置)](https://www.yankodesign.com/2026/01/08/keychrons-nape-pro-turns-your-mechanical-keyboard-into-a-laptop-style-trackball-rig-hands-on-at-ces-2026/)
- [Tom's Hardware: Keychron Nape Pro](https://www.tomshardware.com/peripherals/mice/keyboard-giant-keychron-unveils-new-nape-pro-trackball-with-programmable-buttons-low-profile-design-promotes-ergonomic-scrolling-without-leaving-your-keyboard)

# NapeProConfiguration

Keychron **Nape Pro** の設定管理と、コンフィグレーションに関する考察を蓄積するリポジトリ。

Keychron Launcher には設定のエクスポート/インポート機能が無いため、WebHID API を直接叩いて
設定をバックアップ/復元するためのツールと、その基礎調査結果をまとめている。

> ## ⚠️ 免責事項
>
> 本リポジトリのツールは Keychron 公式の機能ではなく、非公式に WebHID API を直接操作するものです。
> **利用はすべて自己責任** で行ってください。設定の破損・初期化・文鎮化等のいかなる不具合についても
> 作者は責任を負いません。詳細は [`tools/README.md`](tools/README.md) の免責事項を参照してください。

## ディレクトリ構成

| パス | 内容 |
|------|------|
| [`docs/`](docs/) | 調査レポート・考察 |
| [`docs/nape-pro-device.md`](docs/nape-pro-device.md) | デバイス概要・物理レイアウト・OctaShift・レイヤ番号のズレ |
| [`docs/nape-pro-hid-protocol.md`](docs/nape-pro-hid-protocol.md) | **HID プロトコル体系リファレンス（正典）** |
| [`docs/keychron-launcher-investigation.md`](docs/keychron-launcher-investigation.md) | 基礎調査（経緯・実測データ）|
| [`docs/rotation-angle-investigation.md`](docs/rotation-angle-investigation.md) | 回転角対応の調査記録 |
| [`tools/`](tools/) | エクスポート/インポート用ツール一式（[使い方](tools/README.md)） |
| [`configs/`](configs/) | 設定プロファイル。テーマ名ごとにディレクトリを作り、README とコンフィグ JSON を置く |
| `instructions/` | AI 開発支援設定（AI_Instruction_Kits サブモジュール）|

## 設定プロファイル (configs/)

設定はテーマ単位で `configs/<テーマ名>/` に管理する。各ディレクトリに概要 README と
エクスポート JSON を置く。

- [`configs/main-side-and-presentation/`](configs/main-side-and-presentation/) — Main / Side and Presentation（横置き・横置き設定用・プレゼン縦持ちをカバー）

## エクスポート/インポートの使い方

3 通りの方法を用意している（いずれも Keychron Launcher のページ上で実行する必要がある）。

- **ユーザースクリプト**（Tampermonkey 等）— Launcher に Export/Import ボタンを常時表示（おすすめ）
- **ブックマークレット**（インストール不要）— ブックマークをクリックして実行
- **手動** — コンソールにスクリプトを貼り付けて実行

詳細な手順は [`tools/README.md`](tools/README.md) を参照。

## 動作確認環境

- Keychron Launcher V1.3.8
- Nape Pro ファームウェア v1.2.3-ZK / v1.2.5-ZK（両者でコマンド変化なし）

ファームウェア更新でコマンドや構成が変わる可能性があるため、更新後はプロトコル/実測データを
再確認すること。

## ライセンス

- 本リポジトリの自作成果物（`tools/` `docs/` `configs/` `*.svg` 図・README 等）は **MIT License**
  （[`LICENSE`](LICENSE)）。Copyright (c) 2026 dobachi。
- サブモジュール [`instructions/ai_instruction_kits/`](instructions/ai_instruction_kits) は**別ライセンス**
  （[AI_Instruction_Kits](https://github.com/dobachi/AI_Instruction_Kits) 自身の LICENSE）に従い、本 LICENSE の対象外。
- 本ツール/文書は Keychron Launcher を相互運用目的で解析した**非公式**成果物。Keychron 公式とは無関係で、
  「Keychron」「Nape Pro」は各権利者の商標。詳細は [`NOTICE.md`](NOTICE.md) を参照。

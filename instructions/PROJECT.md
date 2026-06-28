# AI開発支援設定

このプロジェクトでは`instructions/ai_instruction_kits/`のAI指示書システムを使用します。
タスク開始時は`instructions/ai_instruction_kits/instructions/ja/system/ROOT_INSTRUCTION.md`を読み込んでください。

## プロジェクト設定
- 言語: 日本語 (ja)
- タスク管理・進捗追跡: AIツールのネイティブ機能を利用

## 重要なパス
- AI指示書システム: `instructions/ai_instruction_kits/`
- 安全なコミット: `scripts/commit.sh`
- プロジェクト固有の設定: このファイル（`instructions/PROJECT.md`）

## コミットルール
- **必須**: `bash scripts/commit.sh "メッセージ"` または `git commit -m "メッセージ"`
- **禁止**: AI署名付きコミット（自動検出・拒否されます）

## プロジェクトの目的

Keychron **Nape Pro** の設定管理と、コンフィグレーションに関する考察の蓄積を行うリポジトリ。

- Keychron Launcher で設定を行うが、エクスポート/インポート機能が無いため、
  WebHID API を直接叩くブラウザコンソール用スクリプトでバックアップ/復元できるようにした。

## ディレクトリ構成

- `docs/` — 調査レポート・考察
  - `keychron-launcher-investigation.md` — HIDプロトコル/コマンド/実測データの基礎調査
- `tools/` — ブラウザコンソール用スクリプト
  - `export-nape-pro-settings.js` — 設定を JSON へエクスポート
  - `import-nape-pro-settings.js` — JSON からデバイスへインポート
  - `README.md` — 使い方

## プロジェクト固有の追加指示

- 動作確認環境: Launcher V1.3.8 / FW v1.2.3-ZK および v1.2.5-ZK（両者でコマンド変化なし）。
  ファームウェア更新でコマンドや構成が変わる可能性があるため、更新後はプロトコル/実測データを再確認すること。
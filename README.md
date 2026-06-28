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
| [`docs/keychron-launcher-investigation.md`](docs/keychron-launcher-investigation.md) | HID プロトコル / コマンド / 実測データの基礎調査 |
| [`tools/`](tools/) | エクスポート/インポート用ツール一式（[使い方](tools/README.md)） |
| [`configs/`](configs/) | 設定プロファイル。テーマ名ごとにディレクトリを作り、README とコンフィグ JSON を置く |
| `instructions/` | AI 開発支援設定（AI_Instruction_Kits サブモジュール）|

## 設定プロファイル (configs/)

設定はテーマ単位で `configs/<テーマ名>/` に管理する。各ディレクトリに概要 README と
エクスポート JSON を置く。

- [`configs/side-and-presentation/`](configs/side-and-presentation/) — Side and Presentation

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

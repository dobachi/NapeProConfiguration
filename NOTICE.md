# ライセンス・権利表記

## このリポジトリのライセンス

本リポジトリが**自前で作成した成果物**（`tools/`、`docs/`、`configs/`、`*.svg` 図、README 等）は
**MIT License**（[`LICENSE`](LICENSE)）で提供されます。Copyright (c) 2026 dobachi。

## 第三者の成果物（本リポジトリのライセンス対象外）

### サブモジュール instructions/ai_instruction_kits

[`instructions/ai_instruction_kits/`](instructions/ai_instruction_kits) は別リポジトリ
（[AI_Instruction_Kits](https://github.com/dobachi/AI_Instruction_Kits)）の git サブモジュールであり、
**そのリポジトリ自身のライセンス**（MIT、ただし指示書ごとに個別ライセンスが混在）に従います。
本リポジトリの `LICENSE` の対象ではありません。詳細は当該サブモジュール内の
`LICENSE` / `LICENSE-NOTICE.md` を参照してください。

## 免責・商標・リバースエンジニアリングについて

- 本リポジトリの設定エクスポート/インポートツールおよび HID プロトコル文書は、Keychron Launcher を
  **相互運用（個人設定のバックアップ/復元）目的で解析**して得た知見に基づく**非公式**の成果物です。
  Keychron 公式の機能・サポートとは無関係であり、利用はすべて**自己責任**です
  （[`tools/README.md`](tools/README.md) の免責事項を参照）。
- **「Keychron」「Nape Pro」その他の名称は、各権利者の商標**です。本リポジトリはそれらの権利者と
  提携・承認関係にありません。名称は識別目的でのみ使用しています。
- `configs/` 配下のエクスポート JSON は、デバイス所有者自身の設定データです。

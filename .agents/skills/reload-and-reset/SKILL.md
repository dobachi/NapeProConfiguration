---
name: reload-and-reset
description: AI指示書システムを最新化し作業ルールを再確認する。タスク状態確認・サブモジュール更新・システムリセット宣言・ROOT_INSTRUCTION読み込み・スキル確認を行う。スキルに従わない挙動や長時間作業後に有効。
---

# 指示書リロード＆リセット

AI 指示書システムを最新化し、作業ルールを再確認する。実行時はリポジトリ構成に応じてサブモジュールパスを判断する。

## 手順

1. **タスク状態の確認**
   - 進行中タスクがあれば、AIツールのネイティブなタスク管理（Todo等）の内容を要約して報告する。
2. **サブモジュール更新**
   - `instructions/ai_instruction_kits/.git` が存在する場合は `git submodule update --remote instructions/ai_instruction_kits` を実行し、結果を共有する。
   - このプロジェクト自体で実行している場合は、サブモジュール更新をスキップしたことを明記する。
3. **更新状態の確認**
   - `git submodule status instructions/ai_instruction_kits` または `git rev-parse --short HEAD` で現在のバージョンを示す。
4. **システムリセット宣言**
   - 以下の状態に戻ったことを明言し、必要なら確認する。
     - 指示書システムが最新
     - ROOT_INSTRUCTION に従うモード
     - タスク管理はAIツールのネイティブ機能を利用
     - パス変換ルールの再確認済み
5. **ROOT_INSTRUCTION の読み込み**
   - 環境に応じた正しいパスを開き、要点を確認して共有する。
     - サブモジュール経由: `instructions/ai_instruction_kits/instructions/ja/system/ROOT_INSTRUCTION.md`
     - このプロジェクト内: `instructions/ja/system/ROOT_INSTRUCTION.md`
6. **スキル確認**
   - インストール済みスキル（`.claude/skills/`・`.agents/skills/`）を確認し、タスクに応じて利用できることを報告する。

## 推奨タイミング

- スキルに従わない挙動が見られたとき
- 長時間作業を続けたあと
- 指示書システムを更新した直後
- 新しいタスクセットに取り掛かる前

## 注意事項

- 破壊的な操作は含まれていないが、念のためコミット状況を確認してから実行する。
- チームで共有している環境の場合は、サブモジュール更新が他メンバーへ影響しないか確認する。

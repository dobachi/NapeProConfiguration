---
name: reload-instructions
description: 指示書サブモジュールを最新化しROOT_INSTRUCTIONを再確認する。サブモジュール更新・リビジョン確認・ROOT_INSTRUCTION読み込み・スキル確認を行う。
---

# 指示書システムリロード

指示書サブモジュールを最新化し、ROOT_INSTRUCTION を再確認する簡易手順。

## 手順

1. **サブモジュール更新**
   ```bash
   git submodule update --remote instructions/ai_instruction_kits
   ```
   - 実行結果を報告し、必要なら差分を確認する。
2. **更新状態の確認**
   - `git submodule status instructions/ai_instruction_kits` を実行し、取得したリビジョンを共有する。
3. **ROOT_INSTRUCTION の読み込み**
   - `instructions/ai_instruction_kits/instructions/ja/system/ROOT_INSTRUCTION.md` を開き、インストール済みスキルと基本ワークフローを確認する。
   - このプロジェクト自身で作業している場合は、ルート直下の `instructions/ja/system/ROOT_INSTRUCTION.md` を参照する。
4. **スキル確認**
   - インストール済みスキル（`.claude/skills/`・`.agents/skills/`）を確認し、最新版と差分がないかチェックする。

## 注意事項

- サブモジュールの更新はリモートに影響しないが、ローカル変更がある場合は衝突に注意する。
- 以降の作業ではスキルを活用してタスクを進める。

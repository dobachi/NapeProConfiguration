# 指示書リロード＆リセット（Codex版）

AI 指示書システムを最新化し、作業ルールを再確認するための手順です。実行する際は、リポジトリ構成に応じてサブモジュールパスを判断してください。

## 手順
1. **タスク状態の確認**
   - 進行中タスクがあれば、AIツールのネイティブなタスク管理（Todo等）の内容を要約して報告します。
2. **サブモジュール更新**
   - `instructions/ai_instruction_kits/.git` が存在する場合は `git submodule update --remote instructions/ai_instruction_kits` を実行し、結果を共有します。
   - このプロジェクト自体で実行している場合は、サブモジュール更新をスキップしたことを明記します。
3. **更新状態の確認**
   - `git submodule status instructions/ai_instruction_kits` または `git rev-parse --short HEAD` を使って現在のバージョンを示します。
4. **システムリセット宣言**
   - 以下の状態に戻ったことを明言し、必要ならユーザーに確認します。
     - 指示書システムが最新
     - ROOT_INSTRUCTION に従うモード
     - タスク管理はAIツールのネイティブ機能を利用
     - パス変換ルールの再確認済み
5. **ROOT_INSTRUCTION の読み込み**
   - 環境に応じた正しいパスを開き、要点を確認して共有します。
     - サブモジュール経由: `instructions/ai_instruction_kits/instructions/ja/system/ROOT_INSTRUCTION.md`
     - このプロジェクト内: `instructions/ja/system/ROOT_INSTRUCTION.md`
6. **スキル確認**
   - `.claude/skills/` のインストール済みスキルを確認し、タスクに応じて利用できることを報告します。

## 推奨タイミング
- スキルに従わない挙動が見られたとき
- 長時間作業を続けたあと
- 指示書システムを更新した直後
- 新しいタスクセットに取り掛かる前

## 注意事項
- 破壊的な操作は含まれていませんが、念のためコミット状況を確認してから実行します。
- チームで共有している環境の場合は、サブモジュール更新が他メンバーへ影響しないか確認します。

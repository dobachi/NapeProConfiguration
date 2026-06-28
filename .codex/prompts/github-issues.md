# GitHub Issue確認・整理（Codex版）

このコマンドは、リポジトリの Issue 状況を素早く把握し、次のアクションを整理するための手順を示します。必要に応じて GitHub CLI を活用してください。

## 手順
1. **GitHub CLI の利用可否を確認**  
   - `gh auth status` を実行し、認証済みかチェックします。未認証なら `gh auth login` を案内します。
2. **オープン Issue の一覧取得**  
   - `gh issue list --state open --limit 30 --json number,title,labels,assignees,createdAt` を実行し、番号・タイトル・担当者・ラベルを共有します。  
   - CLI が使えない場合は、ブラウザで Issue ページを開くよう案内します。
3. **ラベル別の集計**  
   - `gh issue list --state open --json labels --jq '[.[] | .labels[].name] | group_by(.) | map({label: .[0], count: length}) | sort_by(.count) | reverse'` などを活用し、主要ラベルの件数を整理します。  
   - 取得件数が多すぎる場合は上位 10 件程度に絞ります。
4. **最近作成された Issue の確認**  
   - 過去 7 日以内の Issue を抽出し、番号・タイトル・作成日を共有します。  
   - `--search "created:>YYYY-MM-DD"` を利用すると便利です。
5. **高優先度 Issue の確認**  
   - `gh issue list --state open --label "priority:high,bug,critical"` など、チームで重要とされるラベルに基づき抽出します。
6. **タスク整理と提案**  
   - 優先度、依存関係、担当者の偏り、作業量などの観点で簡潔に整理し、次に着手すべき項目を提案します。

## 注意事項
- プライベートリポジトリでは必要な権限があるか確認します。  
- API 制限に達した場合は、リクエスト数を減らすか時間を置きます。  
- CLI 経由で Issue を更新する場合は、実行前にユーザーへ意図を確認します。

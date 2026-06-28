# Nape Pro 設定エクスポート/インポートツール

Keychron Launcher にはエクスポート/インポート機能が無いため、WebHID API を直接叩く
ブラウザコンソール用スクリプトで設定をバックアップ/復元する。

調査の詳細は [`../docs/keychron-launcher-investigation.md`](../docs/keychron-launcher-investigation.md) を参照。

## 前提

- Chrome / Edge など WebHID 対応ブラウザ
- [Keychron Launcher](https://launcher.keychron.com) を開き、Nape Pro を接続済みであること

## 使い方

### エクスポート

1. Launcher を開き Nape Pro を接続する
2. DevTools を開く（`F12` または `Ctrl+Shift+I`）→ **Console** タブ
3. 初回のみ: セキュリティ警告が出たら `allow pasting` と入力して Enter
4. [`export-nape-pro-settings.js`](export-nape-pro-settings.js) の中身を貼り付けて Enter
5. `nape-pro-settings-YYYY-MM-DD.json` が自動ダウンロードされる

### インポート

1. 同様に Console を開く
2. [`import-nape-pro-settings.js`](import-nape-pro-settings.js) の中身を貼り付けて Enter
3. ファイル選択ダイアログでエクスポート済み JSON を選ぶ
4. キーマップ / エンコーダー / DPI / その他設定がデバイスへ書き込まれる
5. Launcher の画面をリロード/タブ切替で反映を確認

## 注意

- 書き込み中はデバイスを抜かない
- `javascript is not defined` エラーが出る場合は、貼り付けたテキスト先頭に余分な文字が
  混入している。スクリプトの最初の文字が `(` であることを確認する
- 動作確認環境: Launcher V1.3.8 / FW v1.2.3-ZK および v1.2.5-ZK（両者でコマンド変化なし）。
  ファームウェア更新でコマンドや構成が変わる可能性があるため、更新後は再確認すること。

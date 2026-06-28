# Nape Pro 設定エクスポート/インポートツール

> ## ⚠️ 免責事項（必ず最初にお読みください）
>
> 本ツールは Keychron 公式の機能ではなく、非公式に WebHID API を直接操作するものです。
> **利用はすべて自己責任** で行ってください。
>
> - デバイスの設定書き込み（インポート）に伴う設定の破損・初期化・文鎮化等の
>   いかなる不具合についても、作者は責任を負いません。
> - ファームウェア更新によりコマンドや構成が変わり、動作しなくなる/誤動作する可能性があります。
> - 重要な設定は事前にエクスポートしてバックアップを取り、書き込み前に必ず保管してください。
> - Keychron 公式サポートの対象外です。

Keychron Launcher にはエクスポート/インポート機能が無いため、WebHID API を直接叩く
ブラウザコンソール用スクリプトで設定をバックアップ/復元する。

調査の詳細は [`../docs/keychron-launcher-investigation.md`](../docs/keychron-launcher-investigation.md) を参照。

> **WebHID の制約**: デバイス権限は Launcher のページに紐づくため、どの方法でも
> スクリプトは **launcher.keychron.com を開いた状態のそのページ上** で動かす必要がある。
> ローカルの HTML ファイルや別タブからはデバイスにアクセスできない。

## 前提

- Chrome / Edge など WebHID 対応ブラウザ
- [Keychron Launcher](https://launcher.keychron.com) を開き、Nape Pro を接続済みであること

## おすすめ: ワンクリックで使う方法

毎回コンソールに貼り付けるのが面倒な場合は、以下のどちらかを使う。

### A. ブックマークレット（インストール不要）

ブックマークを 1 回登録すれば、以降はクリックするだけでエクスポートできる。

エクスポート用・インポート用をそれぞれブックマークとして登録する。

1. ブラウザで適当なページをブックマークし、「名前」と「URL」を以下に書き換えて保存する
   - エクスポート: 名前 `Nape Pro Export` / URL = [`export-bookmarklet.txt`](export-bookmarklet.txt) の中身（`javascript:` から始まる 1 行）
   - インポート: 名前 `Nape Pro Import` / URL = [`import-bookmarklet.txt`](import-bookmarklet.txt) の中身
2. Launcher を開いて Nape Pro を接続した状態で、目的のブックマークをクリック
   - Export → `nape-pro-settings-YYYY-MM-DD.json` が自動ダウンロードされる
   - Import → ファイル選択ダイアログで JSON を選ぶとデバイスへ書き込まれる

> `*-bookmarklet.txt` は `export/import-nape-pro-settings.js` から自動生成される。
> 元スクリプトを修正したら `node build-bookmarklet.js` で再生成すること。

### B. ユーザースクリプト（Tampermonkey 等・ボタンが常時表示）

[Tampermonkey](https://www.tampermonkey.net/) や Violentmonkey に
[`nape-pro-export.user.js`](nape-pro-export.user.js) を登録すると、Launcher を開くたびに
画面右下に **⬇ Export / ⬆ Import** ボタンが表示され、1 クリックで実行できる。

1. Tampermonkey を入れて「新規スクリプト」に `nape-pro-export.user.js` の内容を貼り付けて保存
2. Launcher を開く → 右下のボタンをクリック

## 手動: コンソールに貼り付ける方法

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

## バージョン照合

- **エクスポート時**: ファームウェア（HID コマンド `0xa1`）と Launcher バージョンを記録する。
  結果は JSON の `firmware` / `launcherVersion` に入り、コンソールにも表示される。
- **インポート時**: 書き込み前にデバイスの現ファームウェア／現 Launcher バージョンを読み、
  ファイルの値と照合する。**食い違う場合は確認ダイアログ**を表示し、続行可否を選べる。
- ファームウェアは HID で確実に取得できる。**Launcher バージョンはページ (DOM) から
  best-effort で取得**するため、Launcher の画面構成変更で取得できず `null` になることがある
  （その場合は照合をスキップ）。

## エクスポート/インポート対象

| 項目 | エクスポート | インポート |
|------|:---:|:---:|
| キーマップ / エンコーダ / DPI | ✅ | ✅ |
| combos / gesture / tapholds / profile | ✅ | ✅ |
| 回転角（全体・レイヤー別）| ✅ | ✅（読み戻し検証付き）|
| 常時ジェスチャー/スクロール・スリープ・ポーリング | ✅ | ✅ |
| バッテリー | ✅（参照のみ）| — |

全 HID コマンド・パケット形式の仕様は [`../docs/nape-pro-hid-protocol.md`](../docs/nape-pro-hid-protocol.md)（体系的リファレンス）を参照。

## 既知の制限

- バッテリー残量は参照情報のため書き戻さない（設定ではない）。
- `0x7Exx` / `0x023E` 等の一部キーコードは人間可読名が未解読（動作には影響しない）。

## 注意

- 書き込み中はデバイスを抜かない
- `javascript is not defined` エラーが出る場合は、貼り付けたテキスト先頭に余分な文字が
  混入している。スクリプトの最初の文字が `(` であることを確認する
- 動作確認環境: Launcher V1.3.8 / FW v1.2.3-ZK および v1.2.5-ZK（両者でコマンド変化なし）。
  ファームウェア更新でコマンドや構成が変わる可能性があるため、更新後は再確認すること。

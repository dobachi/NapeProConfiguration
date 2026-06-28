/*
 * export/import スクリプトからブックマークレット (*.txt) を生成する。
 *
 *   export-nape-pro-settings.js -> export-bookmarklet.txt
 *   import-nape-pro-settings.js -> import-bookmarklet.txt
 *
 * 使い方:  node tools/build-bookmarklet.js
 *
 * 元スクリプトを修正したら本スクリプトを実行して再生成すること。
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;

function build(srcName, outName) {
  let src = fs.readFileSync(path.join(dir, srcName), 'utf8');
  // 先頭のブロックコメントを除去
  src = src.replace(/^\/\*[\s\S]*?\*\/\s*/, '');
  // 行コメント (// ...) を除去（これらのスクリプトは文字列内に // を含まないため安全）
  src = src.split('\n').map(l => l.replace(/\s*\/\/.*$/, '')).join('\n').trim();

  const bookmarklet = 'javascript:' + encodeURIComponent(src);
  fs.writeFileSync(path.join(dir, outName), bookmarklet + '\n');
  console.log(`generated tools/${outName} (${bookmarklet.length} chars)`);
}

build('export-nape-pro-settings.js', 'export-bookmarklet.txt');
build('import-nape-pro-settings.js', 'import-bookmarklet.txt');

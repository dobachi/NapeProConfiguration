/*
 * コンフィグ JSON から、Nape Pro の物理レイアウトに沿ったレイヤ別 SVG 解説図を生成する。
 *
 * 使い方:  node tools/build-layer-diagrams.js <config.json>
 *   例:    node tools/build-layer-diagrams.js configs/main-side-and-presentation/nape-pro-settings-2026-06-28.json
 *
 * 出力先: <config.json と同じディレクトリ>/diagrams/layer-N.svg
 *
 * 物理レイアウト（横置き時, 実機写真に基づく）:
 *   左側に M1(上)/M2(下)、中央にトラックボール、その四隅に 01(左上)/02(左下)/03(右上)/04(右下)、
 *   右側にスクロールホイール。キーマップの列 (Col0-6) と物理ボタンの対応は実機ラベルから確定:
 *     01=Col2, 02=Col3, 03=Col0, 04=Col1, M1=Col4, M2=Col5, 予備=Col6
 */
const fs = require('fs');
const path = require('path');

// 標準キーコード
const KEYCODES = {
  0: 'なし', 209: '左クリック', 210: '右クリック', 211: '中クリック',
  212: '戻る', 213: '進む', 217: 'スクロール↑', 218: 'スクロール↓',
  169: '音量+', 170: '音量−', 224: '左Ctrl', 225: '左Shift',
  62: 'F5', 79: '→', 80: '←'
};
// 実機ラベルから判明した Keychron 独自コード
const CUSTOM = { 21033: 'ボールジェスチャ', 21034: 'ボールスクロール', 21035: 'モード/レイヤ' };

function decode(code) {
  if (code in KEYCODES) return KEYCODES[code];
  if (code in CUSTOM) return CUSTOM[code];
  return '独自(0x' + code.toString(16).toUpperCase() + ')';
}

// 列 (Col0-6) -> 物理ボタン
const COL = { b03: 0, b04: 1, b01: 2, b02: 3, m1: 4, m2: 5, x: 6 };

// 役割は device VIA index 基準（内容ベース）。
const ROLES = {
  0: 'ベース', 1: 'フルマウス', 2: '設定/ジェスチャ',
  3: 'プレゼン', 4: '基本ポインタ＋ジェスチャ'
};

// device VIA index → 見出しラベル。Launcher 表示は device index を 1 ずらす（index0 は base で非表示）。
function layerTitle(i) {
  if (i === 0) return 'Base（device index 0 / Launcher 非表示）';
  if (i === 4) return 'Launcher Layer 3〜7（device index 4〜8）';
  return `Launcher Layer ${i - 1}（device index ${i}）`;
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function box(x, y, w, h, title, label) {
  return `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#2a2a2a" stroke="#555"/>
  <text x="${x + w / 2}" y="${y + 18}" fill="#888" font-size="12" text-anchor="middle">${esc(title)}</text>
  <text x="${x + w / 2}" y="${y + h / 2 + 12}" fill="#fff" font-size="15" text-anchor="middle">${esc(label)}</text>`;
}

// 回転角に応じた「上方向」マーカー。0°=画面上、時計回りに回転（90°=右,180°=下,270°=左）。
function upArrow(oriRaw) {
  if (typeof oriRaw !== 'number') return '';
  const cx = 500, cy = 195, len = 96;
  const rad = oriRaw * 45 * Math.PI / 180;
  const tx = cx + len * Math.sin(rad);
  const ty = cy - len * Math.cos(rad);
  const lx = cx + (len + 16) * Math.sin(rad);
  const ly = cy - (len + 16) * Math.cos(rad);
  return `<line x1="${cx}" y1="${cy}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="#9cf" stroke-width="4" marker-end="url(#up)"/>
  <text x="${lx.toFixed(1)}" y="${(ly + 5).toFixed(1)}" fill="#9cf" font-size="14" font-weight="bold" text-anchor="middle">上</text>`;
}

function svgForLayer(layerIndex, keys, enc, oriRaw) {
  const role = ROLES[layerIndex] || '';
  const ccw = decode(enc.ccw), cw = decode(enc.cw);
  const title = layerTitle(layerIndex);
  const oriText = (typeof oriRaw === 'number') ? `回転角: ${oriRaw * 45}°` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="360" viewBox="0 0 900 360" font-family="sans-serif">
  <defs>
    <marker id="up" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#9cf"/>
    </marker>
  </defs>
  <rect width="900" height="360" fill="#1b1b1b"/>
  <text x="30" y="38" fill="#fff" font-size="20" font-weight="bold">${esc(title)} — ${esc(role)}</text>
  <text x="870" y="38" fill="#9cf" font-size="15" text-anchor="end">${esc(oriText)}</text>

  ${box(25, 110, 150, 70, 'M1', decode(keys[COL.m1]))}
  ${box(25, 200, 150, 70, 'M2', decode(keys[COL.m2]))}

  ${box(300, 90, 110, 70, '01', decode(keys[COL.b01]))}
  ${box(300, 230, 110, 70, '02', decode(keys[COL.b02]))}
  <circle cx="500" cy="195" r="70" fill="#333" stroke="#666" stroke-width="2"/>
  <text x="500" y="200" fill="#777" font-size="13" text-anchor="middle">ball</text>
  ${upArrow(oriRaw)}
  ${box(560, 90, 110, 70, '03', decode(keys[COL.b03]))}
  ${box(560, 230, 110, 70, '04', decode(keys[COL.b04]))}

  <rect x="710" y="150" width="170" height="70" rx="8" fill="#2a2a2a" stroke="#555"/>
  <text x="795" y="168" fill="#888" font-size="12" text-anchor="middle">ホイール (CW/CCW)</text>
  <text x="795" y="197" fill="#fff" font-size="13" text-anchor="middle">${esc(cw + ' / ' + ccw)}</text>

  <text x="30" y="340" fill="#888" font-size="12">予備ボタン: ${esc(decode(keys[COL.x]))}</text>
</svg>`;
}

function main() {
  const configPath = process.argv[2];
  if (!configPath) { console.error('usage: node tools/build-layer-diagrams.js <config.json>'); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const outDir = path.join(path.dirname(configPath), 'diagrams');
  fs.mkdirSync(outDir, { recursive: true });

  // 個別のレイヤ 0〜3 と、4〜8 代表として 4 を出力
  const targets = [0, 1, 2, 3, 4];
  const perLayerOri = data.orientation && data.orientation.perLayer;
  for (const i of targets) {
    const oriRaw = perLayerOri ? perLayerOri[i] : undefined;
    const svg = svgForLayer(i, data.keymap[i], data.encoders[i], oriRaw);
    const out = path.join(outDir, `layer-${i}.svg`);
    fs.writeFileSync(out, svg);
    console.log('generated ' + path.relative(process.cwd(), out));
  }
}

main();

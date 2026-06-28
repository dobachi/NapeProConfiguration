/*
 * Nape Pro 回転角（向き設定）調査用プローブスクリプト ★読み取り専用・安全★
 *
 * 既知の GET コマンド KC_USER_CMD_NAPE_GET_LAYER_ORI (0xa7, 0x38) を、引数なし／向きインデックス
 * 付き (0..7) で読み出して 32 バイトをそのままダンプする。書き込みは一切行わない。
 *
 * 目的: 回転角がどのバイトにどう格納されているか、また何向き分あるかを突き止める。
 *
 * 使い方:
 *   1. Keychron Launcher を開き Nape Pro を接続
 *   2. DevTools コンソールにこのファイルの内容を貼り付けて実行
 *   3. ダウンロードされる JSON を共有する
 *   4. 次に Launcher で「回転角」を分かりやすい値（例: ある向きだけ +45°）に変えて再実行し、
 *      もう一度 JSON を共有する → 2 回の差分で角度バイトと書き込み方法を特定できる
 *
 * ⚠️ 非公式・自己責任（詳細は ./README.md の免責事項）。本スクリプト自体は読み取りのみ。
 */
(async function probeLayerOrientation() {
  const devices = await navigator.hid.getDevices();
  const dev = devices.find(d =>
    d.productId === 1088 &&
    d.opened &&
    d.collections.some(c => c.usagePage === 0xFF60)
  );
  if (!dev) { alert('Nape Pro が見つかりません。Launcherで接続してください。'); return; }

  function sendCmd(bytes) {
    const buf = new Uint8Array(32).fill(0);
    bytes.forEach((b, i) => buf[i] = b);
    return new Promise((resolve, reject) => {
      const h = (e) => { dev.removeEventListener('inputreport', h); resolve(new Uint8Array(e.data.buffer)); };
      dev.addEventListener('inputreport', h);
      setTimeout(() => { dev.removeEventListener('inputreport', h); reject(new Error('timeout')); }, 3000);
      dev.sendReport(0, buf).catch(reject);
    });
  }
  const hex = (a) => Array.from(a).map(b => b.toString(16).padStart(2, '0')).join(' ');

  // 文脈情報（ファーム）
  const fwResp = await sendCmd([0xa1]);
  const firmware = fwResp.slice(1).filter(b => b > 0).map(b => String.fromCharCode(b)).join('');

  const out = {
    device: 'Keychron Nape Pro',
    probeDate: new Date().toISOString(),
    firmware,
    note: 'GET_LAYER_ORI (0xa7,0x38) 読み取り専用ダンプ。回転角変更の前後で2回取得して差分を比較する。',
    probes: []
  };

  // (1) 引数なし
  let r = await sendCmd([0xa7, 0x38]);
  out.probes.push({ cmd: 'a7 38', hex: hex(r), bytes: Array.from(r) });
  console.log('a7 38           :', hex(r));

  // (2) 向きインデックス付き 0..7 (OctaShift = 最大8向きを想定)
  for (let i = 0; i < 8; i++) {
    r = await sendCmd([0xa7, 0x38, i]);
    const tag = 'a7 38 ' + i.toString(16).padStart(2, '0');
    out.probes.push({ cmd: tag, hex: hex(r), bytes: Array.from(r) });
    console.log(tag.padEnd(16), ':', hex(r));
  }

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nape-pro-layerori-probe-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('プローブ完了。ダウンロードされた JSON を共有してください。', out);
  return out;
})();

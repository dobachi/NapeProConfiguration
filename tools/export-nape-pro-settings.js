/*
 * Keychron Nape Pro 設定エクスポートスクリプト
 *
 * ⚠️ 非公式ツール。利用は自己責任で（詳細は ./README.md の免責事項）。
 *
 * Keychron Launcher (https://launcher.keychron.com) を開き Nape Pro を接続した状態で、
 * ブラウザの DevTools コンソールにこのファイルの内容を貼り付けて実行する。
 * 設定が nape-pro-settings-YYYY-MM-DD.json として自動ダウンロードされる。
 *
 * 詳細は ../docs/keychron-launcher-investigation.md と ./README.md を参照。
 * 実機 (Launcher V1.3.8 / FW v1.2.3-ZK・v1.2.5-ZK) で動作確認済み。
 */
(async function exportNapeProSettings() {
  const devices = await navigator.hid.getDevices();
  const dev = devices.find(d =>
    d.productId === 1088 &&
    d.opened &&
    d.collections.some(c => c.usagePage === 0xFF60)
  );
  if (!dev) { alert('Nape Pro が見つかりません。Launcherで接続してください。'); return; }

  async function sendCmd(bytes) {
    const buf = new Uint8Array(32).fill(0);
    bytes.forEach((b, i) => buf[i] = b);
    return new Promise((resolve, reject) => {
      const h = (e) => { dev.removeEventListener('inputreport', h); resolve(new Uint8Array(e.data.buffer)); };
      dev.addEventListener('inputreport', h);
      setTimeout(() => { dev.removeEventListener('inputreport', h); reject(new Error('timeout')); }, 3000);
      dev.sendReport(0, buf).catch(reject);
    });
  }

  // Keychron Launcher のバージョンをページから best-effort で取得（HIDでは取れないため）。
  // Launcher 側の DOM 変更で取得できなくなる可能性あり。取れない場合は null。
  function getLauncherVersion() {
    try {
      const text = (document.body && document.body.innerText) || '';
      const m = text.match(/Launcher\s*V?\s*(\d+\.\d+\.\d+)/i) || text.match(/\bV(\d+\.\d+\.\d+)\b/);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  const fwResp = await sendCmd([0xa1]);
  const firmware = fwResp.slice(1).filter(b => b > 0).map(b => String.fromCharCode(b)).join('');
  const launcherVersion = getLauncherVersion();
  const layerCount = (await sendCmd([0x11]))[1];

  const keymap = [];
  for (let layer = 0; layer < layerCount; layer++) {
    const keys = [];
    for (let col = 0; col < 7; col++) {
      const r = await sendCmd([0x04, layer, 0, col]);
      keys.push((r[4] << 8) | r[5]);
    }
    keymap.push(keys);
  }

  const encoders = [];
  for (let layer = 0; layer < layerCount; layer++) {
    const ccwR = await sendCmd([0x14, layer, 0, 0]);
    const cwR  = await sendCmd([0x14, layer, 0, 1]);
    encoders.push({ ccw: (ccwR[4] << 8) | ccwR[5], cw: (cwR[4] << 8) | cwR[5] });
  }

  const dpiCurrentLevel = (await sendCmd([0xa7, 0x21]))[2];
  const dpiLevels = [];
  for (let i = 0; i < 5; i++) {
    const r = await sendCmd([0xa7, 0x24, i]);
    const val = r[3] * 256 + r[2]; // little-endian
    if (val > 0) dpiLevels.push({ level: i, dpi: val });
  }

  // 回転角出力 (orientation)。値 ×45 = 度 (0=0°,1=45°,…,7=315°)。
  // GET_ORI=0x20(全体), GET_LAYER_ORI=0x38+layer(レイヤー別)。
  const globalOri = (await sendCmd([0xa7, 0x20]))[2];
  const layerOri = [];
  for (let layer = 0; layer < layerCount; layer++) {
    layerOri.push((await sendCmd([0xa7, 0x38, layer]))[2]);
  }

  // デバイス設定（インポートで復元される）。応答バイト位置はソース解析で確定。
  const u16le = (a, i) => (a[i + 1] << 8) | a[i];
  const alwaysRaw = await sendCmd([0xa7, 0x33]); // 常時モード: byte[2]=gesture, byte[3]=scroll
  const sleepRaw  = await sendCmd([0xa7, 0x0b]); // スリープ: [3,4]backlight [5,6]sleep [7,8]magnetScan (各 LE u16, 秒)
  const pollRaw   = await sendCmd([0xa7, 0x0d]); // ポーリング: byte[6]=index (Hz = 8000 >> index)
  const batRaw    = await sendCmd([0xa7, 0x31]); // バッテリー: byte[2]=%, byte[3]=充電中

  const pollIndex = pollRaw[6];

  // combos: index 0〜29 を反復取得（cols==0 か 500ms 無応答で打ち切り）。
  function readCombo(index) {
    return new Promise((resolve) => {
      const buf = new Uint8Array(32).fill(0); buf[0] = 0xa7; buf[1] = 0x28; buf[2] = index;
      const h = (e) => { const r = new Uint8Array(e.data.buffer);
        if (r[0] === 0xa7 && r[1] === 0x28) { dev.removeEventListener('inputreport', h); resolve(r); } };
      dev.addEventListener('inputreport', h);
      setTimeout(() => { dev.removeEventListener('inputreport', h); resolve(null); }, 500);
      dev.sendReport(0, buf).catch(() => resolve(null));
    });
  }
  const combos = [];
  for (let i = 0; i < 30; i++) {
    const r = await readCombo(i);
    if (!r || r[6] === 0) break; // 無応答 or cols==0（未登録）→ 以降なし
    combos.push({ index: r[2], timeout: r[3] | (r[4] << 8), layer: r[5], cols: r[6],
      tap: r[7] | (r[8] << 8), held: r[9] | (r[10] << 8) });
  }

  // tap-hold: (layer, col) グリッドを走査し、非ゼロのみ保存。
  const tapholds = [];
  for (let layer = 0; layer < layerCount; layer++) {
    for (let col = 0; col < 6; col++) {
      const r = await sendCmd([0xa7, 0x26, layer, 0, col]);
      const tap = r[5] | (r[6] << 8), held = r[7] | (r[8] << 8);
      if (tap !== 0 || held !== 0) tapholds.push({ layer, col, tap, held });
    }
  }

  // gesture: 1フレームで4方向（up/down/left/right の VIA キーコード）。
  const gRaw = await sendCmd([0xa7, 0x2a]);
  const gesture = { up: gRaw[2] | (gRaw[3] << 8), down: gRaw[4] | (gRaw[5] << 8),
    left: gRaw[6] | (gRaw[7] << 8), right: gRaw[8] | (gRaw[9] << 8) };

  const exportData = {
    version: '1.3',
    device: 'Keychron Nape Pro',
    exportDate: new Date().toISOString(),
    firmware,
    launcherVersion,
    layerCount,
    keymap,
    encoders,
    dpi: { currentLevel: dpiCurrentLevel, levels: dpiLevels },
    // 回転角出力。値は 0〜7（×45 = 度）。インポートで復元される。
    orientation: { global: globalOri, perLayer: layerOri },
    // 同時押し（最大30件・インデックス反復）。cols はトリガー列のビットマスク。
    combos,
    // タップ&ホールド（(layer,col) アドレス、非ゼロのみ）。
    tapholds,
    // ボールジェスチャ（4方向のキーコード）。
    gesture,
    // ※ profile (0x2c) は Launcher v1.3.8 で未実装のため対象外。
    // デバイス設定（インポートで復元される）。
    deviceSettings: {
      alwaysGesture: alwaysRaw[2],   // 0/1
      alwaysScroll:  alwaysRaw[3],   // 0/1
      sleepBacklightSec:  u16le(sleepRaw, 3),
      sleepSec:           u16le(sleepRaw, 5),
      sleepMagnetScanSec: u16le(sleepRaw, 7),
      pollingIndex: pollIndex,       // SET はこの index を送る
      pollingRateHz: pollIndex != null ? (8000 >> pollIndex) : null
    },
    // 参考情報（インポート対象外）。
    battery: { percent: batRaw[2], charging: batRaw[3] === 1 }
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nape-pro-settings-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log(`Firmware: ${firmware} / Launcher: ${launcherVersion || '不明'}`);
  console.log('エクスポート完了!', exportData);
  return exportData;
})();

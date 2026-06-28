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

  // 参考情報（読み取りのみ。インポートでは復元しない）。
  const u16le = (a, i) => (a[i + 1] << 8) | a[i];
  const alwaysRaw = await sendCmd([0xa7, 0x33]); // 常時ジェスチャー/スクロール
  const sleepRaw  = await sendCmd([0xa7, 0x0b]); // スリープタイマー(秒, LE u16×2)
  const pollRaw   = await sendCmd([0xa7, 0x0d]); // ポーリングレート(Hz, LE u16×2)
  const batRaw    = await sendCmd([0xa7, 0x31]); // バッテリー

  const exportData = {
    version: '1.1',
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
    rawSettings: {
      combos:   Array.from(await sendCmd([0xa7, 0x28])),
      gesture:  Array.from(await sendCmd([0xa7, 0x2a])),
      tapholds: Array.from(await sendCmd([0xa7, 0x26])),
      profile:  Array.from(await sendCmd([0xa7, 0x2c]))
    },
    // 参考情報（インポート非対応）。SET コマンド未確定のため復元しない。
    deviceInfo: {
      alwaysGesture: !!(alwaysRaw[2] & 0x01),
      alwaysScroll:  !!(alwaysRaw[2] & 0x02),
      sleepTimerSec: [u16le(sleepRaw, 3), u16le(sleepRaw, 5)],
      pollingRateHz: [u16le(pollRaw, 3), u16le(pollRaw, 5)],
      batteryPercent: batRaw[2],
      charging: batRaw[3] === 1
    }
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

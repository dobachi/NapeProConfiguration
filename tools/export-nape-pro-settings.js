/*
 * Keychron Nape Pro 設定エクスポートスクリプト
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

  const fwResp = await sendCmd([0xa1]);
  const firmware = fwResp.slice(1).filter(b => b > 0).map(b => String.fromCharCode(b)).join('');
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

  const exportData = {
    version: '1.0',
    device: 'Keychron Nape Pro',
    exportDate: new Date().toISOString(),
    firmware,
    layerCount,
    keymap,
    encoders,
    dpi: { currentLevel: dpiCurrentLevel, levels: dpiLevels },
    rawSettings: {
      combos:   Array.from(await sendCmd([0xa7, 0x28])),
      gesture:  Array.from(await sendCmd([0xa7, 0x2a])),
      tapholds: Array.from(await sendCmd([0xa7, 0x26])),
      profile:  Array.from(await sendCmd([0xa7, 0x2c]))
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

  console.log('エクスポート完了!', exportData);
  return exportData;
})();

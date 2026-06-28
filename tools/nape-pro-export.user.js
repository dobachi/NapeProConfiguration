// ==UserScript==
// @name         Nape Pro Settings Export/Import
// @namespace    https://github.com/dobachi/NapeProConfiguration
// @version      1.0.0
// @description  Keychron Launcher に Nape Pro 設定のエクスポート/インポートボタンを追加する
// @match        https://launcher.keychron.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
//
// ⚠️ 非公式ツール。利用は自己責任で（詳細は ./README.md の免責事項）。
//
// Tampermonkey / Violentmonkey 等にこのファイルを登録すると、Launcher を開くたびに
// 画面右下に「⬇ Export」「⬆ Import」ボタンが表示される。クリックするだけで実行できる。
//
// ロジックは export-nape-pro-settings.js / import-nape-pro-settings.js と同一。
(function () {
  'use strict';

  async function findDevice() {
    const devices = await navigator.hid.getDevices();
    return devices.find(d =>
      d.productId === 1088 &&
      d.opened &&
      d.collections.some(c => c.usagePage === 0xFF60)
    );
  }

  // Keychron Launcher のバージョンをページから best-effort で取得（HIDでは取れない）。
  function getLauncherVersion() {
    try {
      const text = (document.body && document.body.innerText) || '';
      const m = text.match(/Launcher\s*V?\s*(\d+\.\d+\.\d+)/i) || text.match(/\bV(\d+\.\d+\.\d+)\b/);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  function makeSendCmd(dev) {
    return function sendCmd(bytes) {
      const buf = new Uint8Array(32).fill(0);
      bytes.forEach((b, i) => buf[i] = b);
      return new Promise((resolve, reject) => {
        const h = (e) => { dev.removeEventListener('inputreport', h); resolve(new Uint8Array(e.data.buffer)); };
        dev.addEventListener('inputreport', h);
        setTimeout(() => { dev.removeEventListener('inputreport', h); reject(new Error('timeout')); }, 3000);
        dev.sendReport(0, buf).catch(reject);
      });
    };
  }

  async function exportSettings() {
    const dev = await findDevice();
    if (!dev) { alert('Nape Pro が見つかりません。Launcherで接続してください。'); return; }
    const sendCmd = makeSendCmd(dev);

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
      const val = r[3] * 256 + r[2];
      if (val > 0) dpiLevels.push({ level: i, dpi: val });
    }

    // 回転角出力 (値 ×45 = 度)。GET_ORI=0x20(全体), GET_LAYER_ORI=0x38+layer。
    const globalOri = (await sendCmd([0xa7, 0x20]))[2];
    const layerOri = [];
    for (let layer = 0; layer < layerCount; layer++) {
      layerOri.push((await sendCmd([0xa7, 0x38, layer]))[2]);
    }
    // デバイス設定（インポートで復元される）
    const u16le = (a, i) => (a[i + 1] << 8) | a[i];
    const alwaysRaw = await sendCmd([0xa7, 0x33]);
    const sleepRaw  = await sendCmd([0xa7, 0x0b]);
    const pollRaw   = await sendCmd([0xa7, 0x0d]);
    const batRaw    = await sendCmd([0xa7, 0x31]);
    const pollIndex = pollRaw[6];

    const exportData = {
      version: '1.2',
      device: 'Keychron Nape Pro',
      exportDate: new Date().toISOString(),
      firmware,
      launcherVersion,
      layerCount,
      keymap,
      encoders,
      dpi: { currentLevel: dpiCurrentLevel, levels: dpiLevels },
      orientation: { global: globalOri, perLayer: layerOri },
      rawSettings: {
        combos:   Array.from(await sendCmd([0xa7, 0x28])),
        gesture:  Array.from(await sendCmd([0xa7, 0x2a])),
        tapholds: Array.from(await sendCmd([0xa7, 0x26])),
        profile:  Array.from(await sendCmd([0xa7, 0x2c]))
      },
      deviceSettings: {
        alwaysGesture: alwaysRaw[2],
        alwaysScroll:  alwaysRaw[3],
        sleepBacklightSec:  u16le(sleepRaw, 3),
        sleepSec:           u16le(sleepRaw, 5),
        sleepMagnetScanSec: u16le(sleepRaw, 7),
        pollingIndex: pollIndex,
        pollingRateHz: pollIndex != null ? (8000 >> pollIndex) : null
      },
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
    console.log('エクスポート完了!', exportData);
  }

  async function importSettings() {
    const file = await new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => input.files[0] ? resolve(input.files[0]) : reject('cancelled');
      input.click();
    });
    const data = JSON.parse(await file.text());
    if (data.device !== 'Keychron Nape Pro' || !data.keymap) { alert('このファイルはNape Pro用ではありません'); return; }

    const dev = await findDevice();
    if (!dev) { alert('Nape Pro が見つかりません。Launcherで接続してください。'); return; }
    const sendCmd = makeSendCmd(dev);

    // バージョン照合 (書き込み前)
    const curFwResp = await sendCmd([0xa1]);
    const curFirmware = curFwResp.slice(1).filter(b => b > 0).map(b => String.fromCharCode(b)).join('');
    const curLauncher = getLauncherVersion();
    const mismatches = [];
    if (data.firmware && curFirmware && data.firmware !== curFirmware) {
      mismatches.push(`ファームウェア: ファイル=${data.firmware} / 現在=${curFirmware}`);
    }
    if (data.launcherVersion && curLauncher && data.launcherVersion !== curLauncher) {
      mismatches.push(`Launcher: ファイル=${data.launcherVersion} / 現在=${curLauncher}`);
    }
    if (mismatches.length && !confirm(
      'バージョンが一致しません。コマンド構成が異なる可能性があります。\n\n' +
      mismatches.join('\n') + '\n\nそれでも書き込みを続行しますか？'
    )) { console.log('インポートを中止しました。'); return; }

    for (let layer = 0; layer < data.keymap.length; layer++) {
      for (let col = 0; col < data.keymap[layer].length; col++) {
        const kc = data.keymap[layer][col];
        await sendCmd([0x05, layer, 0, col, (kc >> 8) & 0xFF, kc & 0xFF]);
      }
    }
    if (data.encoders) {
      for (let layer = 0; layer < data.encoders.length; layer++) {
        const { ccw, cw } = data.encoders[layer];
        await sendCmd([0x15, layer, 0, 0, (ccw >> 8) & 0xFF, ccw & 0xFF]);
        await sendCmd([0x15, layer, 0, 1, (cw  >> 8) & 0xFF, cw  & 0xFF]);
      }
    }
    if (data.dpi) {
      for (const { level, dpi } of data.dpi.levels) {
        await sendCmd([0xa7, 0x23, level, dpi & 0xFF, (dpi >> 8) & 0xFF]);
      }
      await sendCmd([0xa7, 0x22, data.dpi.currentLevel]);
    }
    if (data.rawSettings) {
      const setMap = { 0x28: 0x27, 0x2a: 0x29, 0x26: 0x25, 0x2c: 0x2b };
      for (const [, raw] of Object.entries(data.rawSettings)) {
        if (!raw || raw.length < 2) continue;
        const setCmd = setMap[raw[1]];
        if (!setCmd) continue;
        await sendCmd([0xa7, setCmd, ...raw.slice(2)]);
      }
    }
    // 回転角出力 (SET_ORI=0x34, SET_LAYER_ORI=0x39)。値 0〜7。
    if (data.orientation) {
      if (typeof data.orientation.global === 'number') {
        await sendCmd([0xa7, 0x34, data.orientation.global]);
      }
      const per = data.orientation.perLayer;
      if (Array.isArray(per)) {
        for (let layer = 0; layer < per.length; layer++) {
          await sendCmd([0xa7, 0x39, layer, per[layer]]);
        }
        const bad = [];
        for (let layer = 0; layer < per.length; layer++) {
          const got = (await sendCmd([0xa7, 0x38, layer]))[2];
          if (got !== per[layer]) bad.push(`Layer${layer}:${per[layer]}→${got}`);
        }
        if (bad.length) console.warn('回転角の読み戻し不一致:', bad);
      }
    }
    // デバイス設定 (常時モード SET=0x32 / スリープ SET=0x0c / ポーリング SET=0x0e)
    const ds = data.deviceSettings;
    if (ds) {
      if (ds.alwaysGesture != null || ds.alwaysScroll != null) {
        await sendCmd([0xa7, 0x32, ds.alwaysGesture || 0, ds.alwaysScroll || 0]);
      }
      if (ds.sleepSec != null) {
        const u16 = (v) => [v & 0xff, (v >> 8) & 0xff];
        await sendCmd([0xa7, 0x0c, ...u16(ds.sleepBacklightSec || 0), ...u16(ds.sleepSec || 0), ...u16(ds.sleepMagnetScanSec || 0)]);
      }
      if (ds.pollingIndex != null) {
        await sendCmd([0xa7, 0x0e, ds.pollingIndex, ds.pollingIndex]);
      }
    }
    alert('インポート完了！\nファイル: ' + file.name);
  }

  function addButtons() {
    if (document.getElementById('nape-pro-export-ui')) return;
    const box = document.createElement('div');
    box.id = 'nape-pro-export-ui';
    box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;display:flex;gap:8px;font-family:sans-serif';

    const mkBtn = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'padding:8px 12px;border:none;border-radius:8px;background:#222;color:#fff;cursor:pointer;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.3)';
      b.onclick = async () => {
        b.disabled = true; const orig = b.textContent; b.textContent = '...';
        try { await fn(); } catch (e) { console.error(e); alert('失敗: ' + (e && e.message || e)); }
        finally { b.disabled = false; b.textContent = orig; }
      };
      return b;
    };

    box.appendChild(mkBtn('⬇ Export', exportSettings));
    box.appendChild(mkBtn('⬆ Import', importSettings));
    document.body.appendChild(box);
  }

  addButtons();
  // SPA 遷移で消えても復活させる
  new MutationObserver(addButtons).observe(document.body, { childList: true, subtree: false });
})();

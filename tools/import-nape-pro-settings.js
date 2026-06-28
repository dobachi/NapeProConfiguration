/*
 * Keychron Nape Pro 設定インポートスクリプト
 *
 * ⚠️ 非公式ツール。設定書き込みに伴う破損等は自己責任で（詳細は ./README.md の免責事項）。
 *
 * Keychron Launcher を開き Nape Pro を接続した状態で、ブラウザの DevTools コンソールに
 * このファイルの内容を貼り付けて実行する。ファイル選択ダイアログでエクスポート済み JSON を
 * 選ぶとデバイスへ書き込む。
 *
 * 書き込み内容: キーマップ / エンコーダー / DPI / combos・gesture・tapholds・profile
 *
 * 注意:
 *   - LauncherにNape Proが接続された状態で実行すること
 *   - 書き込み中はデバイスを抜かないこと
 *   - 書き込み後はLauncherの画面をリロード/タブ切替で反映を確認
 *
 * 詳細は ../docs/keychron-launcher-investigation.md と ./README.md を参照。
 */
(async function importNapeProSettings() {
  // ---- ファイル選択 ----
  const file = await new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => input.files[0] ? resolve(input.files[0]) : reject('cancelled');
    input.click();
  });

  const json = await file.text();
  const data = JSON.parse(json);

  if (data.device !== 'Keychron Nape Pro' || !data.keymap) {
    alert('このファイルはNape Pro用ではありません');
    return;
  }

  // ---- デバイス取得 ----
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
      const h = (e) => {
        const r = new Uint8Array(e.data.buffer);
        // 応答をコマンドのエコーで照合（Launcher のバックグラウンド通信を無視）
        if (r[0] !== buf[0]) return;
        if (buf[0] === 0xa7 && r[1] !== buf[1]) return;
        dev.removeEventListener('inputreport', h); resolve(r);
      };
      dev.addEventListener('inputreport', h);
      setTimeout(() => { dev.removeEventListener('inputreport', h); reject(new Error('timeout')); }, 3000);
      dev.sendReport(0, buf).catch(reject);
    });
  }

  // ---- 0. バージョン照合 (書き込み前) ----
  function getLauncherVersion() {
    try {
      const text = (document.body && document.body.innerText) || '';
      const m = text.match(/Launcher\s*V?\s*(\d+\.\d+\.\d+)/i) || text.match(/\bV(\d+\.\d+\.\d+)\b/);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }
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
  if (mismatches.length) {
    const ok = confirm(
      'バージョンが一致しません。コマンド構成が異なる可能性があります。\n\n' +
      mismatches.join('\n') +
      '\n\nそれでも書き込みを続行しますか？'
    );
    if (!ok) { console.log('インポートを中止しました。'); return; }
  }

  // ---- 1. キーマップ書き込み ----
  console.log('キーマップを書き込み中...');
  for (let layer = 0; layer < data.keymap.length; layer++) {
    for (let col = 0; col < data.keymap[layer].length; col++) {
      const kc = data.keymap[layer][col];
      await sendCmd([0x05, layer, 0, col, (kc >> 8) & 0xFF, kc & 0xFF]);
    }
    console.log(`  Layer ${layer} 完了`);
  }

  // ---- 2. エンコーダー書き込み ----
  if (data.encoders) {
    console.log('エンコーダーを書き込み中...');
    for (let layer = 0; layer < data.encoders.length; layer++) {
      const { ccw, cw } = data.encoders[layer];
      await sendCmd([0x15, layer, 0, 0, (ccw >> 8) & 0xFF, ccw & 0xFF]); // CCW
      await sendCmd([0x15, layer, 0, 1, (cw  >> 8) & 0xFF, cw  & 0xFF]); // CW
    }
    console.log('  エンコーダー完了');
  }

  // ---- 3. DPI書き込み ----
  if (data.dpi) {
    console.log('DPI設定を書き込み中...');
    for (const { level, dpi } of data.dpi.levels) {
      const lo = dpi & 0xFF, hi = (dpi >> 8) & 0xFF; // little-endian
      await sendCmd([0xa7, 0x23, level, lo, hi]);     // SET_DPI_VALUE
    }
    await sendCmd([0xa7, 0x22, data.dpi.currentLevel]); // SET_DPI (選択レベル)
    console.log('  DPI完了');
  }

  // ---- 4a. combos 書き込み (index 0〜29) ----
  // SET_COMBOS=0x27, GET=0x28, DEL=0x2e。
  // 方式: 既存を全削除 → 先頭から順に SET（各 SET が末尾＝index==現在件数 に当たり、確実に追加される）。
  if (Array.isArray(data.combos)) {
    console.log('combos を書き込み中...');
    const readCombo = (index) => new Promise((resolve) => {
      const buf = new Uint8Array(32).fill(0); buf[0] = 0xa7; buf[1] = 0x28; buf[2] = index;
      const h = (e) => { const r = new Uint8Array(e.data.buffer);
        if (r[0] === 0xa7 && r[1] === 0x28) { dev.removeEventListener('inputreport', h); resolve(r); } };
      dev.addEventListener('inputreport', h);
      setTimeout(() => { dev.removeEventListener('inputreport', h); resolve(null); }, 500);
      dev.sendReport(0, buf).catch(() => resolve(null));
    });
    // 既存件数を数えて降順に全削除
    let nOld = 0;
    for (let i = 0; i < 30; i++) { const r = await readCombo(i); if (!r || r[6] === 0) break; nOld++; }
    for (let i = nOld - 1; i >= 0; i--) await sendCmd([0xa7, 0x2e, i]);
    // 0..N-1 を順に追加
    for (let i = 0; i < data.combos.length && i < 30; i++) {
      const c = data.combos[i];
      const to = c.timeout != null ? c.timeout : 200;
      await sendCmd([0xa7, 0x27, i, to & 0xff, (to >> 8) & 0xff, c.layer, c.cols,
        c.tap & 0xff, (c.tap >> 8) & 0xff, c.held & 0xff, (c.held >> 8) & 0xff]);
    }
    // 読み戻し検証
    const after = [];
    for (let i = 0; i < 30; i++) { const r = await readCombo(i); if (!r || r[6] === 0) break; after.push(r); }
    const bad = [];
    for (let i = 0; i < data.combos.length; i++) {
      const r = after[i], c = data.combos[i];
      if (!r) { bad.push(`#${i} 未作成`); continue; }
      if (r[6] !== c.cols || (r[7] | (r[8] << 8)) !== c.tap || (r[9] | (r[10] << 8)) !== c.held) bad.push(`#${i} 不一致`);
    }
    if (bad.length) console.warn(`  ⚠️ combos 読み戻し不一致（${after.length}/${data.combos.length}件）:`, bad);
    else console.log(`  combos 完了・検証OK（${after.length}件）`);
  }

  // ---- 4b. tap-hold 書き込み ((layer,col) アドレス) ----
  // SET_TAPHOLDS=0x25, DEL=0x2f。ファイルにある座標は SET、無い座標は DEL でクリア。
  if (Array.isArray(data.tapholds)) {
    console.log('tap-hold を書き込み中...');
    const map = new Map(data.tapholds.map((t) => [t.layer + ',' + t.col, t]));
    const layers = data.layerCount || 9;
    for (let layer = 0; layer < layers; layer++) {
      for (let col = 0; col < 6; col++) {
        const t = map.get(layer + ',' + col);
        // 現在値を読み、変更が必要なときだけ書く（無駄打ち削減）。
        const cur = await sendCmd([0xa7, 0x26, layer, 0, col]);
        const curTap = cur[5] | (cur[6] << 8), curHeld = cur[7] | (cur[8] << 8);
        if (t && (t.tap || t.held)) {
          if (t.tap !== curTap || t.held !== curHeld) {
            await sendCmd([0xa7, 0x25, layer, 0, col, t.tap & 0xff, (t.tap >> 8) & 0xff, t.held & 0xff, (t.held >> 8) & 0xff]);
          }
        } else if (curTap || curHeld) {
          await sendCmd([0xa7, 0x2f, layer, 0, col]); // クリア
        }
      }
    }
    console.log(`  tap-hold 完了（${data.tapholds.length}件）`);
  }

  // ---- 4c. gesture 書き込み (1フレーム4方向) ----
  if (data.gesture) {
    const g = data.gesture;
    await sendCmd([0xa7, 0x29, g.up & 0xff, (g.up >> 8) & 0xff, g.down & 0xff, (g.down >> 8) & 0xff,
      g.left & 0xff, (g.left >> 8) & 0xff, g.right & 0xff, (g.right >> 8) & 0xff]);
    console.log('  gesture 完了');
  }

  // ---- 4d. 旧形式 (v1.2 以前の rawSettings) フォールバック ----
  if (data.rawSettings && !data.combos) {
    const setMap = { 0x28: 0x27, 0x2a: 0x29, 0x26: 0x25 };
    for (const raw of Object.values(data.rawSettings)) {
      if (!raw || raw.length < 2) continue;
      const setCmd = setMap[raw[1]];
      if (!setCmd) continue;
      await sendCmd([0xa7, setCmd, ...raw.slice(2)]);
    }
    console.log('  旧形式 rawSettings を書き戻し（1フレームのみ）');
  }

  // ---- 5. 回転角出力 (orientation) 書き込み ----
  // 値は 0〜7（×45 = 度）。SET_ORI=0x34(全体), SET_LAYER_ORI=0x39+layer。
  if (data.orientation) {
    console.log('回転角を書き込み中...');
    if (typeof data.orientation.global === 'number') {
      await sendCmd([0xa7, 0x34, data.orientation.global]); // SET_ORI
    }
    const per = data.orientation.perLayer;
    if (Array.isArray(per)) {
      for (let layer = 0; layer < per.length; layer++) {
        await sendCmd([0xa7, 0x39, layer, per[layer]]); // SET_LAYER_ORI
      }
      // 読み戻し検証
      const bad = [];
      for (let layer = 0; layer < per.length; layer++) {
        const got = (await sendCmd([0xa7, 0x38, layer]))[2];
        if (got !== per[layer]) bad.push(`Layer${layer}: 期待=${per[layer]} 実際=${got}`);
      }
      if (bad.length) console.warn('  ⚠️ 回転角の読み戻し不一致:', bad);
      else console.log('  回転角 完了（検証OK）');
    }
  }

  // ---- 6. デバイス設定 (常時モード / スリープ / ポーリング) 書き込み ----
  // SET コマンドはソース解析で確定（保存コマンドは不要・送らない）。
  const ds = data.deviceSettings;
  if (ds) {
    console.log('デバイス設定を書き込み中...');
    // 常時モード: SET_Force_Gesture_Scroll = 0x32。byte[2]=gesture, byte[3]=scroll (各0/1)
    if (ds.alwaysGesture != null || ds.alwaysScroll != null) {
      await sendCmd([0xa7, 0x32, ds.alwaysGesture || 0, ds.alwaysScroll || 0]);
    }
    // スリープ: Set_Sleep = 0x0c。[backlight, sleep, magnetScan] 各 LE u16 (秒)
    if (ds.sleepSec != null) {
      const u16 = (v) => [v & 0xff, (v >> 8) & 0xff];
      await sendCmd([0xa7, 0x0c,
        ...u16(ds.sleepBacklightSec || 0),
        ...u16(ds.sleepSec || 0),
        ...u16(ds.sleepMagnetScanSec || 0)]);
    }
    // ポーリング: SET = 0x0e。byte[2]=byte[3]=index (Hz = 8000 >> index)
    if (ds.pollingIndex != null) {
      await sendCmd([0xa7, 0x0e, ds.pollingIndex, ds.pollingIndex]);
    }
    console.log('  デバイス設定 完了');
  }

  console.log('✅ インポート完了！ Launcherの画面を確認してください。');
  alert('インポート完了！\nファイル: ' + file.name + '\nデバイスに設定が書き込まれました。');
})();

/*
 * Keychron Nape Pro 設定インポートスクリプト
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
      const h = (e) => { dev.removeEventListener('inputreport', h); resolve(new Uint8Array(e.data.buffer)); };
      dev.addEventListener('inputreport', h);
      setTimeout(() => { dev.removeEventListener('inputreport', h); reject(new Error('timeout')); }, 3000);
      dev.sendReport(0, buf).catch(reject);
    });
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

  // ---- 4. rawSettings 書き込み (combos/gesture/tapholds/profile) ----
  if (data.rawSettings) {
    // GET→SET コマンドマッピング
    const setMap = { 0x28: 0x27, 0x2a: 0x29, 0x26: 0x25, 0x2c: 0x2b };
    for (const [key, raw] of Object.entries(data.rawSettings)) {
      if (!raw || raw.length < 2) continue;
      const getCmd = raw[1];
      const setCmd = setMap[getCmd];
      if (!setCmd) continue;
      // データ部 (先頭2バイトを除く) をSETコマンドで送信
      await sendCmd([0xa7, setCmd, ...raw.slice(2)]);
      console.log(`  ${key} 完了`);
    }
  }

  console.log('✅ インポート完了！ Launcherの画面を確認してください。');
  alert('インポート完了！\nファイル: ' + file.name + '\nデバイスに設定が書き込まれました。');
})();

/**
 * Slaycure 試算表後端
 * 貼到試算表的「擴充功能 → Apps Script」，再部署成網頁應用程式。
 * 所有資料都放在同一個工作表「Slaycure 玩家資料」，一位玩家一列。
 * 試算表本身不用分享給別人，程式會用你的身分讀寫。
 *
 * 欄位是用「標題文字」找的，所以你可以在試算表裡拖曳調整欄位順序，
 * 只要不改標題文字就好。
 */
const SHEET_NAME = 'Slaycure 玩家資料';
const MAX_WORKS = 8;
const N = i => '作品' + (i + 1);

// 左邊：一眼看得懂的欄位
const SHOWN = ['暱稱', '累計收入', '服務人數', '收到的讚數', '最後更新', '不公開']
  .concat(...Array.from({ length: MAX_WORKS }, (_, i) => [N(i) + '名稱', N(i) + '標籤']));
// 右邊：程式用的欄位，預設隱藏
const HIDDEN = ['玩家代號', '按讚的作品', '密碼雜湊（請勿修改）', '作品代號']
  .concat(Array.from({ length: MAX_WORKS }, (_, i) => N(i) + '圖片'));
const HEAD = SHOWN.concat(HIDDEN);

/* ---------- 讀取：排行榜、作品牆、按讚 ---------- */
function doGet(e) {
  e = e || { parameter: {} };   // 在編輯器直接按「執行」時沒有網址參數
  const a = e.parameter.action || 'top';
  const t = table_();
  const rows = t.rows.map(t.obj);
  const open = rows.filter(p => !p['不公開']);

  if (a === 'top') {
    const f = e.parameter.field === 'served' ? 'served' : 'earned';
    const list = open
      .map(p => ({ id: String(p['玩家代號']), name: String(p['暱稱']), earned: Number(p['累計收入']) || 0, served: Number(p['服務人數']) || 0 }))
      .sort((x, y) => y[f] - x[f])
      .slice(0, 20);
    return out_(list);
  }
  if (a === 'gallery') {
    const list = open.map(p => ({ id: String(p['玩家代號']), name: String(p['暱稱']), items: works_(p) }))
      .filter(p => p.items.length);
    return out_(list);
  }
  if (a === 'likes') {
    return out_(rows.map(p => ({ id: String(p['玩家代號']), ids: parseArr_(p['按讚的作品']) })));
  }
  return out_({ error: 'unknown action' });
}

/* ---------- 寫入：每位玩家只能改自己那一列 ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const b = JSON.parse(e.postData.contents);
    const id = String(b.id || ''), token = String(b.token || '');
    if (!id || id.length > 40 || token.length < 16) return out_({ error: 'token' });

    const t = table_();
    const hash = hash_(token);
    let r = t.rows.findIndex(row => String(row[t.col['玩家代號']]) === id);
    let p;
    if (r === -1) {
      p = { '玩家代號': id, '累計收入': 0, '服務人數': 0, '收到的讚數': 0, '按讚的作品': '[]', '不公開': false, '密碼雜湊（請勿修改）': hash };
    } else {
      p = t.obj(t.rows[r]);
      if (p['密碼雜湊（請勿修改）'] && p['密碼雜湊（請勿修改）'] !== hash) return out_({ error: 'token' });
      p['密碼雜湊（請勿修改）'] = hash;
    }
    p['暱稱'] = safe_(String(b.name || '匿名玩家').slice(0, 20));
    p['最後更新'] = new Date();

    if (b.action === 'setPlayer') {
      p['累計收入'] = num_(b.earned);
      p['服務人數'] = num_(b.served);
    } else if (b.action === 'setGallery') {
      const ok = (b.items || []).filter(d => {
        const img = String(d.img || '');
        return img.length <= 45000 && /^data:image\/(webp|jpeg|png);base64,/.test(img);
      }).slice(0, MAX_WORKS);
      const codes = [];
      for (let i = 0; i < MAX_WORKS; i++) {
        const d = ok[i];
        p[N(i) + '名稱'] = d ? safe_(String(d.name || '').slice(0, 20)) : '';
        p[N(i) + '標籤'] = d ? safe_(String(d.tags || '').slice(0, 60)) : '';
        p[N(i) + '圖片'] = d ? String(d.img) : '';
        if (d) codes.push({ id: String(d.id).slice(0, 30), at: Math.max(0, Math.floor(Number(d.at) || 0)) });
      }
      p['作品代號'] = JSON.stringify(codes);
    } else if (b.action === 'setLikes') {
      p['按讚的作品'] = JSON.stringify((b.ids || []).slice(-300).map(x => String(x).slice(0, 80)));
    } else {
      return out_({ error: 'unknown action' });
    }

    const row = t.toRow(p, r === -1 ? null : t.rows[r]);
    if (r === -1) {
      const at = t.sheet.getLastRow() + 1;
      t.sheet.getRange(at, 1, 1, row.length).setValues([row]);
      t.sheet.getRange(at, t.col['不公開'] + 1).insertCheckboxes();
      t.rows.push(row); t.rowNo.push(at);
    } else {
      t.sheet.getRange(t.rowNo[r], 1, 1, row.length).setValues([row]);
      t.rows[r] = row;
    }
    if (b.action === 'setLikes' || b.action === 'setGallery') recountLikes_(t);
    return out_({ ok: true });
  } catch (err) {
    return out_({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- 工作表 ---------- */
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SHEET_NAME);
  if (!s) {
    s = ss.insertSheet(SHEET_NAME, 0);
    s.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#f6e3ea');
    s.setFrozenRows(1);
    s.setFrozenColumns(1);
    s.getRange(2, HEAD.indexOf('最後更新') + 1, 999, 1).setNumberFormat('yyyy/mm/dd hh:mm');
    s.getRange(1, SHOWN.length + 1, 1000, HIDDEN.length).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    s.hideColumns(SHOWN.length + 1, HIDDEN.length);
  }
  return s;
}

// 讀整張表，依標題文字對應欄位；少了哪個標題就自動補在最右邊
function table_() {
  const s = sheet_();
  const v = s.getDataRange().getValues();
  const head = v[0].map(String);
  HEAD.forEach(h => {
    if (head.indexOf(h) === -1) { head.push(h); s.getRange(1, head.length).setValue(h).setFontWeight('bold'); }
  });
  const col = {};
  head.forEach((h, i) => { if (h) col[h] = i; });
  const rows = [], rowNo = [];
  v.slice(1).forEach((row, i) => {
    if (!row[col['玩家代號']]) return;
    row = row.slice(); while (row.length < head.length) row.push('');
    rows.push(row); rowNo.push(i + 2);
  });
  return {
    sheet: s, col, rows, rowNo,
    obj: row => { const o = {}; head.forEach((h, i) => { if (h) o[h] = row[i]; }); return o; },
    toRow: (o, old) => head.map((h, i) => (h in o ? o[h] : (old ? old[i] : ''))),
  };
}

// 依大家的「按讚的作品」重新算每個人「收到的讚數」
function recountLikes_(t) {
  const n = {};
  t.rows.forEach(row => parseArr_(row[t.col['按讚的作品']]).forEach(k => {
    const who = String(k).split(':')[0]; n[who] = (n[who] || 0) + 1;
  }));
  if (!t.rows.length) return;
  const c = t.col['收到的讚數'] + 1;
  t.rows.forEach((row, i) => {
    const want = n[String(row[t.col['玩家代號']])] || 0;
    if (Number(row[c - 1]) !== want) { t.sheet.getRange(t.rowNo[i], c).setValue(want); row[c - 1] = want; }
  });
}

function works_(p) {
  const codes = parseArr_(p['作品代號']);
  const list = [];
  for (let i = 0; i < MAX_WORKS; i++) {
    const img = String(p[N(i) + '圖片'] || '');
    if (!img) continue;
    const c = codes[i] || {};
    list.push({ id: String(c.id || 'w' + i), at: Number(c.at) || 0, name: String(p[N(i) + '名稱'] || ''), tags: String(p[N(i) + '標籤'] || ''), img });
  }
  return list;
}

/* ---------- 小工具 ---------- */
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function hash_(t) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t));
}
function parseArr_(s) { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function num_(v) { v = Number(v); return isFinite(v) && v >= 0 && v < 1e8 ? Math.floor(v) : 0; }
// 開頭是 = + - @ 的文字會被試算表當成公式，前面加 ' 讓它保持純文字
function safe_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }

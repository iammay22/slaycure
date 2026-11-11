/**
 * Slaycure 試算表後端
 * 貼到試算表的「擴充功能 → Apps Script」，再部署成網頁應用程式。
 * 所有資料都放在同一個工作表「Slaycure 玩家資料」，一位玩家一列。
 * 試算表本身不用分享給別人，程式會用你的身分讀寫。
 */
const SHEET_NAME = 'Slaycure 玩家資料';
const MAX_WORKS = 8;
const HEAD = ['玩家代號', '暱稱', '累計收入', '服務人數', '最後更新', '按讚的作品', '密碼雜湊（請勿修改）']
  .concat(Array.from({ length: MAX_WORKS }, (_, i) => '作品' + (i + 1)));
const COL = { id: 0, name: 1, earned: 2, served: 3, at: 4, likes: 5, hash: 6, work: 7 };

/* ---------- 讀取：排行榜、作品牆、按讚 ---------- */
function doGet(e) {
  const a = (e.parameter || {}).action;
  const rows = players_();
  if (a === 'top') {
    const f = e.parameter.field === 'served' ? 'served' : 'earned';
    const list = rows
      .map(r => ({ id: String(r[COL.id]), name: String(r[COL.name]), earned: Number(r[COL.earned]) || 0, served: Number(r[COL.served]) || 0 }))
      .sort((x, y) => y[f] - x[f])
      .slice(0, 20);
    return out_(list);
  }
  if (a === 'gallery') {
    const list = rows.map(r => ({
      id: String(r[COL.id]),
      name: String(r[COL.name]),
      items: r.slice(COL.work, COL.work + MAX_WORKS).map(parseObj_).filter(Boolean),
    })).filter(p => p.items.length);
    return out_(list);
  }
  if (a === 'likes') {
    return out_(rows.map(r => ({ id: String(r[COL.id]), ids: parseArr_(r[COL.likes]) })));
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
    const s = sheet_();
    const all = s.getDataRange().getValues();
    const hash = hash_(token);
    let r = -1;
    for (let i = 1; i < all.length; i++) if (String(all[i][COL.id]) === id) { r = i; break; }
    let row;
    if (r === -1) {
      row = new Array(HEAD.length).fill('');
      row[COL.id] = id; row[COL.earned] = 0; row[COL.served] = 0; row[COL.likes] = '[]'; row[COL.hash] = hash;
    } else {
      row = all[r].slice();
      if (row[COL.hash] && row[COL.hash] !== hash) return out_({ error: 'token' });
      row[COL.hash] = hash;
    }
    row[COL.name] = safe_(String(b.name || '匿名玩家').slice(0, 20));
    row[COL.at] = new Date();

    if (b.action === 'setPlayer') {
      row[COL.earned] = num_(b.earned);
      row[COL.served] = num_(b.served);
    } else if (b.action === 'setGallery') {
      const works = (b.items || []).slice(0, MAX_WORKS).map(d => {
        const img = String(d.img || '');
        if (img.length > 45000 || !/^data:image\/(webp|jpeg|png);base64,/.test(img)) return '';
        return JSON.stringify({ id: String(d.id).slice(0, 30), name: String(d.name || '').slice(0, 20), tags: String(d.tags || '').slice(0, 60), at: num_(d.at), img: img });
      });
      for (let k = 0; k < MAX_WORKS; k++) row[COL.work + k] = works[k] || '';
    } else if (b.action === 'setLikes') {
      row[COL.likes] = JSON.stringify((b.ids || []).slice(-300).map(x => String(x).slice(0, 80)));
    } else {
      return out_({ error: 'unknown action' });
    }

    if (r === -1) s.appendRow(row);
    else s.getRange(r + 1, 1, 1, HEAD.length).setValues([row]);
    return out_({ ok: true });
  } catch (err) {
    return out_({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- 小工具 ---------- */
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SHEET_NAME);
  if (!s) {
    s = ss.insertSheet(SHEET_NAME, 0);
    s.appendRow(HEAD);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, HEAD.length).setFontWeight('bold');
  }
  return s;
}
function players_() {
  const v = sheet_().getDataRange().getValues();
  v.shift();
  return v.filter(r => r[COL.id]);
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function hash_(t) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t));
}
function parseArr_(s) { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function parseObj_(s) { if (!s) return null; try { const o = JSON.parse(s); return o && o.img ? o : null; } catch (e) { return null; } }
function num_(v) { v = Number(v); return isFinite(v) && v >= 0 && v < 1e8 ? Math.floor(v) : 0; }
// 開頭是 = + - @ 的文字會被試算表當成公式，前面加 ' 讓它保持純文字
function safe_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }

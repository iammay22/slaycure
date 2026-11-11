/**
 * Slaycure 試算表後端
 * 把這段貼到試算表的「擴充功能 → Apps Script」，再部署成網頁應用程式。
 * 會自動建立四個工作表：players（排行榜）、gallery（作品牆）、likes（按讚）、tokens（每位玩家的密碼雜湊）。
 * 試算表本身不用分享給別人，程式會用你的身分讀寫。
 */
const SHEETS = {
  players: ['id', 'name', 'earned', 'served', 'at'],
  gallery: ['owner', 'did', 'name', 'author', 'img', 'tags', 'at'],
  likes: ['id', 'ids'],
  tokens: ['id', 'hash'],
};

function doGet(e) {
  const a = (e.parameter || {}).action;
  if (a === 'top') {
    const f = e.parameter.field === 'served' ? 'served' : 'earned';
    const list = rows_('players')
      .map(r => ({ id: String(r.id), name: String(r.name), earned: Number(r.earned) || 0, served: Number(r.served) || 0 }))
      .sort((x, y) => y[f] - x[f])
      .slice(0, 20);
    return out_(list);
  }
  if (a === 'gallery') {
    const byOwner = {};
    rows_('gallery').forEach(r => {
      const o = String(r.owner);
      if (!byOwner[o]) byOwner[o] = { id: o, name: String(r.author), items: [] };
      byOwner[o].items.push({ id: String(r.did), name: String(r.name), img: String(r.img), tags: String(r.tags), at: Number(r.at) || 0 });
    });
    return out_(Object.keys(byOwner).map(k => byOwner[k]));
  }
  if (a === 'likes') {
    return out_(rows_('likes').map(r => ({ id: String(r.id), ids: parse_(r.ids) })));
  }
  return out_({ error: 'unknown action' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const b = JSON.parse(e.postData.contents);
    if (!checkToken_(b.id, b.token)) return out_({ error: 'token' });
    const name = safe_(String(b.name || '匿名玩家').slice(0, 20));
    if (b.action === 'setPlayer') {
      upsert_('players', b.id, [b.id, name, num_(b.earned), num_(b.served), Date.now()]);
    } else if (b.action === 'setGallery') {
      const s = sheet_('gallery');
      deleteOwner_(s, b.id);
      (b.items || []).slice(0, 8).forEach(d => {
        const img = String(d.img || '');
        if (img.length < 49000 && /^data:image\/(webp|jpeg|png);base64,/.test(img)) {
          s.appendRow([b.id, safe_(String(d.id).slice(0, 30)), safe_(String(d.name || '').slice(0, 20)), name, img, safe_(String(d.tags || '').slice(0, 60)), num_(d.at)]);
        }
      });
    } else if (b.action === 'setLikes') {
      const ids = (b.ids || []).slice(-300).map(x => String(x).slice(0, 80));
      upsert_('likes', b.id, [b.id, JSON.stringify(ids)]);
    } else {
      return out_({ error: 'unknown action' });
    }
    return out_({ ok: true });
  } catch (err) {
    return out_({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- helpers ---------- */
function sheet_(n) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(n);
  if (!s) { s = ss.insertSheet(n); s.appendRow(SHEETS[n]); }
  return s;
}
function rows_(n) {
  const v = sheet_(n).getDataRange().getValues();
  const h = v.shift();
  return v.map(r => { const o = {}; h.forEach((k, i) => (o[k] = r[i])); return o; });
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function parse_(s) { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function num_(v) { v = Number(v); return isFinite(v) && v >= 0 && v < 1e8 ? Math.floor(v) : 0; }
// 開頭是 = + - @ 的文字會被試算表當成公式，前面加 ' 讓它保持純文字
function safe_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }
// 第一次寫入時記下這位玩家的密碼雜湊，之後只有同一組密碼能改他的資料
function checkToken_(id, token) {
  if (!id || !token || String(id).length > 40 || String(token).length < 16) return false;
  const hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token)));
  const s = sheet_('tokens'), v = s.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === String(id)) return v[i][1] === hash;
  s.appendRow([id, hash]);
  return true;
}
function upsert_(n, id, row) {
  const s = sheet_(n), v = s.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][0]) === String(id)) { s.getRange(i + 1, 1, 1, row.length).setValues([row]); return; }
  }
  s.appendRow(row);
}
function deleteOwner_(s, id) {
  const v = s.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][0]) === String(id)) s.deleteRow(i + 1);
}

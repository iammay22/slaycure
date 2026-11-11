// Slaycure 的連線設定。兩個都留空時，遊戲照樣能玩，進度只存在玩家的瀏覽器。

// 用 Google 試算表當資料庫：貼上 Apps Script 網頁應用程式的網址（步驟見 README.md）。
window.SLAY_SHEETS_URL = "";

// 之後想改用 Firebase：把上面的網址清空，再把下面的 null 換成註解裡那段設定。
window.SLAY_FIREBASE = null;
// window.SLAY_FIREBASE = {
//   apiKey: "AIzaSyDoUX4V6LRNBVlKXWDUjQOffF8h499djAo",
//   authDomain: "slaycure.firebaseapp.com",
//   projectId: "slaycure",
//   storageBucket: "slaycure.firebasestorage.app",
//   messagingSenderId: "698874901900",
//   appId: "1:698874901900:web:804d198a831e517b84d2a9",
//   measurementId: "G-7YLJE7SWFG"
// };

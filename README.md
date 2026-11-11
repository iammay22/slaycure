# Slaycure

日系動漫風的美甲沙龍小遊戲。接客、修甲型、刷指甲油、做款式、照燈，賺小費買新顏色和工具。

整個遊戲就是一個 `index.html`，圖片都包在檔案裡，放上 GitHub Pages 就能玩。

## 不設定 Firebase 也能玩

直接打開 `index.html`，或照下面的步驟放上 GitHub Pages 都可以玩。這種模式下，錢包、商店、熟練度和自創款式會存在玩家自己的瀏覽器裡，排行榜和作品牆則會顯示需要登入。

## 開啟排行榜、作品牆和 Google 登入

需要一個免費的 Firebase 專案，大約 10 分鐘可以設定好。

1. 到 [Firebase 主控台](https://console.firebase.google.com/) 建立新專案，Google Analytics 可以不開。
2. 在專案首頁按「</>」新增網頁應用程式，取個名字。完成後會看到一段 `firebaseConfig`，把裡面的值貼到 `firebase-config.js`，改成 `window.SLAY_FIREBASE = { ... }` 的格式。
3. 左邊選單點 **Authentication**，按「開始使用」，在「登入方式」啟用 **Google**。
4. 一樣在 Authentication，打開「設定」→「授權網域」，加入你的 GitHub Pages 網域，例如 `你的帳號.github.io`。
5. 左邊選單點 **Firestore Database**，建立資料庫，選「正式版模式」，地區選離台灣近的，例如 `asia-east1`。
6. 到 Firestore 的「規則」分頁，把 `firestore.rules` 的內容整個貼上，按「發布」。

`firebase-config.js` 裡的 apiKey 本來就是公開的，放上 GitHub 沒問題，真正保護資料的是第 6 步的規則。

## 放上 GitHub Pages

1. 在 GitHub 建一個新的 repository，例如 `slaycure`。
2. 把這個資料夾裡的四個檔案上傳上去。
3. 到 repository 的 **Settings → Pages**，Source 選 `Deploy from a branch`，Branch 選 `main`、資料夾選 `/ (root)`，按 Save。
4. 等一兩分鐘，遊戲就會出現在 `https://你的帳號.github.io/slaycure/`。

## 要注意的事

- 分數是在玩家的瀏覽器裡算的，懂程式的人有辦法改。朋友之間玩沒關係，要辦正式比賽就需要另外做後端驗證。
- 遊戲裡的手部和人物插圖是用 AI 生成的。公開前請確認你使用的生圖服務允許這樣用。

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 遊戲本體 |
| `firebase-config.js` | Firebase 設定，留空就是單機模式 |
| `firestore.rules` | 資料庫安全規則，貼到 Firestore 規則頁 |
| `README.md` | 這份說明 |

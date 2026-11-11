# Slaycure

日系動漫風的美甲沙龍小遊戲。接客、修甲型、刷指甲油、做款式、照燈，賺小費買新顏色和工具。

遊戲本體就是一個 `index.html`，圖片都包在檔案裡，放上 GitHub Pages 就能玩。

## 不連資料庫也能玩

`config.js` 兩個設定都留空時，遊戲照樣能玩。錢包、商店、熟練度和自創款式會存在玩家自己的瀏覽器，只是看不到排行榜和大家的作品。

## 用 Google 試算表開啟排行榜和作品牆

### 試算表版要注意的事

- 每次讀寫大約要等一兩秒，排行榜和作品牆打開時會先顯示「讀取中」。
- 進度綁在玩家的瀏覽器。換裝置、清除瀏覽器資料或用無痕模式，就會變成新玩家。
- 暱稱可以重複。
- 每位玩家第一次寫入時，會登記一組只有他的瀏覽器知道的密碼，別人改不到他的紀錄。不過任何人都能不斷開新身分灌資料，分數也是在玩家的瀏覽器裡算的。朋友之間玩沒問題，正式比賽就需要更嚴格的後端。
- 想整理資料，直接在試算表裡刪掉那幾列就好。

## 之後想換成 Firebase

`config.js` 裡已經留好 Firebase 的設定，把 `SLAY_SHEETS_URL` 清空、取消 Firebase 那段的註解，再照 `firestore.rules` 開資料庫就能切換。Firebase 版可以讓玩家綁定 Google 帳號，換裝置也能繼續玩。切換後試算表裡的舊排行榜不會自動搬過去。

## 放上 GitHub Pages

到 repository 的 **Settings → Pages**，Source 選 `Deploy from a branch`，Branch 選 `main`、資料夾選 `/ (root)`，按 Save。一兩分鐘後遊戲會出現在 `https://你的帳號.github.io/slaycure/`。

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 遊戲本體 |
| `config.js` | 連線設定：試算表網址或 Firebase |
| `apps-script/Code.gs` | 貼到試算表 Apps Script 的後端程式 |
| `firestore.rules` | 改用 Firebase 時的資料庫規則 |

遊戲裡的手部和人物插圖是用 AI 生成的，公開前請確認你使用的生圖服務允許這樣用。

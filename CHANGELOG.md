# 變更紀錄

本檔案是給後續維護者（含 AI 協作者）的變更說明。修改程式後請在最上方補一段。

## 2026-08-09 — 修 5 個 Bug、5 項優化

程式碼審查後的一次集中修正。測試由 2 支增為 3 支，`npm test` 全綠。

### 修正的 Bug

1. **專科徽章與代診標籤疊字**（`layout-logic.js`、`app.js` 的 `drawCell`）
   同一格若同時有「專科」與「代診」，日期文字的基線會落在專科徽章上，兩者疊在一起。
   原本四種組合的座標寫死在 `drawCell` 裡，現在抽成 `getCellLayout(hasSpecialty, hasAlt)`，
   四種組合各有一組不重疊的座標，並由 `tests/layout-logic.test.js` 用不等式斷言把關。
   實際會踩到的例子：下午第2診的賈文君（家醫科）只要排一次代診。

2. **代診與日期文字會撐出格子外**（`app.js` 的 `drawCell`）
   `cell.alt` 與 `cell.dates` 原本用固定字級。同一格出現兩種異動時會變成
   `7 許和宏代診｜21 蘇立芳代診`，寬度超過格寬溢出到隔壁格。
   現在兩者都套用 `fitTextSize`，並先把實際像素寬換算回未縮放空間再計算
   （格寬固定 435，格高會依異動筆數縮放，兩者單位不同）。

3. **匯入格式不符的 JSON 會讓編輯器變空白**（新增 `state-logic.js`）
   `mergeState` 對陣列是整包覆蓋且不驗證結構，匯入舊版備份會讓 `autoPopulateDates` 拋錯，
   而且壞掉的 state 會被寫回 localStorage，重開後畫面全空。
   新增 `describeProblem()` 作為**唯一的資料入口驗證**，localStorage 還原、檔案匯入、
   雲端載入三條路徑都經過它，不合格就整包拒絕並保留現有資料。

4. **異動超過 6 筆時海報靜默吃掉多的**（`app.js`）
   編輯區列出全部、海報只 `slice(0, 6)`，使用者不會知道有兩筆沒印出來。
   `MAX_CHANGES` 改由 `layout-logic.js` 匯出統一管理，`applyState()` 在匯入時就截斷並回報，
   編輯區達上限時顯示說明。

5. **民國年／月份填錯只會靜靜壞掉**（`app.js`、`styles.css`）
   `autoPopulateDates()` 回傳的 false 被忽略，海報照樣印出「民國 年」「00月」。
   月份改為 1–12 下拉選單、民國年改為 `type="number"`，並在無效時顯示紅色警告列。

### 優化

6. **825×600 匯出不再糊**（`app.js` 的 `exportPng`）
   原本固定光柵化成 3300×2400 再用 `drawImage` 縮小。現在序列化前先把 clone 的
   `width`/`height` 設成目標尺寸（`viewBox` 不動），讓瀏覽器直接以最終尺寸描字。
   已驗證匯出圖的 natural size 為 825×600。

7. **輸入不再每按一鍵就重畫整張海報**（`app.js`）
   海報約 250 個 SVG 節點。新增 `scheduleRender()`（80ms debounce）與 `flushRender()`
   （匯出前強制畫完）。

8. **GitHub Pages 現在會部署 `data/`**（`.github/workflows/pages.yml`）
   同時把逐檔 `cp` 改成 `cp *.html *.css *.js`，避免新增檔案時漏掉（這次的
   `state-logic.js` 就會踩到）。網站新增「載入雲端資料」按鈕，依目前年月抓
   `data/<民國年><MM>_門診資料.json`，另一台電腦不必裝 git 也能取得當月資料。
   按鈕只在 http/https 下出現，用 `file://` 直接開啟時不顯示。

9. **`persist()` 加上 try/catch**（`app.js`）
   無痕模式或 localStorage 額滿時會拋錯並中斷編輯，現在改為提示「無法自動儲存」。

10. **「還原範例」的確認文字不再寫死月份**（`app.js`）
    改為讀 `defaultData` 的年月。

### 新增檔案

- `state-logic.js`：匯入資料的結構驗證（純函式，可在 Node 下測試）。
- `tests/state-logic.test.js`：合法／殘缺／壞掉的備份共 13 個案例。

### 驗證方式

- `npm test`（3 支測試全過）
- Playwright 實測：專科+雙代診同格的實際 bounding box 不重疊且不出格、
  壞掉的 JSON 被擋下且海報不變、雲端載入成功、無效年份顯示警告、
  825×600 匯出產生有效 PNG。

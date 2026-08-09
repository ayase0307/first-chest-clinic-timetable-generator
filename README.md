# 第一胸腔病防治所門診時刻表產生器

離線瀏覽器工具，用於維護門診資料並輸出固定比例的粉絲團／電視牆圖片。

## 開啟與匯出

1. 使用 Chrome 或 Microsoft Edge 開啟 `index.html`。
2. 更新民國年、月份、醫師與異動資料。
3. 日期會自動依年月計算；吻合診次與原醫師的異動日期會自動從原門診扣除。
4. 異動1–3筆會單排顯示，4筆採2×2，5–6筆採3×2。
5. 下載 `825×600` 供電視牆使用，或下載 `3300×2400` 高畫質 PNG。

所有功能都可離線執行，門診資料不會上傳。

## 跨電腦的 Git 工作流程

瀏覽器自動儲存只屬於目前電腦。要跨電腦同步當月內容：

1. 完成編輯後按「備份資料」。
2. 將下載的 JSON 放進 `data/`。
3. 提交並推送：

```bash
git add data/
git commit -m "Update clinic schedule for 115-09"
git push
```

4. 另一台電腦執行 `git pull`，開啟產生器後按「匯入資料」。

從公開網站開啟時，可直接按「載入雲端資料」，它會依目前的民國年與月份抓取
`data/<民國年><月份>_門診資料.json`（例如 115 年 8 月對應 `11508_門診資料.json`），
不必在該台電腦安裝 git。此按鈕只在網站上出現，用 `file://` 直接開啟本機檔案時不顯示。

匯入與載入都會先檢查格式，門診表必須是 4 個診次 × 6 天；格式不符會直接拒絕並保留目前資料。

遠端Repo與公開網站已完成設定：

- Repo：<https://github.com/ayase0307/first-chest-clinic-timetable-generator>
- 網站：<https://ayase0307.github.io/first-chest-clinic-timetable-generator/>

在另一台電腦首次使用時執行：

```bash
git clone https://github.com/ayase0307/first-chest-clinic-timetable-generator.git
```

## GitHub自動同步與發布

專案已包含 `.github/workflows/pages.yml`。推送到 `main` 後，GitHub Actions會先執行測試，再將必要的靜態檔案發布到GitHub Pages。

本專案已將 `origin`、公開Repo及GitHub Pages設定完成。之後可直接執行 `sync-and-publish.cmd`；它會依序拉取遠端、提交目前變更、推送 `main`，並觸發網站重新發布。

## 自動日期規則

- 民國年自動加1911換算西元。
- 自動建立星期一至星期六的日期，星期日不列入表格。
- 異動必須同時吻合日期、上午／下午、診室與原看診醫師，才會扣除原日期。
- 同一位代診醫師的多個日期會合併，例如 `7・21 許和宏代診`。
- 不同代診醫師會分開顯示。

執行測試：

```bash
npm test
```

## QR Code

為降低QR密度，已移除Facebook轉址與追蹤參數，目的地不變：

- Google地標：`https://maps.app.goo.gl/8cGiFoGshrdWkWzz8`
- Facebook：`https://www.facebook.com/profile.php?id=61579522585754`

若網址日後更換：

```bash
python -m pip install -r requirements-tools.txt
python tools/generate_qr.py
```

## 主要檔案

- `index.html`：編輯器入口。
- `app.js`：表單、海報排版與PNG匯出。
- `date-logic.js`：年月、星期與異動日期運算。
- `layout-logic.js`：異動筆數與海報區塊配置規則，以及單一門診格的不疊字座標。
- `state-logic.js`：匯入／還原資料前的結構驗證。
- `.github/workflows/pages.yml`：推送 `main` 後自動測試及發布GitHub Pages。
- `sync-and-publish.cmd`：Windows一鍵同步及觸發發布。
- `styles.css`：編輯介面樣式。
- `ornament-data.js`：離線內嵌的月曆與公告小裝飾。
- `qr-data.js`：離線內嵌QR碼。
- `tests/date-logic.test.js`：日期邏輯測試。
- `tests/layout-logic.test.js`：1–6筆異動排版與門診格不疊字測試。
- `tests/state-logic.test.js`：匯入資料驗證測試。
- `data/`：跨電腦同步的月份JSON資料，會一併發布到網站。
- `CHANGELOG.md`：變更紀錄，維護者與AI協作者請先看這份。

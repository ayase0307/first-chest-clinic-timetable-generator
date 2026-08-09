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

本機倉庫尚未綁定遠端；建立 GitHub、GitLab 或其他私人遠端後，執行：

```bash
git remote add origin <REMOTE_URL>
git push -u origin main
```

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
- `layout-logic.js`：異動筆數與海報區塊配置規則。
- `styles.css`：編輯介面樣式。
- `ornament-data.js`：離線內嵌的月曆與公告小裝飾。
- `qr-data.js`：離線內嵌QR碼。
- `tests/date-logic.test.js`：日期邏輯測試。
- `tests/layout-logic.test.js`：1–6筆異動排版測試。
- `data/`：跨電腦同步的月份JSON資料。

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TimetableStateLogic = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // 匯入或從 localStorage 還原前的結構檢查。回傳空字串代表通過，
  // 否則回傳給使用者看的錯誤訊息。缺少的欄位會沿用預設值，所以只驗證有出現的欄位。
  function describeProblem(incoming, expectedRowCount, expectedCellCount) {
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      return "檔案內容不是門診資料";
    }

    if ("rows" in incoming) {
      const rows = incoming.rows;
      const shapeOk = Array.isArray(rows)
        && rows.length === expectedRowCount
        && rows.every((row) => row
          && typeof row === "object"
          && Array.isArray(row.cells)
          && row.cells.length === expectedCellCount
          && row.cells.every((cell) => cell && typeof cell === "object" && !Array.isArray(cell)));
      if (!shapeOk) {
        return `門診表格式不符，需要 ${expectedRowCount} 個診次 × ${expectedCellCount} 天`;
      }
    }

    if ("changes" in incoming && !Array.isArray(incoming.changes)) {
      return "異動資料格式不符";
    }

    return "";
  }

  return { describeProblem };
});

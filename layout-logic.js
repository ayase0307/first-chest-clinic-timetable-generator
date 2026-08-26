(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TimetableLayoutLogic = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MAX_CHANGES = 8;

  function getChangeLayout(changeCount) {
    const count = Math.max(0, Math.min(MAX_CHANGES, Number.parseInt(changeCount, 10) || 0));
    const stacked = count > 3;
    const rows = stacked ? 2 : 1;
    // 7～8 筆改排 4 欄，異動卡高度不變，門診表就不必再被壓縮。
    const columns = count > 6 ? 4 : count === 4 ? 2 : count > 0 ? 3 : 1;

    // 標題列收在 456，異動卡固定從 505 起；不論異動幾筆，門診表都收在 1950，
    // 下方才留得出頁尾卡（1990–2260）與滿版底條（2300–2400）。
    return {
      count,
      stacked,
      rows,
      columns,
      alertY: 505,
      alertHeight: stacked ? 480 : 330,
      gridY: stacked ? 1025 : 875,
      tableHeaderHeight: stacked ? 113 : 115,
      tableRowHeight: stacked ? 203 : 240
    };
  }

  // 單一門診格的垂直配置，單位是未縮放的 250px 設計高度。
  // 由上而下是醫師名 → 日期 → 代診膠囊，相鄰兩層都不能疊字。
  // 專科徽章跟醫師名排同一行（見 app.js `drawCell`），不佔垂直空間，
  // 所以版面只看有沒有代診膠囊，醫師名在兩種情況下都吃得到 70 字級。
  function getCellLayout(hasAlt) {
    // 看診日期是民眾真正在找的資訊，字級盡量往上推到相鄰兩層的極限；
    // 超出格寬時 app.js 的 fitTextSize 會自己縮，所以這裡填的是上限不是定值。
    if (hasAlt) {
      return {
        specialtyHeight: 44, specialtySize: 28,
        nameY: 70, nameSize: 70,
        datesY: 142, datesSize: 46,
        altY: 164, altHeight: 60, altTextY: 208, altSize: 36
      };
    }
    return {
      specialtyHeight: 48, specialtySize: 30,
      nameY: 112, nameSize: 70,
      datesY: 178, datesSize: 48,
      altY: 0, altHeight: 0, altTextY: 0, altSize: 36
    };
  }

  return { MAX_CHANGES, getChangeLayout, getCellLayout };
});

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

    // 標題列收在 456，異動卡固定從 505 起；不論異動幾筆，門診表都收在 1848，
    // 下方才留得出頁尾卡（1900–2240）與滿版底條（2300–2400）。
    return {
      count,
      stacked,
      rows,
      columns,
      alertY: 505,
      alertHeight: stacked ? 480 : 330,
      gridY: stacked ? 1025 : 875,
      tableHeaderHeight: stacked ? 111 : 113,
      tableRowHeight: stacked ? 178 : 215
    };
  }

  // 單一門診格的垂直配置，單位是未縮放的 250px 設計高度。
  // 由上而下是專科徽章 → 醫師名 → 日期 → 代診膠囊，相鄰兩層都不能疊字。
  // 徽章擺在名字之前當分類標籤，名字才會緊貼著自己的日期，不被色條切開。
  function getCellLayout(hasSpecialty, hasAlt) {
    if (hasSpecialty && hasAlt) {
      return {
        specialtyY: 26, specialtyHeight: 36, specialtyTextY: 51, specialtySize: 25,
        nameY: 110, nameSize: 64,
        datesY: 150, datesSize: 33,
        altY: 164, altHeight: 52, altTextY: 198, altSize: 29
      };
    }
    if (hasAlt) {
      return {
        specialtyY: 0, specialtyHeight: 0, specialtyTextY: 0, specialtySize: 31,
        nameY: 73, nameSize: 70,
        datesY: 145, datesSize: 38,
        altY: 172, altHeight: 54, altTextY: 210, altSize: 31
      };
    }
    return {
      specialtyY: 34, specialtyHeight: 46, specialtyTextY: 68, specialtySize: 29,
      nameY: 138, nameSize: 70,
      datesY: 186, datesSize: 38,
      altY: 0, altHeight: 0, altTextY: 0, altSize: 31
    };
  }

  return { MAX_CHANGES, getChangeLayout, getCellLayout };
});

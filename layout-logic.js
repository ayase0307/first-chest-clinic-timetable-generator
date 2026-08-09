(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TimetableLayoutLogic = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MAX_CHANGES = 6;

  function getChangeLayout(changeCount) {
    const count = Math.max(0, Math.min(MAX_CHANGES, Number.parseInt(changeCount, 10) || 0));
    const stacked = count > 3;
    const rows = stacked ? 2 : 1;
    const columns = count === 4 ? 2 : count > 0 ? 3 : 1;

    return {
      count,
      stacked,
      rows,
      columns,
      alertHeight: stacked ? 500 : 330,
      gridY: stacked ? 960 : 790,
      tableHeaderHeight: stacked ? 100 : 130,
      tableRowHeight: stacked ? 197 : 232
    };
  }

  // 單一門診格的垂直配置，單位是未縮放的 250px 設計高度。
  // 專科徽章必須完全在日期文字之上，日期文字必須完全在代診膠囊之上，否則會疊字。
  function getCellLayout(hasSpecialty, hasAlt) {
    if (hasSpecialty && hasAlt) {
      return {
        nameY: 62, nameSize: 60,
        specialtyY: 76, specialtyHeight: 42, specialtyTextY: 105, specialtySize: 27,
        datesY: 150, datesSize: 33,
        altY: 166, altHeight: 50, altTextY: 200, altSize: 29
      };
    }
    if (hasAlt) {
      return {
        nameY: 73, nameSize: 70,
        specialtyY: 0, specialtyHeight: 0, specialtyTextY: 0, specialtySize: 31,
        datesY: 145, datesSize: 38,
        altY: 172, altHeight: 54, altTextY: 210, altSize: 31
      };
    }
    return {
      nameY: 88, nameSize: 70,
      specialtyY: 104, specialtyHeight: 52, specialtyTextY: 141, specialtySize: 31,
      datesY: 190, datesSize: 38,
      altY: 0, altHeight: 0, altTextY: 0, altSize: 31
    };
  }

  return { MAX_CHANGES, getChangeLayout, getCellLayout };
});

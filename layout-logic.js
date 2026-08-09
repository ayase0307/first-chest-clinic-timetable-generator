(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TimetableLayoutLogic = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function getChangeLayout(changeCount) {
    const count = Math.max(0, Math.min(6, Number.parseInt(changeCount, 10) || 0));
    const stacked = count > 3;
    const rows = stacked ? 2 : 1;
    const columns = count === 4 ? 2 : count > 0 ? 3 : 1;

    return {
      count,
      stacked,
      rows,
      columns,
      alertHeight: stacked ? 390 : 250,
      gridY: stacked ? 850 : 710,
      tableHeaderHeight: stacked ? 120 : 140,
      tableRowHeight: stacked ? 220 : 250
    };
  }

  return { getChangeLayout };
});

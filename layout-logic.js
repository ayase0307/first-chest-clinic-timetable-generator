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
    const columns = count === 4 ? 2 : Math.max(1, Math.min(count, 3));

    return {
      count,
      stacked,
      rows,
      columns,
      alertHeight: stacked ? 350 : 210,
      gridY: stacked ? 816 : 680,
      tableHeaderHeight: stacked ? 124 : 140,
      tableRowHeight: stacked ? 226 : 250
    };
  }

  return { getChangeLayout };
});

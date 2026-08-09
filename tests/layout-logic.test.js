"use strict";

const assert = require("node:assert/strict");
const { getChangeLayout } = require("../layout-logic.js");

assert.deepEqual(
  [1, 2, 3].map((count) => {
    const layout = getChangeLayout(count);
    return [layout.rows, layout.columns, layout.stacked];
  }),
  [[1, 3, false], [1, 3, false], [1, 3, false]]
);

assert.deepEqual(
  [4, 5, 6].map((count) => {
    const layout = getChangeLayout(count);
    return [layout.rows, layout.columns, layout.stacked];
  }),
  [[2, 2, true], [2, 3, true], [2, 3, true]]
);

const fourChanges = getChangeLayout(4);
assert.equal(fourChanges.alertHeight, 500);
assert.equal(fourChanges.gridY, 960);
assert.equal(fourChanges.gridY + fourChanges.tableHeaderHeight + fourChanges.tableRowHeight * 4, 1848);

const threeChanges = getChangeLayout(3);
assert.equal(threeChanges.alertHeight, 330);
assert.equal(threeChanges.gridY + threeChanges.tableHeaderHeight + threeChanges.tableRowHeight * 4, 1848);

assert.equal(getChangeLayout(99).count, 6);

console.log("layout-logic tests passed");

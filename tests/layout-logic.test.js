"use strict";

const assert = require("node:assert/strict");
const { getChangeLayout, getCellLayout, MAX_CHANGES } = require("../layout-logic.js");

assert.deepEqual(
  [1, 2, 3].map((count) => {
    const layout = getChangeLayout(count);
    return [layout.rows, layout.columns, layout.stacked];
  }),
  [[1, 3, false], [1, 3, false], [1, 3, false]]
);

assert.deepEqual(
  [4, 5, 6, 7, 8].map((count) => {
    const layout = getChangeLayout(count);
    return [layout.rows, layout.columns, layout.stacked];
  }),
  [[2, 2, true], [2, 3, true], [2, 3, true], [2, 4, true], [2, 4, true]]
);

// 不論異動幾筆，異動卡與門診表之間都留 40，門診表都收在 1848。
[1, 2, 3, 4, 5, 6, 7, 8].forEach((count) => {
  const layout = getChangeLayout(count);
  assert.equal(layout.alertY + layout.alertHeight + 40, layout.gridY, `${count} 筆：異動卡與門診表間距不是 40`);
  assert.equal(layout.gridY + layout.tableHeaderHeight + layout.tableRowHeight * 4, 1848, `${count} 筆：門診表沒收在 1848`);
});

assert.equal(getChangeLayout(4).alertHeight, 480);
assert.equal(getChangeLayout(3).alertHeight, 330);

assert.equal(getChangeLayout(99).count, MAX_CHANGES);

// 門診格版面：醫師名、日期、代診膠囊上下不能疊字，同一行的專科徽章不能凸出格子。
// 中文字幾乎沒有下伸部，所以用 0.72 em 上伸、0.14 em 下伸估算實際佔用高度。
const ASCENT = .72;
const DESCENT = .14;
const CELL_BOTTOM = 242;

[false, true].forEach((hasAlt) => {
  const layout = getCellLayout(hasAlt);
  const label = `alt=${hasAlt}`;
  const datesTop = layout.datesY - layout.datesSize * ASCENT;
  const nameTop = layout.nameY - layout.nameSize * ASCENT;
  const nameBottom = layout.nameY + layout.nameSize * DESCENT;

  assert.ok(nameTop >= 0, `${label}: 醫師名超出格子上緣`);
  assert.ok(nameBottom <= datesTop, `${label}: 醫師名壓到日期`);

  // 徽章跟醫師名同一行、對齊名字的視覺中線，兩端都不能撞到格子邊或日期。
  const badgeTop = (nameTop + nameBottom) / 2 - layout.specialtyHeight / 2;
  assert.ok(badgeTop >= 0, `${label}: 專科徽章凸出格子上緣`);
  assert.ok(badgeTop + layout.specialtyHeight <= datesTop, `${label}: 專科徽章壓到日期`);

  if (hasAlt) {
    assert.ok(layout.datesY + layout.datesSize * DESCENT <= layout.altY, `${label}: 日期壓到代診膠囊`);
    assert.ok(layout.altTextY - layout.altSize * ASCENT >= layout.altY, `${label}: 代診文字超出膠囊上緣`);
    assert.ok(layout.altTextY + layout.altSize * DESCENT <= layout.altY + layout.altHeight, `${label}: 代診文字超出膠囊下緣`);
    assert.ok(layout.altY + layout.altHeight <= CELL_BOTTOM, `${label}: 代診膠囊超出格子`);
  } else {
    assert.ok(layout.datesY + layout.datesSize * DESCENT <= CELL_BOTTOM, `${label}: 日期超出格子`);
  }
});

console.log("layout-logic tests passed");

"use strict";

const assert = require("node:assert/strict");
const logic = require("../date-logic.js");

function cells(doctor) {
  return Array.from({ length: 6 }, () => ({ doctor, specialty: "", dates: "", alt: "", status: "normal" }));
}

const state = {
  year: "115",
  month: "8",
  rows: [
    { session: "上午", room: "第2診", cells: cells("甲醫師") },
    { session: "下午", room: "第3診", cells: cells("乙醫師") }
  ],
  changes: [
    { date: "8/24", session: "上午", room: "第2診", originalDoctor: "甲", substituteDoctor: "丙", kind: "substitute" },
    { date: "8/7", session: "下午", room: "第3診", originalDoctor: "乙", substituteDoctor: "丁", kind: "substitute" },
    { date: "8/21", session: "下午", room: "第3診", originalDoctor: "乙醫師", substituteDoctor: "丁", kind: "substitute" }
  ]
};

assert.equal(logic.autoPopulateDates(state), true);
assert.equal(state.rows[0].cells[0].dates, "3・10・17・31");
assert.equal(state.rows[0].cells[0].alt, "24 丙代診");
assert.equal(state.rows[1].cells[4].dates, "14・28");
assert.equal(state.rows[1].cells[4].alt, "7・21 丁代診");
assert.equal(logic.formatChangeDate(state, "8/7"), "8/7（五）");

// 兩組都是代診就只留最後一個「代診」，膠囊才不會被壓成小字。
const twoSubstitutes = {
  year: "115", month: "9",
  rows: [{ session: "下午", room: "第3診", cells: cells("羅嬌芳") }],
  changes: [
    { date: "9/2", session: "下午", room: "第3診", originalDoctor: "羅嬌芳", substituteDoctor: "徐上富", kind: "substitute" },
    { date: "9/16", session: "下午", room: "第3診", originalDoctor: "羅嬌芳", substituteDoctor: "許和宏", kind: "substitute" },
    { date: "9/23", session: "下午", room: "第3診", originalDoctor: "羅嬌芳", substituteDoctor: "許和宏", kind: "substitute" }
  ]
};
logic.autoPopulateDates(twoSubstitutes);
assert.equal(twoSubstitutes.rows[0].cells[2].alt, "2 徐上富｜16・23 許和宏代診");

// 混到停診就不能省，每一組都要自己講清楚是代診還是停診。
const mixed = {
  year: "115", month: "9",
  rows: [{ session: "上午", room: "第2診", cells: cells("徐上富") }],
  changes: [
    { date: "9/8", session: "上午", room: "第2診", originalDoctor: "徐上富", substituteDoctor: "", kind: "closed" },
    { date: "9/22", session: "上午", room: "第2診", originalDoctor: "徐上富", substituteDoctor: "許和宏", kind: "substitute" }
  ]
};
logic.autoPopulateDates(mixed);
assert.equal(mixed.rows[0].cells[1].alt, "8 停診｜22 許和宏代診");

const leapState = { year: "113", month: "2", rows: [{ session: "上午", room: "第2診", cells: cells("甲") }], changes: [] };
logic.autoPopulateDates(leapState);
assert.equal(leapState.rows[0].cells[3].dates, "1・8・15・22・29");

// 沒醫師的格子不該被「原看診醫師沒填」的異動套進代診膠囊，
// 而且上一版留下來的日期與膠囊要自己清掉、回到「無門診」。
const blankState = {
  year: "115",
  month: "9",
  rows: [{
    session: "下午",
    room: "第2診",
    cells: cells("甲").map((cell, index) => index === 2
      ? { doctor: "", specialty: "", dates: "9・30", alt: "23 代診醫師未填代診", status: "substitute" }
      : cell)
  }],
  changes: [{ date: "9/23", session: "下午", room: "第2診", originalDoctor: "", substituteDoctor: "", kind: "substitute" }]
};
logic.autoPopulateDates(blankState);
assert.deepEqual(
  [blankState.rows[0].cells[2].dates, blankState.rows[0].cells[2].alt, blankState.rows[0].cells[2].status],
  ["", "", "empty"]
);

// 節慶停診：不管時段／診室／原看診醫師，那天所有診次都要抽掉，格子裡不留膠囊。
const holidayState = {
  year: "115",
  month: "9",
  rows: [
    { session: "上午", room: "第2診", cells: cells("甲") },
    { session: "下午", room: "第3診", cells: cells("乙") }
  ],
  changes: [{ date: "9/25", session: "上午", room: "第2診", originalDoctor: "", substituteDoctor: "中秋節", kind: "holiday" }]
};
logic.autoPopulateDates(holidayState);
// 115/9 的星期五是 4、11、18、25。
assert.deepEqual(
  holidayState.rows.map((row) => [row.cells[4].dates, row.cells[4].alt]),
  [["4・11・18", ""], ["4・11・18", ""]]
);
assert.equal(holidayState.rows[0].cells[3].dates, "3・10・17・24", "節慶停診不該動到其他天");

// 連假寫成區間：115/9/25（五）～9/28（一），週六 26 也要停，週日 27 本來就沒門診。
const longHolidayState = {
  year: "115",
  month: "9",
  rows: [{ session: "上午", room: "第3診", cells: cells("甲") }],
  changes: [{ date: "9/25~9/28", session: "", room: "", originalDoctor: "", substituteDoctor: "中秋節・教師節連假", kind: "holiday" }]
};
logic.autoPopulateDates(longHolidayState);
assert.deepEqual(
  longHolidayState.rows[0].cells.map((cell) => cell.dates),
  ["7・14・21", "1・8・15・22・29", "2・9・16・23・30", "3・10・17・24", "4・11・18", "5・12・19"]
);
assert.equal(logic.formatChangeDate(longHolidayState, "9/25~9/28"), "9/25～9/28");
assert.equal(logic.formatChangeDate(longHolidayState, "9/25"), "9/25（五）", "單日照舊要標星期");

// 同一位醫師散在多天的停診寫成一筆清單：9/8、9/15 是週二、9/11 是週五，各自落到自己那一格。
const listState = {
  year: "115",
  month: "9",
  rows: [{ session: "上午", room: "第2診", cells: cells("徐上富") }],
  changes: [
    { date: "9/8・9/11・9/15", session: "上午", room: "第2診", originalDoctor: "徐上富", substituteDoctor: "", kind: "closed" }
  ]
};
logic.autoPopulateDates(listState);
assert.deepEqual(
  [listState.rows[0].cells[1].dates, listState.rows[0].cells[1].alt],
  ["1・22・29", "8・15 停診"]
);
assert.deepEqual(
  [listState.rows[0].cells[4].dates, listState.rows[0].cells[4].alt],
  ["4・18・25", "11 停診"]
);
assert.equal(logic.formatChangeDate(listState, "9/8・9/11・9/15"), "9/8・11・15", "清單只留第一個月份");

// 對帳：四項全中才會扣日期，對不上時要講得出是哪一天、那天實際上是誰。
const matchState = {
  year: "115",
  month: "9",
  rows: [{
    session: "下午",
    room: "第3診",
    cells: cells("蘇立芳").map((cell, index) => index === 3 ? { ...cell, doctor: "藍龍雄" } : cell)
  }],
  changes: []
};
const good = { date: "9/24", session: "下午", room: "第3診", originalDoctor: "藍龍雄", substituteDoctor: "蘇立芳", kind: "substitute" };
assert.deepEqual(logic.describeChange(matchState, good), { ok: true, text: "已從 下午第3診 扣掉 9/24" });
assert.equal(logic.describeChange(matchState, { ...good, originalDoctor: "羅嬌芳" }).ok, false);
assert.match(logic.describeChange(matchState, { ...good, originalDoctor: "羅嬌芳" }).text, /藍龍雄/);
assert.match(logic.describeChange(matchState, { ...good, date: "" }).text, /日期看不懂/);
assert.match(logic.describeChange(matchState, { ...good, room: "第2診" }).text, /找不到/);
assert.match(logic.describeChange(matchState, { ...good, originalDoctor: "" }).text, /原看診醫師沒填/);
// 9/28 是週一（蘇立芳），跟 9/24 混在同一筆就要點名是哪一天對不上。
assert.match(logic.describeChange(matchState, { ...good, date: "9/24,9/28" }).text, /9\/28/);
assert.equal(logic.describeChange(matchState, { ...good, kind: "notice" }).ok, true);

// 填完日期與診次就知道那格是誰，不必再要人自己抄名字。
assert.equal(logic.guessOriginalDoctor(matchState, { date: "9/24", session: "下午", room: "第3診", kind: "substitute" }), "藍龍雄");
assert.equal(logic.guessOriginalDoctor(matchState, { date: "9/28", session: "下午", room: "第3診", kind: "substitute" }), "蘇立芳");
assert.equal(logic.guessOriginalDoctor(matchState, { date: "", session: "下午", room: "第3診", kind: "substitute" }), "");

console.log("date-logic tests passed");

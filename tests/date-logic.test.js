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

console.log("date-logic tests passed");

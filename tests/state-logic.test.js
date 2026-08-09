"use strict";

const assert = require("node:assert/strict");
const { describeProblem } = require("../state-logic.js");

const ROWS = 4;
const DAYS = 6;

function cells(count = DAYS) {
  return Array.from({ length: count }, () => ({ doctor: "甲", specialty: "", dates: "", alt: "", status: "normal" }));
}

function rows(count = ROWS, cellCount = DAYS) {
  return Array.from({ length: count }, () => ({ session: "上午", room: "第2診", cells: cells(cellCount) }));
}

const check = (incoming) => describeProblem(incoming, ROWS, DAYS);

// 完整且合法的備份
assert.equal(check({ year: "115", month: "8", rows: rows(), changes: [] }), "");

// 只有部分欄位也可以，缺的會沿用預設值
assert.equal(check({ year: "116" }), "");
assert.equal(check({}), "");

// 不是物件
assert.notEqual(check(null), "");
assert.notEqual(check("115"), "");
assert.notEqual(check([1, 2, 3]), "");

// rows 結構壞掉的舊版備份必須被擋下來，否則會把編輯器弄壞
assert.notEqual(check({ rows: "壞掉" }), "");
assert.notEqual(check({ rows: rows(3) }), "");
assert.notEqual(check({ rows: rows(ROWS, 5) }), "");
assert.notEqual(check({ rows: [{ session: "上午", room: "第2診" }, ...rows(3)] }), "");
assert.notEqual(check({ rows: [{ cells: [null, null, null, null, null, null] }, ...rows(3)] }), "");

// changes 必須是陣列
assert.notEqual(check({ changes: { date: "8/7" } }), "");
assert.equal(check({ changes: [] }), "");

console.log("state-logic tests passed");

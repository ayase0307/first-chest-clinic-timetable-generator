(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TimetableDateLogic = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const weekdayMarks = ["日", "一", "二", "三", "四", "五", "六"];

  function normalizeDoctor(value) {
    return String(value || "").replace(/醫師/g, "").replace(/\s+/g, "").trim();
  }

  function getCalendar(state) {
    const rocYear = Number.parseInt(state.year, 10);
    const month = Number.parseInt(state.month, 10);
    if (!Number.isInteger(rocYear) || !Number.isInteger(month) || month < 1 || month > 12) return null;
    return { rocYear, gregorianYear: rocYear + 1911, month };
  }

  function parseChangeDate(state, value) {
    const calendar = getCalendar(state);
    if (!calendar) return null;
    const numbers = String(value || "").match(/\d+/g)?.map(Number) || [];
    if (!numbers.length) return null;
    const day = numbers[numbers.length - 1];
    const month = numbers.length >= 2 ? numbers[numbers.length - 2] : calendar.month;
    if (month !== calendar.month || day < 1 || day > 31) return null;
    const date = new Date(calendar.gregorianYear, month - 1, day);
    if (date.getFullYear() !== calendar.gregorianYear || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return { month, day, weekday: date.getDay(), date };
  }

  function formatChangeDate(state, value) {
    const parsed = parseChangeDate(state, value);
    if (!parsed) return value || "日期未填";
    return `${parsed.month}/${parsed.day}（${weekdayMarks[parsed.weekday]}）`;
  }

  function autoPopulateDates(state) {
    const calendar = getCalendar(state);
    if (!calendar) return false;

    const weekdayDates = Array.from({ length: 6 }, () => []);
    const daysInMonth = new Date(calendar.gregorianYear, calendar.month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const weekday = new Date(calendar.gregorianYear, calendar.month - 1, day).getDay();
      if (weekday >= 1 && weekday <= 6) weekdayDates[weekday - 1].push(day);
    }

    state.rows.forEach((row) => {
      row.cells.forEach((cell, dayIndex) => {
        if (cell.status === "empty" || cell.status === "closed" || !normalizeDoctor(cell.doctor)) return;
        cell.dates = weekdayDates[dayIndex].join("・");
        cell.alt = "";
        if (cell.status === "substitute") cell.status = "normal";
      });
    });

    const notes = new Map();
    (state.changes || []).forEach((change) => {
      if (change.kind === "notice") return;
      const parsed = parseChangeDate(state, change.date);
      if (!parsed || parsed.weekday < 1 || parsed.weekday > 6) return;
      const rowIndex = state.rows.findIndex((row) => row.session === change.session && row.room === change.room);
      if (rowIndex < 0) return;
      const dayIndex = parsed.weekday - 1;
      const cell = state.rows[rowIndex].cells[dayIndex];
      if (!cell || normalizeDoctor(cell.doctor) !== normalizeDoctor(change.originalDoctor)) return;

      cell.dates = cell.dates
        .split("・")
        .filter(Boolean)
        .filter((date) => Number(date) !== parsed.day)
        .join("・");

      const key = `${rowIndex}:${dayIndex}`;
      if (!notes.has(key)) notes.set(key, []);
      notes.get(key).push({
        day: parsed.day,
        label: change.kind === "closed" ? "休診" : `${change.substituteDoctor || "代診醫師未填"}代診`
      });
    });

    notes.forEach((items, key) => {
      const [rowIndex, dayIndex] = key.split(":").map(Number);
      const cell = state.rows[rowIndex].cells[dayIndex];
      const grouped = new Map();
      items.forEach((item) => {
        if (!grouped.has(item.label)) grouped.set(item.label, []);
        grouped.get(item.label).push(item.day);
      });
      cell.alt = Array.from(grouped.entries())
        .map(([label, dates]) => `${dates.sort((a, b) => a - b).join("・")} ${label}`)
        .join("｜");
      cell.status = "substitute";
    });
    return true;
  }

  return { autoPopulateDates, formatChangeDate, getCalendar, parseChangeDate };
});

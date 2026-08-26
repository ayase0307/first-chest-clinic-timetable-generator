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
        if (cell.status === "closed") return;
        // 沒醫師就是沒門診，順便把上一版異動留下來的日期與代診膠囊清乾淨。
        if (!normalizeDoctor(cell.doctor)) {
          cell.dates = "";
          cell.alt = "";
          cell.status = "empty";
          return;
        }
        if (cell.status === "empty") return;
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

      // 節慶停診是整天全所休息，跟時段／診室／原看診醫師無關：所有診次都把那天抽掉。
      // 格子裡不再各掛一顆膠囊（那天有四格會全部變擠），由上方的異動卡統一公告。
      if (change.kind === "holiday") {
        state.rows.forEach((row) => {
          const cell = row.cells[parsed.weekday - 1];
          if (!cell || !cell.dates) return;
          cell.dates = cell.dates
            .split("・")
            .filter(Boolean)
            .filter((date) => Number(date) !== parsed.day)
            .join("・");
        });
        return;
      }

      const rowIndex = state.rows.findIndex((row) => row.session === change.session && row.room === change.room);
      if (rowIndex < 0) return;
      const dayIndex = parsed.weekday - 1;
      const cell = state.rows[rowIndex].cells[dayIndex];
      // 原看診醫師沒填時不能拿空字串去比對，否則會套進沒醫師的空格子。
      const changeDoctor = normalizeDoctor(change.originalDoctor);
      if (!cell || !changeDoctor || normalizeDoctor(cell.doctor) !== changeDoctor) return;

      cell.dates = cell.dates
        .split("・")
        .filter(Boolean)
        .filter((date) => Number(date) !== parsed.day)
        .join("・");

      const key = `${rowIndex}:${dayIndex}`;
      if (!notes.has(key)) notes.set(key, []);
      notes.get(key).push({
        day: parsed.day,
        label: change.kind === "closed" ? "停診" : `${change.substituteDoctor || "代診醫師未填"}代診`
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

(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const STORAGE_KEY = "first-chest-clinic-timetable-v3";
  const days = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  const defaultData = {
    clinic: "中華民國防癆協會第一胸腔病防治所",
    operator: "委託臺北醫學大學附設醫院經營",
    year: "115",
    month: "8",
    updateDate: "115年8月3日",
    changes: [
      { date: "8/7", session: "下午", room: "第3診", originalDoctor: "蘇立芳", substituteDoctor: "許和宏", kind: "substitute" },
      { date: "8/21", session: "下午", room: "第3診", originalDoctor: "蘇立芳", substituteDoctor: "許和宏", kind: "substitute" },
      { date: "8/24", session: "下午", room: "第3診", originalDoctor: "蘇立芳", substituteDoctor: "許和宏", kind: "substitute" }
    ],
    rows: [
      {
        session: "上午", room: "第2診", time: "09:00 起",
        cells: [
          { doctor: "許和宏", specialty: "", dates: "3・10・17・24・31", alt: "", status: "normal" },
          { doctor: "徐上富", specialty: "", dates: "4・11・18・25", alt: "", status: "normal" },
          { doctor: "陳志維", specialty: "心臟科", dates: "5・12・19・26", alt: "", status: "normal" },
          { doctor: "", specialty: "", dates: "", alt: "", status: "empty" },
          { doctor: "徐上富", specialty: "", dates: "7・14・21・28", alt: "", status: "normal" },
          { doctor: "", specialty: "", dates: "", alt: "", status: "empty" }
        ]
      },
      {
        session: "上午", room: "第3診", time: "09:00 起",
        cells: [
          { doctor: "張忠孝", specialty: "", dates: "3・10・17・24・31", alt: "", status: "normal" },
          { doctor: "張忠孝", specialty: "", dates: "4・11・18・25", alt: "", status: "normal" },
          { doctor: "簡林楨", specialty: "", dates: "5・12・19・26", alt: "", status: "normal" },
          { doctor: "張忠孝", specialty: "", dates: "6・13・20・27", alt: "", status: "normal" },
          { doctor: "蘇立芳", specialty: "", dates: "7・14・21・28", alt: "", status: "normal" },
          { doctor: "許和宏", specialty: "", dates: "1・8・15・22・29", alt: "", status: "normal" }
        ]
      },
      {
        session: "下午", room: "第2診", time: "13:30 起",
        cells: [
          { doctor: "", specialty: "", dates: "", alt: "", status: "empty" },
          { doctor: "賈文君", specialty: "家醫科", dates: "4・11・18・25", alt: "", status: "normal" },
          { doctor: "", specialty: "", dates: "", alt: "", status: "empty" },
          { doctor: "", specialty: "", dates: "", alt: "", status: "empty" },
          { doctor: "賈文君", specialty: "家醫科", dates: "7・14・21・28", alt: "", status: "normal" },
          { doctor: "休診", specialty: "", dates: "", alt: "", status: "closed" }
        ]
      },
      {
        session: "下午", room: "第3診", time: "13:30 起",
        cells: [
          { doctor: "蘇立芳", specialty: "", dates: "3・10・17・31", alt: "24 許和宏代診", status: "substitute" },
          { doctor: "許和宏", specialty: "", dates: "4・11・18・25", alt: "", status: "normal" },
          { doctor: "羅嬌芳", specialty: "", dates: "5・12・19・26", alt: "", status: "normal" },
          { doctor: "藍龍雄", specialty: "", dates: "6・13・20・27", alt: "", status: "normal" },
          { doctor: "蘇立芳", specialty: "", dates: "14・28", alt: "7・21 許和宏代診", status: "substitute" },
          { doctor: "休診", specialty: "", dates: "", alt: "", status: "closed" }
        ]
      }
    ],
    morningClinic: "上午門診 09:00 起",
    afternoonClinic: "下午門診 13:30 起",
    morningRegistration: "08:30–11:30",
    afternoonRegistration: "13:00–16:30",
    address: "臺北市大同區民權西路104號2樓",
    primaryPhone: "(02) 2557-7221",
    otherPhones: "2557-5507・2557-2392",
    website: "www.tb.org.tw",
    closureNote: "週六下午、週日及例假日休診｜颱風天災依臺北市政府停班公告休診"
  };

  let state = loadState();
  let toastTimer = null;

  const $ = (selector) => document.querySelector(selector);
  const basicFields = $("#basic-fields");
  const alertFields = $("#alert-fields");
  const scheduleFields = $("#schedule-fields");
  const serviceFields = $("#service-fields");
  const poster = $("#poster");

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return clone(defaultData);
      return mergeState(clone(defaultData), JSON.parse(saved));
    } catch (error) {
      return clone(defaultData);
    }
  }

  function mergeState(base, incoming) {
    if (!incoming || typeof incoming !== "object") return base;
    Object.keys(base).forEach((key) => {
      if (!(key in incoming)) return;
      if (Array.isArray(base[key])) {
        base[key] = incoming[key];
      } else if (base[key] && typeof base[key] === "object") {
        base[key] = mergeState(base[key], incoming[key]);
      } else {
        base[key] = incoming[key];
      }
    });
    return base;
  }

  function getPath(path) {
    return path.split(".").reduce((value, key) => value?.[key], state);
  }

  function formatChangeDate(value) {
    return window.TimetableDateLogic.formatChangeDate(state, value);
  }

  function autoPopulateDates() {
    return window.TimetableDateLogic.autoPopulateDates(state);
  }

  function setPath(path, value) {
    const keys = path.split(".");
    let cursor = state;
    keys.slice(0, -1).forEach((key) => { cursor = cursor[key]; });
    cursor[keys[keys.length - 1]] = value;
    if (path === "year" || path === "month" || path.startsWith("changes.") || /\.doctor$/.test(path)) {
      autoPopulateDates();
    }
    persist();
    renderPoster();
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const saveState = $("#save-state");
    saveState.textContent = "儲存中…";
    window.clearTimeout(persist.timer);
    persist.timer = window.setTimeout(() => { saveState.textContent = "已自動儲存"; }, 350);
  }

  function field(label, path, options = {}) {
    const wrap = document.createElement("label");
    wrap.className = `field${options.full ? " field-full" : ""}`;
    const caption = document.createElement("span");
    caption.textContent = label;
    wrap.appendChild(caption);

    let control;
    if (options.type === "textarea") {
      control = document.createElement("textarea");
    } else if (options.type === "select") {
      control = document.createElement("select");
      options.choices.forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        control.appendChild(option);
      });
    } else {
      control = document.createElement("input");
      control.type = options.type || "text";
    }
    control.value = getPath(path) ?? "";
    control.placeholder = options.placeholder || "";
    control.addEventListener("input", (event) => setPath(path, event.target.value));
    wrap.appendChild(control);
    return wrap;
  }

  function buildAlertEditors() {
    alertFields.replaceChildren();

    if (!state.changes.length) {
      const empty = document.createElement("p");
      empty.className = "empty-changes";
      empty.textContent = "目前沒有異動，海報會顯示「本月無異動」。";
      alertFields.appendChild(empty);
    }

    state.changes.forEach((change, index) => {
      const card = document.createElement("div");
      card.className = "change-editor";
      const head = document.createElement("div");
      head.className = "change-editor-head";
      const title = document.createElement("strong");
      title.textContent = `異動 ${index + 1}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.textContent = "移除";
      remove.setAttribute("aria-label", `移除異動 ${index + 1}`);
      remove.addEventListener("click", () => {
        state.changes.splice(index, 1);
        autoPopulateDates();
        persist();
        buildAlertEditors();
        renderPoster();
      });
      head.append(title, remove);

      const grid = document.createElement("div");
      grid.className = "change-editor-grid";
      const base = `changes.${index}`;
      grid.append(
        field("日期（如 8/7）", `${base}.date`),
        field("時段", `${base}.session`, {
          type: "select",
          choices: [["上午", "上午"], ["下午", "下午"]]
        }),
        field("診室", `${base}.room`, {
          type: "select",
          choices: [["第2診", "第2診"], ["第3診", "第3診"]]
        }),
        field("原看診醫師", `${base}.originalDoctor`),
        field("代診醫師／內容", `${base}.substituteDoctor`),
        field("異動類型", `${base}.kind`, {
          type: "select",
          full: true,
          choices: [["substitute", "代診"], ["closed", "休診"], ["notice", "其他異動"]]
        })
      );
      card.append(head, grid);
      alertFields.appendChild(card);
    });

    if (state.changes.length < 6) {
      const add = document.createElement("button");
      add.type = "button";
      add.className = "add-change-button";
      add.textContent = state.changes.length ? "＋ 新增一筆異動" : "＋ 新增異動";
      add.addEventListener("click", () => {
        state.changes.push({
          date: "", session: "上午", room: "第2診", originalDoctor: "", substituteDoctor: "", kind: "substitute"
        });
        autoPopulateDates();
        persist();
        buildAlertEditors();
        renderPoster();
      });
      alertFields.appendChild(add);
    }
  }

  function buildEditors() {
    basicFields.replaceChildren(
      field("民國年", "year"),
      field("月份", "month"),
      field("機構名稱", "clinic", { full: true }),
      field("經營單位", "operator", { full: true }),
      field("更新日期", "updateDate", { full: true })
    );
    const dateNote = document.createElement("p");
    dateNote.className = "auto-date-note";
    dateNote.textContent = "日期會依民國年與月份自動建立；若異動資料的診次、原醫師吻合，該日會自動從原門診日期中扣除。";
    const recalculate = document.createElement("button");
    recalculate.type = "button";
    recalculate.className = "auto-date-button";
    recalculate.textContent = "↻ 依年月重新計算日期";
    recalculate.addEventListener("click", () => {
      if (!autoPopulateDates()) {
        showToast("請先輸入有效的民國年與月份");
        return;
      }
      persist();
      renderPoster();
      showToast("日期與異動已重新計算");
    });
    basicFields.append(dateNote, recalculate);

    buildAlertEditors();

    scheduleFields.replaceChildren();
    state.rows.forEach((row, rowIndex) => {
      const rowDetails = document.createElement("details");
      rowDetails.className = "schedule-row";
      if (rowIndex === 0) rowDetails.open = true;
      const summary = document.createElement("summary");
      summary.textContent = `${row.session} ${row.room}｜${row.time}`;
      const cells = document.createElement("div");
      cells.className = "schedule-cells";

      row.cells.forEach((cell, dayIndex) => {
        const box = document.createElement("div");
        box.className = "cell-editor";
        const title = document.createElement("h4");
        title.textContent = days[dayIndex];
        const grid = document.createElement("div");
        grid.className = "cell-editor-grid";
        const base = `rows.${rowIndex}.cells.${dayIndex}`;
        grid.append(
          field("醫師／休診", `${base}.doctor`),
          field("狀態", `${base}.status`, {
            type: "select",
            choices: [["normal", "正常"], ["substitute", "含代診"], ["empty", "無門診"], ["closed", "休診"]]
          }),
          field("專科", `${base}.specialty`, { full: true })
        );
        box.append(title, grid);
        cells.appendChild(box);
      });
      rowDetails.append(summary, cells);
      scheduleFields.appendChild(rowDetails);
    });

    serviceFields.replaceChildren(
      field("上午門診", "morningClinic", { full: true }),
      field("下午門診", "afternoonClinic", { full: true }),
      field("上午掛號", "morningRegistration"),
      field("下午掛號", "afternoonRegistration"),
      field("地址", "address", { full: true }),
      field("主要電話", "primaryPhone"),
      field("其他電話", "otherPhones"),
      field("網站", "website", { full: true }),
      field("休診說明", "closureNote", { type: "textarea", full: true })
    );
  }

  function svgEl(tag, attrs = {}, text = "") {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([name, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(name, value);
    });
    if (text !== "") node.textContent = text;
    return node;
  }

  function addText(parent, text, x, y, options = {}) {
    const node = svgEl("text", {
      x, y,
      fill: options.fill || "#073f58",
      "font-size": options.size || 42,
      "font-weight": options.weight || 600,
      "text-anchor": options.anchor || "start",
      "letter-spacing": options.spacing || 0,
      opacity: options.opacity ?? 1
    }, text);
    parent.appendChild(node);
    return node;
  }

  function fitTextSize(text, preferredSize, maxWidth, minimumSize = 24) {
    const units = Array.from(String(text || "")).reduce((total, character) => {
      return total + (/^[\x00-\x7F]$/.test(character) ? 0.58 : 1);
    }, 0);
    if (!units) return preferredSize;
    return Math.max(minimumSize, Math.min(preferredSize, Math.floor((maxWidth / units) * .94)));
  }

  function addRect(parent, x, y, width, height, fill, radius = 0, extra = {}) {
    const node = svgEl("rect", { x, y, width, height, rx: radius, fill, ...extra });
    parent.appendChild(node);
    return node;
  }

  function drawCell(group, cell, x, y, width, height, rowIndex) {
    const afternoon = rowIndex >= 2;
    const baseFill = afternoon ? "#f3f7f4" : "#f5f9fa";
    const scale = height / 250;
    const inset = 8;
    addRect(group, x + inset, y + inset, width - inset * 2, height - inset * 2, baseFill, 18);

    if (cell.status === "closed") {
      addRect(group, x + 58, y + 69 * scale, width - 116, 104 * scale, "#ece9e6", 52 * scale);
      addText(group, cell.doctor || "休診", x + width / 2, y + 139 * scale, {
        size: 54 * scale, weight: 850, anchor: "middle", fill: "#93452f", spacing: 4
      });
      return;
    }

    if (cell.status === "empty") {
      addText(group, "—", x + width / 2, y + 142 * scale, {
        size: 60 * scale, weight: 500, anchor: "middle", fill: "#a7b5b9"
      });
      return;
    }

    const hasSpecialty = Boolean(cell.specialty);
    const hasAlt = Boolean(cell.alt);
    const nameY = y + (hasAlt ? 73 : 88) * scale;
    addText(group, cell.doctor || "未填", x + width / 2, nameY, {
      size: 70 * scale, weight: 850, anchor: "middle", fill: "#073f58", spacing: 2
    });

    if (hasSpecialty) {
      const badgeWidth = Math.max(128, cell.specialty.length * 39 + 48);
      addRect(group, x + (width - badgeWidth) / 2, y + 104 * scale, badgeWidth, 52 * scale, "#d9ecee", 26 * scale);
      addText(group, cell.specialty, x + width / 2, y + 141 * scale, {
        size: 31 * scale, weight: 800, anchor: "middle", fill: "#176778", spacing: 2
      });
    }

    if (cell.dates) {
      addText(group, cell.dates, x + width / 2, y + (hasAlt ? 145 : 190) * scale, {
        size: 38 * scale, weight: 650, anchor: "middle", fill: "#58727b", spacing: 1
      });
    }

    if (hasAlt) {
      addRect(group, x + 28, y + 172 * scale, width - 56, 54 * scale, "#f5dcd0", 27 * scale);
      addText(group, cell.alt, x + width / 2, y + 210 * scale, {
        size: 31 * scale, weight: 850, anchor: "middle", fill: "#a4462c"
      });
    }
  }

  function renderPoster() {
    poster.replaceChildren();
    poster.setAttribute("xmlns", SVG_NS);
    poster.setAttribute("width", "3300");
    poster.setAttribute("height", "2400");
    poster.setAttribute("style", "font-family:'Noto Sans TC','Microsoft JhengHei','PingFang TC',sans-serif");

    const defs = svgEl("defs");
    const shadow = svgEl("filter", { id: "cardShadow", x: "-20%", y: "-20%", width: "140%", height: "160%" });
    shadow.append(
      svgEl("feDropShadow", { dx: 0, dy: 18, stdDeviation: 24, "flood-color": "#063f58", "flood-opacity": .14 })
    );
    const headerGradient = svgEl("linearGradient", { id: "headerGradient", x1: 0, y1: 0, x2: 1, y2: 0 });
    headerGradient.append(
      svgEl("stop", { offset: "0%", "stop-color": "#073f58" }),
      svgEl("stop", { offset: "100%", "stop-color": "#0b6078" })
    );
    const alertGradient = svgEl("linearGradient", { id: "alertGradient", x1: 0, y1: 0, x2: 1, y2: 0 });
    alertGradient.append(
      svgEl("stop", { offset: "0%", "stop-color": "#fff8f4" }),
      svgEl("stop", { offset: "100%", "stop-color": "#f8ebe5" })
    );
    defs.append(shadow, headerGradient, alertGradient);
    poster.appendChild(defs);

    addRect(poster, 0, 0, 3300, 2400, "#e7f0f2");
    addRect(poster, 82, 82, 3136, 2236, "rgba(255,255,255,.83)", 44, { filter: "url(#cardShadow)" });
    addRect(poster, 82, 82, 24, 2236, "#0a5871", 12);

    const header = svgEl("g");
    addRect(header, 150, 110, 3000, 280, "url(#headerGradient)", 44, { filter: "url(#cardShadow)" });
    addRect(header, 150, 110, 22, 280, "#e47b57", 11);
    addText(header, state.clinic, 220, 177, {
      size: fitTextSize(state.clinic, 35, 1480, 28), weight: 780, fill: "#c8e2e7", spacing: 2
    });
    addRect(header, 220, 202, 430, 6, "#e47b57", 3);
    addText(header, "門診時刻表", 215, 336, { size: 118, weight: 900, fill: "#ffffff", spacing: 8 });

    addRect(header, 1848, 145, 4, 210, "rgba(255,255,255,.2)", 2);
    addText(header, "委託經營", 1910, 178, { size: 25, weight: 800, fill: "#91c2cc", spacing: 4 });
    addText(header, state.operator, 1910, 226, {
      size: fitTextSize(state.operator, 36, 610, 28), weight: 760, fill: "#ffffff", spacing: 1
    });
    addText(header, "資料更新", 1910, 288, { size: 25, weight: 800, fill: "#91c2cc", spacing: 4 });
    addText(header, state.updateDate, 1910, 337, {
      size: fitTextSize(state.updateDate, 35, 430, 27), weight: 760, fill: "#ffffff"
    });

    addRect(header, 2482, 153, 180, 180, "rgba(255,255,255,.09)", 90);
    if (window.ORNAMENT_ASSETS?.calendar) {
      header.appendChild(svgEl("image", {
        href: window.ORNAMENT_ASSETS.calendar,
        x: 2497, y: 166, width: 150, height: 150,
        preserveAspectRatio: "xMidYMid meet"
      }));
    }
    addRect(header, 2700, 132, 415, 236, "#fff8ef", 34);
    addRect(header, 2700, 132, 415, 12, "#e47b57", 6);
    addText(header, `民國 ${state.year} 年`, 2907, 185, {
      size: 31, weight: 800, anchor: "middle", fill: "#55727a", spacing: 3
    });
    addText(header, String(state.month).padStart(2, "0"), 2878, 326, {
      size: 142, weight: 900, anchor: "middle", fill: "#073f58", spacing: -3
    });
    addText(header, "月", 3032, 316, { size: 52, weight: 900, fill: "#c65f3e" });
    poster.appendChild(header);

    const activeChanges = (state.changes || []).filter((change) =>
      change.date || change.session || change.room || change.originalDoctor || change.substituteDoctor
    ).slice(0, 6);
    const changeLayout = window.TimetableLayoutLogic.getChangeLayout(activeChanges.length);
    const stackedChanges = changeLayout.stacked;
    const alertY = 430;
    const alertHeight = changeLayout.alertHeight;
    const alert = svgEl("g");
    addRect(alert, 150, alertY, 3000, alertHeight, "url(#alertGradient)", 36, {
      stroke: "#efd5c9", "stroke-width": 3
    });
    addRect(alert, 150, alertY, 270, alertHeight, "#a84b34", 36);
    addRect(alert, 386, alertY, 34, alertHeight, "#a84b34");
    const labelCenterY = alertY + alertHeight / 2;
    if (window.ORNAMENT_ASSETS?.announcement) {
      alert.appendChild(svgEl("image", {
        href: window.ORNAMENT_ASSETS.announcement,
        x: 178, y: labelCenterY - 89, width: 92, height: 92,
        preserveAspectRatio: "xMidYMid meet"
      }));
    }
    addText(alert, "門診", 332, labelCenterY - 23, { size: 29, weight: 800, anchor: "middle", fill: "#f7d6c8", spacing: 3 });
    addText(alert, "異動", 332, labelCenterY + 30, { size: 43, weight: 900, anchor: "middle", fill: "#ffffff", spacing: 4 });
    if (activeChanges.length) {
      addText(alert, `共 ${activeChanges.length} 筆`, 332, labelCenterY + 76, {
        size: 25, weight: 760, anchor: "middle", fill: "#f7d6c8", spacing: 2
      });
    }

    if (!activeChanges.length) {
      addText(alert, "本月無門診異動", 490, alertY + 88, { size: 54, weight: 900, fill: "#8e3f29", spacing: 2 });
      addText(alert, "請依下方固定門診表正常看診", 490, alertY + 157, { size: 39, weight: 720, fill: "#68554d" });
    } else {
      const rows = changeLayout.rows;
      const columns = changeLayout.columns;
      const areaX = 450;
      const areaWidth = 2670;
      const gapX = 20;
      const gapY = 18;
      const areaY = alertY + 24;
      const areaHeight = alertHeight - 48;
      const cardWidth = (areaWidth - gapX * (columns - 1)) / columns;
      const cardHeight = (areaHeight - gapY * (rows - 1)) / rows;
      activeChanges.forEach((change, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const itemsInRow = Math.min(columns, activeChanges.length - row * columns);
        const rowOffset = (columns - itemsInRow) * (cardWidth + gapX) / 2;
        const x = areaX + rowOffset + column * (cardWidth + gapX);
        const y = areaY + row * (cardHeight + gapY);
        const accent = change.kind === "closed" ? "#a43e31" : change.kind === "notice" ? "#b87928" : "#cf6847";
        addRect(alert, x, y, cardWidth, cardHeight, "rgba(255,255,255,.96)", 22, {
          stroke: "#ead8cf", "stroke-width": 3
        });
        addRect(alert, x, y, cardWidth, 8, accent, 4);
        addRect(alert, x + 20, y + 22, 190, 48, accent, 24);
        addText(alert, formatChangeDate(change.date), x + 115, y + 57, {
          size: 29, weight: 900, anchor: "middle", fill: "#ffffff", spacing: 1
        });
        const sessionRoom = `${change.session || "時段"}・${change.room || "診室"}`;
        addText(alert, sessionRoom, x + cardWidth - 24, y + 58, {
          size: fitTextSize(sessionRoom, 29, cardWidth - 250, 23), weight: 780, anchor: "end", fill: "#79655c"
        });

        let detail;
        if (change.kind === "closed") {
          detail = `${change.originalDoctor || "原看診醫師"}｜休診`;
        } else if (change.kind === "notice") {
          detail = `${change.originalDoctor || "異動"}｜${change.substituteDoctor || "內容未填"}`;
        } else {
          detail = `${change.originalDoctor || "原醫師"} → ${change.substituteDoctor || "代診醫師"}代診`;
        }
        addText(alert, detail, x + 24, y + cardHeight - 25, {
          size: fitTextSize(detail, 40, cardWidth - 48, 27), weight: 850, fill: "#403a37"
        });
      });
    }
    poster.appendChild(alert);

    const grid = svgEl("g");
    const gridX = 150;
    const gridY = changeLayout.gridY;
    const labelWidth = 390;
    const dayWidth = 435;
    const headerHeight = changeLayout.tableHeaderHeight;
    const rowHeight = changeLayout.tableRowHeight;

    addRect(grid, gridX, gridY, 3000, headerHeight + rowHeight * 4, "#ffffff", 30, { filter: "url(#cardShadow)" });
    addRect(grid, gridX, gridY, 3000, headerHeight, "#073f58", 30);
    addRect(grid, gridX, gridY + headerHeight / 2, 3000, headerHeight / 2, "#073f58");
    addText(grid, "時段／診室", gridX + labelWidth / 2, gridY + headerHeight * .64, { size: 43, weight: 850, anchor: "middle", fill: "#d5edf0", spacing: 2 });
    days.forEach((day, index) => {
      const x = gridX + labelWidth + dayWidth * index;
      if (index > 0) addRect(grid, x, gridY + 30, 3, headerHeight - 60, "rgba(255,255,255,.2)");
      addText(grid, day, x + dayWidth / 2, gridY + headerHeight * .64, { size: 49, weight: 850, anchor: "middle", fill: "#ffffff", spacing: 2 });
    });

    state.rows.forEach((row, rowIndex) => {
      const y = gridY + headerHeight + rowHeight * rowIndex;
      const afternoon = rowIndex >= 2;
      const labelFill = afternoon ? "#deeee7" : "#dcecf1";
      addRect(grid, gridX + 8, y + 8, labelWidth - 16, rowHeight - 16, labelFill, 18);
      const rowScale = rowHeight / 250;
      addText(grid, row.session, gridX + 78, y + 75 * rowScale, { size: 37 * rowScale, weight: 850, fill: afternoon ? "#2b6d5e" : "#166078", spacing: 4 });
      addText(grid, row.room, gridX + 74, y + 163 * rowScale, { size: 72 * rowScale, weight: 900, fill: "#073f58", spacing: 2 });
      row.cells.forEach((cell, dayIndex) => {
        drawCell(grid, cell, gridX + labelWidth + dayWidth * dayIndex, y, dayWidth, rowHeight, rowIndex);
      });
    });
    poster.appendChild(grid);

    const footer = svgEl("g");
    const footerY = 1870;
    const gap = 26;
    const widths = [810, 810, 1328];
    let fx = 150;
    widths.forEach((width) => {
      addRect(footer, fx, footerY, width, 340, "rgba(255,255,255,.94)", 28, { stroke: "#d3e2e5", "stroke-width": 3 });
      fx += width + gap;
    });

    addText(footer, "門診時間", 205, footerY + 62, { size: 34, weight: 900, fill: "#2a7888", spacing: 4 });
    addText(footer, state.morningClinic, 205, footerY + 148, { size: 45, weight: 850, fill: "#073f58" });
    addText(footer, state.afternoonClinic, 205, footerY + 231, { size: 45, weight: 850, fill: "#073f58" });

    const regX = 150 + widths[0] + gap;
    addText(footer, "現場掛號", regX + 55, footerY + 62, { size: 34, weight: 900, fill: "#2a7888", spacing: 4 });
    addText(footer, `上午 ${state.morningRegistration}`, regX + 55, footerY + 148, { size: 45, weight: 850, fill: "#073f58" });
    addText(footer, `下午 ${state.afternoonRegistration}`, regX + 55, footerY + 231, { size: 45, weight: 850, fill: "#073f58" });

    const contactX = regX + widths[1] + gap;
    addText(footer, "聯絡資訊", contactX + 45, footerY + 55, { size: 31, weight: 900, fill: "#2a7888", spacing: 4 });
    addText(footer, state.primaryPhone, contactX + 45, footerY + 116, { size: 47, weight: 900, fill: "#073f58" });
    addText(footer, state.otherPhones, contactX + 45, footerY + 159, { size: 27, weight: 650, fill: "#60777f" });
    addText(footer, state.address, contactX + 45, footerY + 213, { size: 29, weight: 720, fill: "#3f5b64" });
    addText(footer, state.website, contactX + 45, footerY + 255, { size: 27, weight: 650, fill: "#71868d", spacing: 1 });

    const qrSize = 250;
    const qrY = footerY + 25;
    const mapQrX = contactX + 770;
    const facebookQrX = contactX + 1040;
    if (window.QR_ASSETS?.googleMaps) {
      addRect(footer, mapQrX - 8, qrY - 8, qrSize + 16, qrSize + 16, "#ffffff", 18, { stroke: "#d9e4e6", "stroke-width": 2 });
      footer.appendChild(svgEl("image", { href: window.QR_ASSETS.googleMaps, x: mapQrX, y: qrY, width: qrSize, height: qrSize }));
      addText(footer, "Google 地標", mapQrX + qrSize / 2, footerY + 313, { size: 27, weight: 850, anchor: "middle", fill: "#176778" });
    }
    if (window.QR_ASSETS?.facebook) {
      addRect(footer, facebookQrX - 8, qrY - 8, qrSize + 16, qrSize + 16, "#ffffff", 18, { stroke: "#d9e4e6", "stroke-width": 2 });
      footer.appendChild(svgEl("image", { href: window.QR_ASSETS.facebook, x: facebookQrX, y: qrY, width: qrSize, height: qrSize }));
      addText(footer, "Facebook", facebookQrX + qrSize / 2, footerY + 313, { size: 27, weight: 850, anchor: "middle", fill: "#176778" });
    }
    poster.appendChild(footer);

    addText(poster, state.closureNote, 150, 2287, { size: 35, weight: 750, fill: "#566e76", spacing: 1 });
    addRect(poster, 2946, 2260, 204, 50, "#073f58", 25);
    addText(poster, "資訊確認", 3048, 2295, { size: 27, weight: 850, anchor: "middle", fill: "#ffffff", spacing: 3 });
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2400);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportPng(width, height) {
    renderPoster();
    const cloneSvg = poster.cloneNode(true);
    cloneSvg.setAttribute("width", "3300");
    cloneSvg.setAttribute("height", "2400");
    cloneSvg.setAttribute("xmlns", SVG_NS);
    const serialized = new XMLSerializer().serializeToString(cloneSvg);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
    const month = String(state.month).padStart(2, "0");
    downloadBlob(blob, `${state.year}${month}_門診時刻表_${width}x${height}.png`);
    showToast(`已輸出 ${width}×${height} PNG`);
  }

  $("#export-small").addEventListener("click", () => exportPng(825, 600).catch(() => showToast("匯出失敗，請改用 Chrome 或 Edge 開啟")));
  $("#export-large").addEventListener("click", () => exportPng(3300, 2400).catch(() => showToast("匯出失敗，請改用 Chrome 或 Edge 開啟")));

  $("#download-json").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" });
    const month = String(state.month).padStart(2, "0");
    downloadBlob(blob, `${state.year}${month}_門診資料.json`);
    showToast("資料備份已下載");
  });

  $("#import-json").addEventListener("click", () => $("#json-file").click());
  $("#json-file").addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      const incoming = JSON.parse(await file.text());
      state = mergeState(clone(defaultData), incoming);
      autoPopulateDates();
      persist();
      buildEditors();
      renderPoster();
      showToast("資料已匯入");
    } catch (error) {
      showToast("JSON格式無法讀取");
    }
    event.target.value = "";
  });

  $("#reset-data").addEventListener("click", () => {
    if (!window.confirm("要清除目前編輯內容並還原115年8月範例嗎？")) return;
    state = clone(defaultData);
    autoPopulateDates();
    persist();
    buildEditors();
    renderPoster();
    showToast("已還原範例資料");
  });

  autoPopulateDates();
  buildEditors();
  renderPoster();
})();

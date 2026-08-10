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

  const MAX_CHANGES = window.TimetableLayoutLogic.MAX_CHANGES;

  let state = loadState();
  let toastTimer = null;
  let renderTimer = null;
  let calendarWarning = null;

  const $ = (selector) => document.querySelector(selector);
  const basicFields = $("#basic-fields");
  const alertFields = $("#alert-fields");
  const scheduleFields = $("#schedule-fields");
  const serviceFields = $("#service-fields");
  const poster = $("#poster");

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // 唯一的資料入口驗證：localStorage、檔案匯入、雲端載入都走這裡，
  // 格式不符的資料一律擋在 state 之外，避免整個編輯器被壞掉的備份卡死。
  function describeProblem(incoming) {
    return window.TimetableStateLogic.describeProblem(incoming, defaultData.rows.length, days.length);
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return clone(defaultData);
      const parsed = JSON.parse(saved);
      if (describeProblem(parsed)) return clone(defaultData);
      return mergeState(clone(defaultData), parsed);
    } catch (error) {
      return clone(defaultData);
    }
  }

  // 回傳是否有異動被截斷，讓呼叫端可以提醒使用者。
  function applyState(incoming) {
    state = mergeState(clone(defaultData), incoming);
    const truncated = state.changes.length > MAX_CHANGES;
    if (truncated) state.changes = state.changes.slice(0, MAX_CHANGES);
    autoPopulateDates();
    persist();
    buildEditors();
    renderPoster();
    return truncated;
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
    scheduleRender();
  }

  // 每次按鍵都重畫整張海報（約 250 個 SVG 節點）在診間電腦上會頓，先合併再畫。
  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderPoster, 80);
  }

  function flushRender() {
    window.clearTimeout(renderTimer);
    renderPoster();
  }

  function persist() {
    const saveState = $("#save-state");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      saveState.textContent = "無法自動儲存，請按「備份資料」";
      return;
    }
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
      if (options.min !== undefined) control.min = options.min;
      if (options.max !== undefined) control.max = options.max;
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
        flushRender();
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

    if (state.changes.length < MAX_CHANGES) {
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
        flushRender();
      });
      alertFields.appendChild(add);
    } else {
      const limit = document.createElement("p");
      limit.className = "empty-changes";
      limit.textContent = `海報版面最多容納 ${MAX_CHANGES} 筆異動，若還有其他異動請寫進「休診說明」。`;
      alertFields.appendChild(limit);
    }
  }

  function buildEditors() {
    basicFields.replaceChildren(
      field("民國年", "year", { type: "number", min: 100, max: 200 }),
      field("月份", "month", {
        type: "select",
        choices: Array.from({ length: 12 }, (unused, index) => [String(index + 1), `${index + 1} 月`])
      }),
      field("機構名稱", "clinic", { full: true }),
      field("經營單位", "operator", { full: true }),
      field("更新日期", "updateDate", { full: true })
    );
    const dateNote = document.createElement("p");
    dateNote.className = "auto-date-note";
    dateNote.textContent = "日期會依民國年與月份自動建立；若異動資料的診次、原醫師吻合，該日會自動從原門診日期中扣除。";
    calendarWarning = document.createElement("p");
    calendarWarning.className = "calendar-warning";
    calendarWarning.textContent = "民國年無效，日期已停止自動更新，海報上的月份與日期不會是正確的。";
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
      flushRender();
      showToast("日期與異動已重新計算");
    });
    basicFields.append(dateNote, calendarWarning, recalculate);

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
    const fitted = Math.floor((maxWidth / units) * .94);
    // maxWidth 是硬約束、minimumSize 只是可讀性偏好：字太多時寧可縮到下限以下，
    // 也不能溢出去蓋到隔壁元素（原本 Math.max(minimumSize, ...) 會讓長字串撐破 maxWidth）。
    if (fitted < minimumSize) return Math.max(fitted, 1);
    return Math.min(preferredSize, fitted);
  }

  function getClinicIdentity(value) {
    const clinic = String(value || "").trim();
    const primaryName = "第一胸腔病防治所";
    if (clinic.endsWith(primaryName)) {
      return {
        organization: clinic.slice(0, -primaryName.length).trim(),
        primaryName
      };
    }
    return { organization: "門診服務資訊", primaryName: clinic || "門診時刻表" };
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
    const layout = window.TimetableLayoutLogic.getCellLayout(hasSpecialty, hasAlt);
    // 格寬固定、格高會依異動筆數縮放，所以先換算回未縮放空間再套 fitTextSize。
    const fitInCell = (text, preferred, maxWidth, minimum) =>
      fitTextSize(text, preferred, maxWidth / scale, minimum) * scale;

    addText(group, cell.doctor || "未填", x + width / 2, y + layout.nameY * scale, {
      size: fitInCell(cell.doctor || "未填", layout.nameSize, width - 40, 34),
      weight: 850, anchor: "middle", fill: "#073f58", spacing: 2
    });

    if (hasSpecialty) {
      const specialtySize = fitInCell(cell.specialty, layout.specialtySize, width - 120, 20);
      const badgeWidth = Math.min(width - 40, Math.max(128, cell.specialty.length * specialtySize * 1.26 + 48));
      addRect(group, x + (width - badgeWidth) / 2, y + layout.specialtyY * scale, badgeWidth,
        layout.specialtyHeight * scale, "#d9ecee", (layout.specialtyHeight / 2) * scale);
      addText(group, cell.specialty, x + width / 2, y + layout.specialtyTextY * scale, {
        size: specialtySize, weight: 800, anchor: "middle", fill: "#176778", spacing: 2
      });
    }

    if (cell.dates) {
      addText(group, cell.dates, x + width / 2, y + layout.datesY * scale, {
        size: fitInCell(cell.dates, layout.datesSize, width - 56, 22),
        weight: 650, anchor: "middle", fill: "#58727b", spacing: 1
      });
    }

    if (hasAlt) {
      addRect(group, x + 28, y + layout.altY * scale, width - 56, layout.altHeight * scale,
        "#f5dcd0", (layout.altHeight / 2) * scale);
      addText(group, cell.alt, x + width / 2, y + layout.altTextY * scale, {
        size: fitInCell(cell.alt, layout.altSize, width - 90, 18),
        weight: 850, anchor: "middle", fill: "#a4462c"
      });
    }
  }

  function renderPoster() {
    window.clearTimeout(renderTimer);
    if (calendarWarning) {
      calendarWarning.hidden = Boolean(window.TimetableDateLogic.getCalendar(state));
    }
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

    const clinicIdentity = getClinicIdentity(state.clinic);
    const header = svgEl("g");
    addRect(header, 150, 110, 3000, 280, "url(#headerGradient)", 44, { filter: "url(#cardShadow)" });
    addRect(header, 150, 110, 22, 280, "#e47b57", 11);
    // 標題列分三區：識別 220–1050、委託資訊 1400–2120、月份卡 2700–3115。
    // 各區 maxWidth 都收斂到「到下一區之前」的實際空間，長字串只會縮小不會跨區。
    addText(header, clinicIdentity.organization || "門診服務資訊", 220, 162, {
      size: fitTextSize(clinicIdentity.organization, 32, 1120, 25), weight: 780, fill: "#a9d2d9", spacing: 4
    });
    addText(header, clinicIdentity.primaryName, 220, 278, {
      size: fitTextSize(clinicIdentity.primaryName, 100, 1120, 52), weight: 900, fill: "#ffffff", spacing: 4
    });
    addRect(header, 220, 332, 118, 7, "#e47b57", 3.5);
    addText(header, "門診時刻表", 368, 356, { size: 56, weight: 850, fill: "#f6d7ca", spacing: 11 });

    addRect(header, 1400, 145, 4, 210, "rgba(255,255,255,.2)", 2);
    addText(header, "委託經營", 1462, 174, { size: 32, weight: 800, fill: "#91c2cc", spacing: 4 });
    addText(header, state.operator, 1462, 230, {
      size: fitTextSize(state.operator, 46, 900, 28), weight: 760, fill: "#ffffff", spacing: 1
    });
    addText(header, "資料更新", 1462, 294, { size: 32, weight: 800, fill: "#91c2cc", spacing: 4 });
    addText(header, state.updateDate, 1462, 350, {
      size: fitTextSize(state.updateDate, 44, 900, 27), weight: 760, fill: "#ffffff"
    });

    addRect(header, 2482, 153, 180, 180, "rgba(255,255,255,.15)", 90);
    if (window.ORNAMENT_ASSETS?.calendar) {
      header.appendChild(svgEl("image", {
        href: window.ORNAMENT_ASSETS.calendar,
        x: 2497, y: 166, width: 150, height: 150,
        preserveAspectRatio: "xMidYMid meet"
      }));
    }
    addRect(header, 2700, 132, 415, 236, "#fff8ef", 34);
    addRect(header, 2700, 132, 415, 12, "#e47b57", 6);
    addText(header, `民國 ${state.year} 年`, 2907, 187, {
      size: 34, weight: 800, anchor: "middle", fill: "#55727a", spacing: 3
    });
    // 「08」與「月」當成一組 lockup 對卡片中心 2907 置中，兩者共用基線 331。
    addText(header, String(state.month).padStart(2, "0"), 2867, 331, {
      size: 142, weight: 900, anchor: "middle", fill: "#073f58", spacing: -3
    });
    addText(header, "月", 2980, 331, { size: 52, weight: 900, fill: "#c65f3e" });
    poster.appendChild(header);

    const activeChanges = (state.changes || []).slice(0, MAX_CHANGES);
    const changeLayout = window.TimetableLayoutLogic.getChangeLayout(activeChanges.length);
    const stackedChanges = changeLayout.stacked;
    const alertY = 430;
    const alertHeight = changeLayout.alertHeight;
    const alert = svgEl("g");
    addRect(alert, 150, alertY, 3000, alertHeight, "url(#alertGradient)", 36, {
      stroke: "#efd5c9", "stroke-width": 3
    });
    addRect(alert, 150, alertY, 3000, 10, "#d36b4b", 5);
    addRect(alert, 182, alertY + 24, 68, 68, "#f3d8cc", 20);
    if (window.ORNAMENT_ASSETS?.announcement) {
      alert.appendChild(svgEl("image", {
        href: window.ORNAMENT_ASSETS.announcement,
        x: 191, y: alertY + 33, width: 50, height: 50,
        preserveAspectRatio: "xMidYMid meet"
      }));
    }
    addText(alert, "門診異動", 280, alertY + 76, {
      size: 52, weight: 900, fill: "#873f2c", spacing: 4
    });
    addRect(alert, 578, alertY + 30, 190, 56, "#f2d8cc", 28);
    addText(alert, activeChanges.length ? `共 ${activeChanges.length} 筆` : "本月 0 筆", 673, alertY + 70, {
      size: 29, weight: 850, anchor: "middle", fill: "#984a34", spacing: 2
    });
    // 右緣對齊下方分隔線與異動卡的 3120，原本 3090 會看起來莫名縮排。
    addText(alert, activeChanges.length ? "其餘門診依固定時刻表正常看診" : "本月門診依固定時刻表正常看診", 3120, alertY + 72, {
      size: 33, weight: 720, anchor: "end", fill: "#79665e", spacing: 1
    });
    addRect(alert, 180, alertY + 108, 2940, 3, "#ead7ce", 1.5);

    if (!activeChanges.length) {
      addText(alert, "本月無門診異動", 1650, alertY + 215, {
        size: 54, weight: 900, anchor: "middle", fill: "#8e3f29", spacing: 3
      });
      addText(alert, "請依下方固定門診表正常看診", 1650, alertY + 272, {
        size: 34, weight: 720, anchor: "middle", fill: "#75635b"
      });
    } else {
      const rows = changeLayout.rows;
      const columns = changeLayout.columns;
      const areaX = 180;
      const areaWidth = 2940;
      const gapX = 24;
      const gapY = 22;
      const areaY = alertY + 126;
      const areaHeight = alertHeight - 151;
      const cardWidth = (areaWidth - gapX * (columns - 1)) / columns;
      const cardHeight = (areaHeight - gapY * (rows - 1)) / rows;
      activeChanges.forEach((change, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const itemsInRow = Math.min(columns, activeChanges.length - row * columns);
        const rowOffset = (columns - itemsInRow) * (cardWidth + gapX) / 2;
        const x = areaX + rowOffset + column * (cardWidth + gapX);
        const y = areaY + row * (cardHeight + gapY);
        const incomplete = !change.date && !change.originalDoctor && !change.substituteDoctor;
        const accent = incomplete ? "#718c95" : change.kind === "closed" ? "#a43e31" : change.kind === "notice" ? "#b87928" : "#cf6847";
        addRect(alert, x, y, cardWidth, cardHeight, "rgba(255,255,255,.97)", 20, {
          stroke: incomplete ? "#a9bbc0" : "#ead8cf", "stroke-width": 3,
          "stroke-dasharray": incomplete ? "14 10" : undefined
        });
        addRect(alert, x, y, 8, cardHeight, accent, 4);
        addRect(alert, x + 26, y + 24, 200, 50, accent, 25);
        addText(alert, incomplete ? "待填資料" : formatChangeDate(change.date), x + 126, y + 60, {
          size: 29, weight: 900, anchor: "middle", fill: "#ffffff", spacing: 1
        });
        const sessionRoom = `${change.session || "時段"}・${change.room || "診室"}`;
        addText(alert, incomplete ? "新增異動" : sessionRoom, x + cardWidth - 28, y + 61, {
          size: fitTextSize(sessionRoom, 31, cardWidth - 275, 24), weight: 780, anchor: "end", fill: incomplete ? "#718c95" : "#79655c"
        });

        let detail;
        if (incomplete) {
          detail = "請填入日期、醫師與異動內容";
        } else if (change.kind === "closed") {
          detail = `${change.originalDoctor || "原看診醫師"}｜休診`;
        } else if (change.kind === "notice") {
          detail = `${change.originalDoctor || "異動"}｜${change.substituteDoctor || "內容未填"}`;
        } else {
          detail = `${change.originalDoctor || "原醫師"} → ${change.substituteDoctor || "代診醫師"}代診`;
        }
        addText(alert, detail, x + 28, y + cardHeight - 30, {
          size: fitTextSize(detail, 42, cardWidth - 56, 28), weight: 850, fill: incomplete ? "#647b83" : "#403a37"
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

    // 三張卡共用同一套規格：文字內縮 55、標題 34、內容整組對卡片垂直置中。
    const cardTextInset = 55;
    const hoursWidth = 700;
    addText(footer, "門診時間", 205, footerY + 99, { size: 34, weight: 900, fill: "#2a7888", spacing: 4 });
    addText(footer, state.morningClinic, 205, footerY + 185, {
      size: fitTextSize(state.morningClinic, 45, hoursWidth, 28), weight: 850, fill: "#073f58"
    });
    addText(footer, state.afternoonClinic, 205, footerY + 268, {
      size: fitTextSize(state.afternoonClinic, 45, hoursWidth, 28), weight: 850, fill: "#073f58"
    });

    const regX = 150 + widths[0] + gap;
    const morningReg = `上午 ${state.morningRegistration}`;
    const afternoonReg = `下午 ${state.afternoonRegistration}`;
    addText(footer, "現場掛號", regX + cardTextInset, footerY + 99, { size: 34, weight: 900, fill: "#2a7888", spacing: 4 });
    addText(footer, morningReg, regX + cardTextInset, footerY + 185, {
      size: fitTextSize(morningReg, 45, hoursWidth, 28), weight: 850, fill: "#073f58"
    });
    addText(footer, afternoonReg, regX + cardTextInset, footerY + 268, {
      size: fitTextSize(afternoonReg, 45, hoursWidth, 28), weight: 850, fill: "#073f58"
    });

    const contactX = regX + widths[1] + gap;
    // 文字欄可用寬度＝到 QR 組左緣前留 40 的溝槽，地址變長只會縮小不會壓到 QR。
    const contactWidth = 606;
    addText(footer, "聯絡資訊", contactX + cardTextInset, footerY + 85, { size: 34, weight: 900, fill: "#2a7888", spacing: 4 });
    addText(footer, state.primaryPhone, contactX + cardTextInset, footerY + 146, {
      size: fitTextSize(state.primaryPhone, 47, contactWidth, 30), weight: 900, fill: "#073f58"
    });
    addText(footer, state.otherPhones, contactX + cardTextInset, footerY + 189, {
      size: fitTextSize(state.otherPhones, 27, contactWidth, 20), weight: 650, fill: "#60777f"
    });
    addText(footer, state.address, contactX + cardTextInset, footerY + 243, {
      size: fitTextSize(state.address, 29, contactWidth, 20), weight: 720, fill: "#3f5b64"
    });
    addText(footer, state.website, contactX + cardTextInset, footerY + 285, {
      size: fitTextSize(state.website, 27, contactWidth, 20), weight: 650, fill: "#71868d", spacing: 1
    });

    const qrSize = 250;
    const qrY = footerY + 25;
    // 兩張 QR 當一組靠右，框間留 40、右緣同樣內縮 55（原本兩框只差 4，看起來是黏在一起的）。
    const mapQrX = contactX + 709;
    const facebookQrX = contactX + 1015;
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

    // 基線 2275 讓這行在頁尾卡（收在 2210）與白底卡下緣（2318）之間上下各留 33。
    addText(poster, state.closureNote, 150, 2275, {
      size: fitTextSize(state.closureNote, 35, 3000, 24), weight: 750, fill: "#566e76", spacing: 1
    });
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
    flushRender();
    const cloneSvg = poster.cloneNode(true);
    // 讓瀏覽器直接以輸出尺寸描字，而不是先畫成 3300×2400 再縮小，
    // 825×600 的電視牆版文字才不會糊掉。viewBox 不動，版面比例不變。
    cloneSvg.setAttribute("width", String(width));
    cloneSvg.setAttribute("height", String(height));
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
    if (!blob) throw new Error("canvas.toBlob returned null");
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
    let incoming;
    try {
      incoming = JSON.parse(await file.text());
    } catch (error) {
      showToast("JSON格式無法讀取");
      event.target.value = "";
      return;
    }
    const problem = describeProblem(incoming);
    if (problem) {
      showToast(`${problem}，已保留目前資料`);
      event.target.value = "";
      return;
    }
    const truncated = applyState(incoming);
    showToast(truncated ? `資料已匯入，異動只保留前 ${MAX_CHANGES} 筆` : "資料已匯入");
    event.target.value = "";
  });

  const loadCloud = $("#load-cloud");
  if (location.protocol === "http:" || location.protocol === "https:") {
    loadCloud.hidden = false;
    loadCloud.addEventListener("click", async () => {
      const month = String(state.month).padStart(2, "0");
      const filename = `${state.year}${month}_門診資料.json`;
      let incoming;
      try {
        const response = await fetch(`data/${filename}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        incoming = await response.json();
      } catch (error) {
        showToast(`雲端沒有 ${state.year} 年 ${month} 月的資料（${filename}）`);
        return;
      }
      const problem = describeProblem(incoming);
      if (problem) {
        showToast(`${problem}，已保留目前資料`);
        return;
      }
      const truncated = applyState(incoming);
      showToast(truncated ? `已載入雲端資料，異動只保留前 ${MAX_CHANGES} 筆` : "已載入雲端資料");
    });
  }

  $("#reset-data").addEventListener("click", () => {
    if (!window.confirm(`要清除目前編輯內容並還原 ${defaultData.year} 年 ${defaultData.month} 月範例嗎？`)) return;
    applyState(clone(defaultData));
    showToast("已還原範例資料");
  });

  autoPopulateDates();
  buildEditors();
  renderPoster();
})();

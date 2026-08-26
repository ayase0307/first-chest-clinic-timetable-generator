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
          { doctor: "停診", specialty: "", dates: "", alt: "", status: "closed" }
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
          { doctor: "停診", specialty: "", dates: "", alt: "", status: "closed" }
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
    closureNote: "週六下午、週日及例假日停診｜颱風天災依臺北市政府停班公告停診"
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
    control.addEventListener("input", (event) => {
      setPath(path, event.target.value);
      // 有些欄位會改變同一張卡要顯示哪些欄位（例如異動類型選了節慶停診）。
      if (options.onChange) options.onChange();
    });
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
      // 節慶停診是整天全所休息，時段／診室／原看診醫師都用不到，就不要擺出來讓人填。
      const isHoliday = change.kind === "holiday";
      grid.append(
        field("日期（如 8/7）", `${base}.date`),
        ...(isHoliday ? [] : [
          field("時段", `${base}.session`, {
            type: "select",
            choices: [["上午", "上午"], ["下午", "下午"]]
          }),
          field("診室", `${base}.room`, {
            type: "select",
            choices: [["第2診", "第2診"], ["第3診", "第3診"]]
          }),
          field("原看診醫師", `${base}.originalDoctor`)
        ]),
        field(isHoliday ? "節日名稱（如 中秋節）" : "代診醫師／內容", `${base}.substituteDoctor`, {
          full: isHoliday
        }),
        field("異動類型", `${base}.kind`, {
          type: "select",
          full: true,
          onChange: buildAlertEditors,
          choices: [["substitute", "代診"], ["closed", "停診"], ["holiday", "節慶停診（全所）"], ["notice", "其他異動"]]
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
      limit.textContent = `海報版面最多容納 ${MAX_CHANGES} 筆異動，若還有其他異動請寫進「停診說明」。`;
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
          field("醫師／停診", `${base}.doctor`),
          field("狀態", `${base}.status`, {
            type: "select",
            choices: [["normal", "正常"], ["substitute", "含代診"], ["empty", "無門診"], ["closed", "停診"]]
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
      field("停診說明", "closureNote", { type: "textarea", full: true })
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

  // 海報配色：深藍主色、青綠輔色、橘色重點、髮絲線。全部走扁平＋細框，不用陰影。
  const INK = "#12475f";
  const TEAL = "#1c7c8c";
  const ORANGE = "#e8763a";
  const HAIRLINE = "#e2ecef";
  const MUTED = "#7d8f95";
  // 右上角月份卡，底邊要收在異動區（505）之上。
  const CARD = { x: 2716, y: 78, width: 470, height: 388, radius: 26 };
  // 中文字幾乎沒有下伸部，用 0.72 em 上伸、0.14 em 下伸估算字的視覺高度，
  // 拿來把同一行的元素對齊到文字中線（tests/layout-logic.test.js 用同一組數字驗疊字）。
  const ASCENT = .72;
  const DESCENT = .14;

  function addText(parent, text, x, y, options = {}) {
    const node = svgEl("text", {
      x, y,
      fill: options.fill || INK,
      "font-size": options.size || 42,
      "font-weight": options.weight || 600,
      "text-anchor": options.anchor || "start",
      "letter-spacing": options.spacing || 0,
      opacity: options.opacity ?? 1
    }, text);
    parent.appendChild(node);
    return node;
  }

  // 一個全形字算 1 個字寬單位、半形算 0.58，用來估算文字實際佔寬。
  function textUnits(text) {
    return Array.from(String(text || "")).reduce((total, character) => {
      return total + (/^[\x00-\x7F]$/.test(character) ? 0.58 : 1);
    }, 0);
  }

  function fitTextSize(text, preferredSize, maxWidth, minimumSize = 24) {
    const units = textUnits(text);
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

  // Lucide 風格的線條圖示，作者座標 24×24。
  const ICONS = {
    briefcase: [
      "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
      "M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
    ],
    calendar: [
      "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
      "M16 2v4", "M8 2v4", "M3 10h18"
    ],
    megaphone: ["M3 11l18-5v12L3 14z", "M11.6 16.8a3 3 0 1 1-5.8-1.6"],
    clock: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M12 6.5V12l3.6 2.1"],
    pin: ["M12 21.5s7-6.4 7-11.5a7 7 0 1 0-14 0c0 5.1 7 11.5 7 11.5z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
    phone: ["M21.5 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.6 4.2 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.6 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z"]
  };

  function addIcon(parent, name, cx, cy, size, color, strokeWidth = 2) {
    const group = svgEl("g", {
      transform: `translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 24})`,
      fill: "none", stroke: color, "stroke-width": strokeWidth,
      "stroke-linecap": "round", "stroke-linejoin": "round"
    });
    (ICONS[name] || []).forEach((d) => group.appendChild(svgEl("path", { d })));
    parent.appendChild(group);
  }

  function addIconBadge(parent, name, cx, cy, radius, fill = TEAL) {
    parent.appendChild(svgEl("circle", { cx, cy, r: radius, fill }));
    addIcon(parent, name, cx, cy, radius * 1.24, "#ffffff", 2.1);
  }

  // 背景的有機色塊、葉子與點陣。純裝飾，全部壓在內容底下且不進入文字區。
  function addBackdrop(parent) {
    const back = svgEl("g");
    const blob = (cx, cy, rx, ry, fill, opacity, angle) => {
      back.appendChild(svgEl("ellipse", {
        cx, cy, rx, ry, fill, opacity,
        transform: angle ? `rotate(${angle} ${cx} ${cy})` : undefined
      }));
    };
    blob(150, 236, 340, 250, "#daeef1", .75, -18);
    blob(60, 470, 210, 150, "#e7f4ef", .85, 12);
    // 肺插圖的白色氣管要有淡色色塊襯著才看得出來，這球刻意壓在插圖後面。
    blob(2820, 236, 470, 300, "#d7eaee", .7, 14);
    blob(3120, 60, 300, 210, "#e9f5f7", .8, -10);
    blob(20, 1900, 330, 400, "#e4f2f4", .8, 0);
    blob(3290, 1520, 250, 320, "#eaf4f6", .7, 0);

    const leaf = "M0 0C34-52 118-64 156-20 118 44 34 50 0 0Z";
    [[100, 240, -46, 1.05], [132, 336, 12, .82], [44, 152, -96, .7]].forEach(([x, y, angle, size]) => {
      back.appendChild(svgEl("path", {
        d: leaf, fill: "#8fb99f", opacity: .5,
        transform: `translate(${x} ${y}) rotate(${angle}) scale(${size})`
      }));
    });

    for (let column = 0; column < 4; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        back.appendChild(svgEl("circle", {
          cx: 2350 + column * 34, cy: 96 + row * 30, r: 5, fill: "#9dc7d0", opacity: .55
        }));
      }
    }
    parent.appendChild(back);
  }

  // 肺插圖用參考稿裁出來的點陣圖（tools/extract_lung.py），內嵌成 data URI，
  // 匯出 PNG 時走的是 SVG blob，外部圖檔會載不到。
  function addLungMark(parent, x, y, width) {
    if (!window.LUNG_ASSET) return;
    parent.appendChild(svgEl("image", {
      href: window.LUNG_ASSET, x, y, width, height: width * 448 / 484
    }));
  }

  function drawCell(group, cell, x, y, width, height) {
    const scale = height / 250;

    if (cell.status === "closed") {
      const pillWidth = Math.min(width - 130, 260);
      addRect(group, x + (width - pillWidth) / 2, y + 88 * scale, pillWidth, 76 * scale, "#fce7e4", 38 * scale);
      addText(group, cell.doctor || "停診", x + width / 2, y + 142 * scale, {
        size: 44 * scale, weight: 850, anchor: "middle", fill: "#c0524a", spacing: 4
      });
      return;
    }

    // 沒醫師也沒日期就是沒門診，狀態忘了改成「無門診」時不該印「未填」或殘留的代診膠囊。
    if (cell.status === "empty" || (!cell.doctor && !cell.dates)) {
      addText(group, "—", x + width / 2, y + 140 * scale, {
        size: 56 * scale, weight: 500, anchor: "middle", fill: "#9fb2b9"
      });
      return;
    }

    const hasSpecialty = Boolean(cell.specialty);
    const hasAlt = Boolean(cell.alt);
    const layout = window.TimetableLayoutLogic.getCellLayout(hasAlt);
    // 格寬固定、格高會依異動筆數縮放，所以先換算回未縮放空間再套 fitTextSize。
    const fitInCell = (text, preferred, maxWidth, minimum) =>
      fitTextSize(text, preferred, maxWidth / scale, minimum) * scale;
    const nameText = cell.doctor || "未填";
    const nameLine = width - 40;

    if (!hasSpecialty) {
      addText(group, nameText, x + width / 2, y + layout.nameY * scale, {
        size: fitInCell(nameText, layout.nameSize, nameLine, 34),
        weight: 850, anchor: "middle", fill: INK, spacing: 2
      });
    } else {
      // 專科徽章跟醫師名排同一行、整組置中，垂直方向省下來的一整層還給名字與日期。
      const specialtySize = fitInCell(cell.specialty, layout.specialtySize, nameLine / 2, 18);
      const badgeHeight = layout.specialtyHeight * scale;
      // 徽章寬度貼著文字走：左右各留一個圓角的寬度，短科別就不會被撐成一條寬色條。
      // 再長也只吃掉半行，剩下半行一定留給醫師名。
      const badgeWidth = Math.min(nameLine / 2, textUnits(cell.specialty) * (specialtySize + 2) + badgeHeight);
      const gap = 14 * scale;
      const nameSize = fitInCell(nameText, layout.nameSize, nameLine - badgeWidth - gap, 30);
      const nameWidth = textUnits(nameText) * (nameSize + 2);
      const left = x + (width - (badgeWidth + gap + nameWidth)) / 2;
      // 徽章對齊名字的視覺中線（中文幾乎沒下伸部，所以中線偏上）。
      const nameMiddle = y + layout.nameY * scale - nameSize * (ASCENT - DESCENT) / 2;

      addRect(group, left, nameMiddle - badgeHeight / 2, badgeWidth, badgeHeight, "#1a8391", badgeHeight / 2);
      addText(group, cell.specialty, left + badgeWidth / 2, nameMiddle + specialtySize * (ASCENT - DESCENT) / 2, {
        size: specialtySize, weight: 800, anchor: "middle", fill: "#ffffff", spacing: 2
      });
      addText(group, nameText, left + badgeWidth + gap, y + layout.nameY * scale, {
        size: nameSize, weight: 850, anchor: "start", fill: INK, spacing: 2
      });
    }

    if (cell.dates) {
      addText(group, cell.dates, x + width / 2, y + layout.datesY * scale, {
        // 原本的 #7c8f96 對白底只有 3.4:1，貼在牆上看不清楚；#5a7480 拉到 4.9:1
        // 過 WCAG AA，又還是比醫師名的 INK 淡，主從關係不變。
        size: fitInCell(cell.dates, layout.datesSize, width - 56, 22),
        weight: 650, anchor: "middle", fill: "#5a7480", spacing: 1
      });
    }

    if (hasAlt) {
      addRect(group, x + 28, y + layout.altY * scale, width - 56, layout.altHeight * scale,
        "#fbe1d7", (layout.altHeight / 2) * scale);
      addText(group, cell.alt, x + width / 2, y + layout.altTextY * scale, {
        size: fitInCell(cell.alt, layout.altSize, width - 84, 24),
        weight: 800, anchor: "middle", fill: "#b04a2c"
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

    const activeChanges = (state.changes || []).slice(0, MAX_CHANGES);
    const changeLayout = window.TimetableLayoutLogic.getChangeLayout(activeChanges.length);
    const gridY = changeLayout.gridY;
    const gridWidth = 3000;
    const tableHeight = changeLayout.tableHeaderHeight + changeLayout.tableRowHeight * 4;

    const defs = svgEl("defs");
    // 表格的圓角靠 clipPath 統一收邊，列底色與分隔線就不必個別處理四個角。
    const tableClip = svgEl("clipPath", { id: "tableClip" });
    tableClip.appendChild(svgEl("rect", { x: 150, y: gridY, width: gridWidth, height: tableHeight, rx: 18 }));
    // 月份卡的深色頁首靠同一招收邊，才會只圓上面兩角。
    const cardClip = svgEl("clipPath", { id: "cardClip" });
    cardClip.appendChild(svgEl("rect", {
      x: CARD.x, y: CARD.y, width: CARD.width, height: CARD.height, rx: CARD.radius
    }));
    defs.append(tableClip, cardClip);
    poster.appendChild(defs);

    addRect(poster, 0, 0, 3300, 2400, "#ffffff");
    addBackdrop(poster);

    const clinicIdentity = getClinicIdentity(state.clinic);
    const header = svgEl("g");
    // 標題列分三區：識別 288–1300、委託資訊 1500–2440、肺插圖與月份卡 2470–3180。
    addText(header, clinicIdentity.organization || "門診服務資訊", 288, 172, {
      size: fitTextSize(clinicIdentity.organization, 36, 900, 26), weight: 800, fill: TEAL, spacing: 6
    });
    const nameSize = fitTextSize(clinicIdentity.primaryName, 118, 1010, 56);
    addText(header, clinicIdentity.primaryName, 288, 338, {
      size: nameSize, weight: 900, fill: INK, spacing: 2
    });

    // 「門診時刻表」與兩側橘線是一組 lockup，對齊所名的水平中心；
    // 中線錨點補 +10 抵銷 letter-spacing 記在最後一字之後造成的左偏。
    const subtitleWidth = textUnits("門診時刻表") * 50 + 4 * 20;
    const lockupCenter = 288 + textUnits(clinicIdentity.primaryName) * nameSize / 2;
    addText(header, "門診時刻表", lockupCenter + 10, 424, {
      size: 50, weight: 850, anchor: "middle", fill: INK, spacing: 20
    });
    addRect(header, lockupCenter - subtitleWidth / 2 - 132, 400, 104, 7, ORANGE, 3.5);
    addRect(header, lockupCenter + subtitleWidth / 2 + 28, 400, 104, 7, ORANGE, 3.5);

    addRect(header, 1400, 130, 4, 308, "#d6e6ea", 2);
    addIcon(header, "briefcase", 1500, 156, 46, TEAL);
    addText(header, "委託經營", 1560, 172, { size: 34, weight: 800, fill: TEAL, spacing: 4 });
    addText(header, state.operator, 1560, 246, {
      size: fitTextSize(state.operator, 48, 860, 28), weight: 800, fill: INK, spacing: 1
    });
    addIcon(header, "calendar", 1500, 318, 46, TEAL);
    addText(header, "資料更新", 1560, 334, { size: 34, weight: 800, fill: TEAL, spacing: 4 });
    addText(header, state.updateDate, 1560, 408, {
      size: fitTextSize(state.updateDate, 46, 860, 27), weight: 800, fill: INK
    });

    addLungMark(header, 2390, 138, 380);

    // 月份卡：白底＋深青頁首（像撕頁日曆），數字左偏留出右下角的橘色「月」章。
    addRect(header, CARD.x, CARD.y, CARD.width, CARD.height, "#ffffff", CARD.radius,
      { stroke: "#b9d3d9", "stroke-width": 4 });
    const cardHead = svgEl("g", { "clip-path": "url(#cardClip)" });
    addRect(cardHead, CARD.x, CARD.y, CARD.width, 34, TEAL);
    header.appendChild(cardHead);
    addText(header, `民國 ${state.year} 年`, CARD.x + CARD.width / 2, CARD.y + 122, {
      size: 44, weight: 800, anchor: "middle", fill: TEAL, spacing: 3
    });
    addText(header, String(state.month).padStart(2, "0"), CARD.x + CARD.width / 2 - 32, CARD.y + 300, {
      size: 176, weight: 900, anchor: "middle", fill: INK, spacing: -4
    });
    header.appendChild(svgEl("circle", { cx: CARD.x + CARD.width - 78, cy: CARD.y + 286, r: 46, fill: ORANGE }));
    addText(header, "月", CARD.x + CARD.width - 78, CARD.y + 303, {
      size: 44, weight: 800, anchor: "middle", fill: "#ffffff"
    });
    poster.appendChild(header);

    const alertY = changeLayout.alertY;
    const alertHeight = changeLayout.alertHeight;
    const alert = svgEl("g");
    addRect(alert, 150, alertY, 3000, alertHeight, "#ffffff", 22, { stroke: HAIRLINE, "stroke-width": 3 });
    addIconBadge(alert, "megaphone", 232, alertY + 64, 42);
    addText(alert, "門診異動", 306, alertY + 84, { size: 52, weight: 900, fill: INK, spacing: 4 });
    addRect(alert, 590, alertY + 36, 196, 58, ORANGE, 29);
    addText(alert, activeChanges.length ? `共 ${activeChanges.length} 筆` : "本月 0 筆", 688, alertY + 77, {
      size: 31, weight: 850, anchor: "middle", fill: "#ffffff", spacing: 2
    });
    addText(alert, activeChanges.length ? "其餘門診依固定時刻表正常看診" : "本月門診依固定時刻表正常看診", 3090, alertY + 78, {
      size: 33, weight: 700, anchor: "end", fill: MUTED, spacing: 1
    });

    if (!activeChanges.length) {
      addText(alert, "本月無門診異動", 1650, alertY + 220, {
        size: 54, weight: 900, anchor: "middle", fill: INK, spacing: 3
      });
      addText(alert, "請依下方固定門診表正常看診", 1650, alertY + 278, {
        size: 34, weight: 700, anchor: "middle", fill: MUTED
      });
    } else {
      const rows = changeLayout.rows;
      const columns = changeLayout.columns;
      const areaX = 190;
      const areaWidth = 2920;
      const gapX = 24;
      const gapY = 20;
      const areaY = alertY + 118;
      const areaHeight = alertHeight - 140;
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
        const closesClinic = change.kind === "closed" || change.kind === "holiday";
        const accent = incomplete ? "#8ba3ab" : closesClinic ? "#c0524a" : change.kind === "notice" ? "#d08a2a" : ORANGE;
        addRect(alert, x, y, cardWidth, cardHeight, incomplete ? "#ffffff" : "#f4f8f9", 16, {
          stroke: incomplete ? "#c0d2d8" : undefined, "stroke-width": incomplete ? 3 : undefined,
          "stroke-dasharray": incomplete ? "14 10" : undefined
        });
        addRect(alert, x + 26, y + 22, 190, 54, accent, 27);
        addText(alert, incomplete ? "待填資料" : formatChangeDate(change.date), x + 121, y + 59, {
          size: 29, weight: 900, anchor: "middle", fill: "#ffffff", spacing: 1
        });
        const sessionRoom = change.kind === "holiday"
          ? "全日・全所"
          : `${change.session || "時段"}・${change.room || "診室"}`;
        addText(alert, incomplete ? "新增異動" : sessionRoom, x + cardWidth - 26, y + 60, {
          size: fitTextSize(sessionRoom, 31, cardWidth - 265, 24), weight: 720, anchor: "end", fill: MUTED
        });

        let detail;
        if (incomplete) {
          detail = "請填入日期、醫師與異動內容";
        } else if (change.kind === "holiday") {
          detail = `${change.substituteDoctor || "節慶假日"}｜全所停診`;
        } else if (change.kind === "closed") {
          detail = `${change.originalDoctor || "原看診醫師"}｜停診`;
        } else if (change.kind === "notice") {
          detail = `${change.originalDoctor || "異動"}｜${change.substituteDoctor || "內容未填"}`;
        } else {
          detail = `${change.originalDoctor || "原醫師"} → ${change.substituteDoctor || "代診醫師"}代診`;
        }
        addText(alert, detail, x + 26, y + cardHeight - 30, {
          size: fitTextSize(detail, 44, cardWidth - 52, 28), weight: 850, fill: incomplete ? MUTED : INK
        });
      });
    }
    poster.appendChild(alert);

    const gridX = 150;
    const labelWidth = 372;
    const dayWidth = (gridWidth - labelWidth) / 6;
    const headerHeight = changeLayout.tableHeaderHeight;
    const rowHeight = changeLayout.tableRowHeight;
    const grid = svgEl("g", { "clip-path": "url(#tableClip)" });

    addRect(grid, gridX, gridY, gridWidth, tableHeight, "#ffffff");
    addRect(grid, gridX, gridY, gridWidth, headerHeight, INK);
    addText(grid, "時段／診室", gridX + labelWidth / 2, gridY + headerHeight * .66, {
      size: 42, weight: 850, anchor: "middle", fill: "#c9e2e8", spacing: 2
    });
    days.forEach((day, index) => {
      const x = gridX + labelWidth + dayWidth * index;
      addText(grid, day, x + dayWidth / 2, gridY + headerHeight * .66, {
        size: 47, weight: 850, anchor: "middle", fill: "#ffffff", spacing: 2
      });
    });
    // 表頭欄位分隔線只在表頭裡淡淡帶過，表身則是整條髮絲線。
    for (let index = 0; index <= 6; index += 1) {
      const x = gridX + labelWidth + dayWidth * index;
      if (index < 6) addRect(grid, x, gridY + 26, 3, headerHeight - 52, "rgba(255,255,255,.22)");
      addRect(grid, index === 6 ? gridX + labelWidth : x, gridY + headerHeight, 3, tableHeight - headerHeight, HAIRLINE);
    }

    state.rows.forEach((row, rowIndex) => {
      const y = gridY + headerHeight + rowHeight * rowIndex;
      const afternoon = rowIndex >= 2;
      addRect(grid, gridX, y, labelWidth, rowHeight, afternoon ? "#e8f3ec" : "#e9f3f7");
      if (rowIndex > 0) addRect(grid, gridX, y, gridWidth, 3, HAIRLINE);
      const rowScale = rowHeight / 250;
      addText(grid, row.session, gridX + labelWidth / 2, y + 84 * rowScale, {
        size: 38 * rowScale, weight: 800, anchor: "middle", fill: afternoon ? "#2f7d68" : "#2a7488", spacing: 5
      });
      addText(grid, row.room, gridX + labelWidth / 2, y + 168 * rowScale, {
        size: 66 * rowScale, weight: 900, anchor: "middle", fill: INK, spacing: 2
      });
      row.cells.forEach((cell, dayIndex) => {
        drawCell(grid, cell, gridX + labelWidth + dayWidth * dayIndex, y, dayWidth, rowHeight);
      });
    });
    poster.appendChild(grid);
    addRect(poster, gridX, gridY, gridWidth, tableHeight, "none", 18, { stroke: HAIRLINE, "stroke-width": 3 });

    const footer = svgEl("g");
    // 頁尾卡收在 1990–2260，跟滿版底條留 40。高度是被 QR 卡撐出來的，
    // 所以縮高度得同時縮 QR 與拉近它的標籤，剩下的空間全部給門診表。
    const footerY = 1990;
    const footerHeight = 270;
    // 五張卡：門診時間、現場掛號、聯絡資訊、兩張 QR，卡距一律 30，右緣收在 3150。
    const cards = [
      { x: 150, width: 720 },
      { x: 900, width: 720 },
      { x: 1650, width: 790 },
      { x: 2470, width: 320 },
      { x: 2820, width: 330 }
    ];
    cards.forEach(({ x, width }) => {
      addRect(footer, x, footerY, width, footerHeight, "#ffffff", 24, { stroke: HAIRLINE, "stroke-width": 3 });
    });

    // 三張資訊卡共用一套規格：左上角青綠圓形圖示、標題後接虛線引導線、內容左對齊 textX。
    function footerHeading(card, name, title) {
      const textX = card.x + 210;
      addIconBadge(footer, name, card.x + 111, footerY + 76, 44);
      addText(footer, title, textX, footerY + 72, { size: 34, weight: 900, fill: TEAL, spacing: 4 });
      footer.appendChild(svgEl("line", {
        x1: textX + textUnits(title) * 34 + 3 * 4 + 24, y1: footerY + 60,
        x2: card.x + card.width - 45, y2: footerY + 60,
        stroke: "#b9ccd2", "stroke-width": 4, "stroke-linecap": "round", "stroke-dasharray": "2 14"
      }));
      return { textX, maxWidth: card.x + card.width - 45 - textX };
    }

    const hours = footerHeading(cards[0], "clock", "門診時間");
    [state.morningClinic, state.afternoonClinic].forEach((line, index) => {
      addText(footer, line, hours.textX, footerY + 158 + index * 68, {
        size: fitTextSize(line, 46, hours.maxWidth, 28), weight: 850, fill: INK
      });
    });

    const registration = footerHeading(cards[1], "pin", "現場掛號");
    [`上午 ${state.morningRegistration}`, `下午 ${state.afternoonRegistration}`].forEach((line, index) => {
      addText(footer, line, registration.textX, footerY + 158 + index * 68, {
        size: fitTextSize(line, 44, registration.maxWidth, 28), weight: 850, fill: INK
      });
    });

    const contact = footerHeading(cards[2], "phone", "聯絡資訊");
    addText(footer, state.primaryPhone, contact.textX, footerY + 146, {
      size: fitTextSize(state.primaryPhone, 52, contact.maxWidth, 30), weight: 900, fill: INK
    });
    addText(footer, state.otherPhones, contact.textX, footerY + 192, {
      size: fitTextSize(state.otherPhones, 30, contact.maxWidth, 20), weight: 650, fill: MUTED
    });
    addText(footer, state.address, contact.textX, footerY + 234, {
      size: fitTextSize(state.address, 32, contact.maxWidth, 20), weight: 720, fill: "#3f5b64"
    });

    const qrSize = 200;
    [
      { card: cards[3], href: window.QR_ASSETS?.googleMaps, label: "Google 地標" },
      { card: cards[4], href: window.QR_ASSETS?.facebook, label: "Facebook" }
    ].forEach(({ card, href, label }) => {
      if (!href) return;
      const center = card.x + card.width / 2;
      footer.appendChild(svgEl("image", { href, x: center - qrSize / 2, y: footerY + 14, width: qrSize, height: qrSize }));
      addText(footer, label, center, footerY + 247, { size: 29, weight: 850, anchor: "middle", fill: TEAL });
    });
    poster.appendChild(footer);

    // 滿版底條收尾，停診說明改成反白字，海報下緣就不會是浮著的一行小字。
    addRect(poster, 0, 2300, 3300, 100, INK);
    addText(poster, state.closureNote, 170, 2364, {
      size: fitTextSize(state.closureNote, 36, 2960, 24), weight: 700, fill: "#c9dde4", spacing: 1
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

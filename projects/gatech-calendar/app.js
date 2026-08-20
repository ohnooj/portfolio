const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ESSENTIAL_TYPES = new Set([
  "holiday",
  "recess",
  "reading_period",
  "final_exams",
  "commencement",
]);
const DEADLINE_TYPES = new Set([
  ...ESSENTIAL_TYPES,
  "registration",
  "withdrawal",
  "payment",
  "grades",
]);
const PRESET_TYPES = {
  essential: ESSENTIAL_TYPES,
  deadlines: DEADLINE_TYPES,
};
const CELL_FILL_TYPES = [
  ["recess", "var(--recess-fill)"],
  ["reading_period", "var(--reading-fill)"],
  ["holiday", "var(--holiday-fill)"],
  ["final_exams", "var(--final-fill)"],
];
const CELL_DECORATION_TYPES = new Set([
  "first_day",
  "final_instructional_days",
  "end_of_term",
  ...CELL_FILL_TYPES.map(([type]) => type),
]);
const RANGE_END_TYPES = new Set([
  "final_instructional_days",
  "end_of_term",
]);
const TERM_OPTIONS = [
  ["spring-full", "Spring"],
  ["summer-full", "Summer Full"],
  ["summer-maymester", "Summer Maymester"],
  ["summer-early", "Summer Early"],
  ["summer-late", "Summer Late"],
  ["fall-full", "Fall"],
];
const TERM_FILLS = {
  "spring-full": ["var(--spring)", "var(--spring-strong)"],
  "summer-full": ["var(--summer)", "var(--summer-strong)"],
  "summer-maymester": ["var(--summer-maymester)", "var(--summer-maymester-strong)"],
  "summer-early": ["var(--summer-early)", "var(--summer-early-strong)"],
  "summer-late": ["var(--summer-late)", "var(--summer-late-strong)"],
  "fall-full": ["var(--fall)", "var(--fall-strong)"],
};
const TYPE_OPTIONS = [
  ["holiday", "Holidays"],
  ["recess", "Recess"],
  ["reading_period", "Reading"],
  ["final_exams", "Finals"],
  ["commencement", "Commencement"],
  ["registration", "Register"],
  ["withdrawal", "Withdraw"],
  ["payment", "Payment"],
  ["grades", "Grades"],
  ["thesis", "Thesis"],
  ["readmission", "Readmit"],
  ["faculty", "Faculty"],
  ["minimester", "Mini"],
  ["half_term", "Half"],
  ["classes", "Classes"],
];
const TYPE_COLORS = {
  holiday: "var(--holiday-fill)",
  recess: "var(--recess-fill)",
  reading_period: "var(--reading-fill)",
  final_exams: "var(--final-fill)",
  commencement: "#f0e8cf",
  classes: "var(--blue-soft)",
  minimester: "var(--blue-soft)",
  half_term: "var(--blue-soft)",
  default: "#eef1f4",
};

const state = {
  events: [],
  filtered: [],
  termRanges: [],
  view: "year",
  cursor: new Date(new Date().getFullYear(), 0, 1),
  showOutsideMonthEvents: true,
  filters: {
    years: new Set(),
    terms: new Set(),
    types: new Set(ESSENTIAL_TYPES),
  },
  hoverType: null,
  previewFilter: null,
};

const el = {
  count: document.querySelector("#event-count"),
  title: document.querySelector("#period-title"),
  view: document.querySelector("#calendar-view"),
  tooltip: document.querySelector("#tooltip"),
  years: document.querySelector("#years-filter"),
  terms: document.querySelector("#terms-filter"),
  types: document.querySelector("#types-filter"),
  helpButton: document.querySelector("#app-help"),
  helpPopover: document.querySelector("#help-popover"),
  helpClose: document.querySelector("#help-close"),
};

init();

function init() {
  const payload = window.GT_CALENDAR_EVENTS;
  if (!payload?.events?.length) {
    el.count.textContent = "No calendar data found";
    return;
  }
  state.events = payload.events.map(normalizeEvent);
  seedDefaults();
  buildFilters();
  bindControls();
  applyFilters();
}

function normalizeEvent(event) {
  return {
    ...event,
    startDate: parseDate(event.start),
    endDate: parseDate(event.end),
    termKey: termKey(event.term, event.session),
  };
}

function seedDefaults() {
  const years = unique(state.events.map((event) => event.academicYear));
  const terms = unique(state.events.map((event) => event.termKey));

  state.filters.years = new Set(years);
  state.filters.terms = new Set(terms);

  const first = state.events.find((event) => ESSENTIAL_TYPES.has(event.eventType));
  if (first) state.cursor = new Date(first.startDate.getFullYear(), 0, 1);
}

function buildFilters() {
  addCheckboxes(el.years, "years", unique(state.events.map((event) => event.academicYear)).map((year) => [year, year]));
  addCheckboxes(el.terms, "terms", TERM_OPTIONS);
  addCheckboxes(el.types, "types", TYPE_OPTIONS);
}

function addCheckboxes(container, filterName, values) {
  values.forEach(([value, label]) => {
    const row = document.createElement("label");
    row.className = `toggle-option toggle-${filterName} toggle-${slug(value)}`;
    row.innerHTML = `<input type="checkbox" data-filter="${filterName}" value="${value}"><span>${label}</span>`;
    const input = row.querySelector("input");
    input.checked = state.filters[filterName].has(value);
    input.addEventListener("change", () => {
      if (input.checked) state.filters[filterName].add(value);
      else state.filters[filterName].delete(value);
      syncPreset("custom");
      applyFilters();
    });
    row.addEventListener("mouseenter", () => {
      state.previewFilter = { name: filterName, value };
      state.hoverType = filterName === "types" ? value : null;
      render();
    });
    row.addEventListener("mouseleave", () => {
      state.previewFilter = null;
      state.hoverType = null;
      render();
    });
    container.append(row);
  });
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function bindControls() {
  el.viewButtons = document.querySelectorAll("[data-view]");
  el.presetInputs = document.querySelectorAll('input[name="preset"]');
  el.typeInputs = document.querySelectorAll('input[data-filter="types"]');

  el.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      el.viewButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  document.querySelector("#prev-period").addEventListener("click", () => movePeriod(-1));
  document.querySelector("#next-period").addEventListener("click", () => movePeriod(1));
  document.querySelector("#export-ics").addEventListener("click", exportIcs);
  el.helpButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleHelp();
  });
  el.helpClose?.addEventListener("click", closeHelp);
  el.helpPopover?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  document.addEventListener("click", () => {
    if (!el.helpPopover?.hidden) closeHelp(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !el.helpPopover?.hidden) closeHelp();
  });

  el.presetInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      applyPreset(input.value);
    });
  });
}

function toggleHelp() {
  el.helpPopover?.hidden ? openHelp() : closeHelp();
}

function openHelp() {
  if (!el.helpPopover) return;
  el.helpPopover.hidden = false;
  el.helpButton?.setAttribute("aria-expanded", "true");
  el.helpClose?.focus();
}

function closeHelp(restoreFocus = true) {
  if (!el.helpPopover) return;
  el.helpPopover.hidden = true;
  el.helpButton?.setAttribute("aria-expanded", "false");
  if (restoreFocus) el.helpButton?.focus();
}

function applyPreset(preset) {
  state.filters.types = preset === "all"
    ? new Set(unique(state.events.map((event) => event.eventType)))
    : new Set(PRESET_TYPES[preset] || ESSENTIAL_TYPES);
  syncTypeInputs();
  applyFilters();
}

function syncPreset(preset) {
  el.presetInputs.forEach((input) => {
    input.checked = input.value === preset;
  });
}

function syncTypeInputs() {
  el.typeInputs.forEach((input) => {
    input.checked = state.filters.types.has(input.value);
  });
}

function applyFilters() {
  state.termRanges = buildTermRanges();
  state.filtered = state.events.filter((event) => (
    state.filters.years.has(event.academicYear)
    && state.filters.terms.has(event.termKey)
    && state.filters.types.has(event.eventType)
  ));
  el.count.textContent = `${state.filtered.length} selected events`;
  render();
}

function render() {
  const year = state.cursor.getFullYear();
  el.view.className = state.view === "year" ? "year-grid" : "month-grid";
  el.view.innerHTML = "";

  if (state.view === "year") {
    el.title.textContent = `${year}`;
    for (let month = 0; month < 12; month += 1) {
      el.view.append(renderMonth(year, month, false));
    }
  } else {
    const month = state.cursor.getMonth();
    el.title.textContent = `${MONTHS[month]} ${year}`;
    el.view.append(renderMonth(year, month, true));
  }
  highlightHoveredType();
}

function renderMonth(year, month, large) {
  const monthEl = document.createElement("article");
  monthEl.className = "month";
  monthEl.innerHTML = `
    <h3>${MONTHS[month]}</h3>
    <div class="weekdays">${WEEKDAYS.map((day) => `<div class="weekday">${day}</div>`).join("")}</div>
    <div class="weeks"></div>
  `;

  const weeks = monthEl.querySelector(".weeks");
  monthWeeks(year, month).forEach((weekStart) => {
    weeks.append(renderWeek(weekStart, year, month, large));
  });

  return monthEl;
}

function renderWeek(weekStart, year, month, large) {
  const week = document.createElement("div");
  week.className = "week";
  week.innerHTML = `<div class="week-days"></div><div class="week-events"></div>`;

  const days = week.querySelector(".week-days");
  Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)).forEach((date) => {
    const day = document.createElement("div");
    const inMonth = date.getMonth() === month;
    const showTooltipEvents = inMonth || state.showOutsideMonthEvents;
    const decorations = cellDecorations(date, { showSemesterRange: inMonth, muted: !inMonth });
    day.className = [
      "day",
      inMonth ? "" : "is-muted is-outside-month",
      isToday(date) ? "is-today" : "",
    ].filter(Boolean).join(" ");
    if ((inMonth || state.showOutsideMonthEvents) && decorations.background) {
      day.style.background = decorations.background;
    }
    day.innerHTML = `<span class="day-number">${date.getDate()}</span>`;
    if (decorations.types.length) {
      day.dataset.cellTypes = decorations.types.join(",");
    }
    const dayEvents = showTooltipEvents ? eventsForTooltip(date) : [];
    if (dayEvents.length) {
      bindTooltip(day, (mouseEvent) => showDayTooltip(mouseEvent, date, dayEvents));
    }
    if (!inMonth) {
      day.setAttribute("role", "button");
      day.tabIndex = 0;
      day.title = "Toggle outside-month events";
      day.setAttribute("aria-label", `${state.showOutsideMonthEvents ? "Hide" : "Show"} outside-month events`);
      bindOutsideMonthToggle(day);
    }
    days.append(day);
  });

  const maxRows = large ? 4 : 2;
  const layout = layoutWeekEvents(weekStart, year, month, maxRows);
  const eventLayer = week.querySelector(".week-events");
  layout.visible.forEach((segment) => eventLayer.append(eventBar(segment)));
  if (layout.hidden > 0) {
    const more = document.createElement("div");
    more.className = "week-more";
    more.style.gridRow = String(maxRows + 1);
    more.textContent = `+${layout.hidden} more`;
    eventLayer.append(more);
  }

  return week;
}

function eventBar(segment) {
  const pill = document.createElement("div");
  pill.className = [
    "event-pill",
    `event-${slug(segment.event.eventType || "other")}`,
    segment.event.isPreview ? "event-preview" : "",
    segment.isOutsideMonth ? "event-outside-month" : "",
  ].filter(Boolean).join(" ");
  pill.dataset.eventType = segment.event.eventType || "other";
  pill.textContent = segment.event.title;
  pill.style.gridColumn = `${segment.startCol + 1} / span ${segment.span}`;
  pill.style.gridRow = String(segment.row + 1);
  bindTooltip(pill, (mouseEvent) => showTooltip(mouseEvent, segment.event));
  if (segment.isOutsideMonth) {
    pill.title = "Toggle outside-month events";
    pill.addEventListener("click", toggleOutsideMonthEvents);
  }
  return pill;
}

function cellDecorations(date, options = {}) {
  const showSemesterRange = options.showSemesterRange ?? true;
  const muted = options.muted ?? false;
  const events = eventsOnDate(date);
  const semesterRange = showSemesterRange ? rangeForDate(date) : null;
  const cellEvents = CELL_FILL_TYPES
    .map(([type, color]) => {
      const event = events.find((item) => item.eventType === type);
      return event ? { event, color } : null;
    })
    .filter(Boolean);
  const fills = cellEvents.map(({ color }) => ({ color: muted ? mutedColor(color) : color }));
  if (semesterRange && fills.length === 0) {
    fills.push({ color: termFill(semesterRange, semesterRange.kind === "boundary") });
  }

  return {
    background: splitBackground(fills),
    types: [semesterRange?.event, ...cellEvents.map(({ event }) => event)]
      .filter(Boolean)
      .map((event) => event.eventType),
  };
}

function rangeForDate(date) {
  for (const range of state.termRanges) {
    if (date >= range.first.startDate && date <= range.endInclusive) {
      const isFirst = sameDay(date, range.first.startDate);
      const isEnd = sameDay(date, range.endInclusive);
      return {
        ...range,
        term: range.first.term,
        session: range.first.session,
        termKey: range.first.termKey,
        event: isFirst ? range.first : isEnd ? range.end : null,
        kind: isFirst || isEnd ? "boundary" : "range",
      };
    }
  }
  return null;
}

function buildTermRanges() {
  const selectedTerms = state.events.filter((event) => (
    state.filters.years.has(event.academicYear)
    && state.filters.terms.has(event.termKey)
  ));
  const ends = selectedTerms.filter(isRangeEndEvent).sort((a, b) => a.startDate - b.startDate);
  return selectedTerms
    .filter((event) => event.eventType === "first_day")
    .map((first) => {
      const end = ends.find((event) => (
        event.academicYear === first.academicYear
        && event.term === first.term
        && event.session === first.session
        && event.startDate >= first.startDate
      ));
      return end ? { first, end, endInclusive: addDays(end.endDate, -1) } : null;
    })
    .filter(Boolean);
}

function isRangeEndEvent(event) {
  const title = event.title.toLowerCase();
  return RANGE_END_TYPES.has(event.eventType)
    || title.includes("last day of classes");
}

function splitBackground(fills) {
  if (!fills.length) return "";
  if (fills.length === 1) return fills[0].color;
  const step = 100 / fills.length;
  const stops = fills.flatMap((fill, index) => {
    const start = (index * step).toFixed(2);
    const end = ((index + 1) * step).toFixed(2);
    return [`${fill.color} ${start}%`, `${fill.color} ${end}%`];
  });
  return `linear-gradient(to bottom right, ${stops.join(", ")})`;
}

function termFill(range, strong = false) {
  return TERM_FILLS[range.termKey]?.[strong ? 1 : 0] || "#fff";
}

function mutedColor(color) {
  return `color-mix(in srgb, ${color} 42%, #f4f3ef)`;
}

function eventsForTooltip(date) {
  const events = eventsOnDate(date);
  const boundary = rangeForDate(date)?.event;
  return uniqueEvents([boundary, ...events].filter(Boolean));
}

function highlightHoveredType() {
  document.querySelectorAll(".event-pill").forEach((pill) => {
    const active = state.hoverType && pill.dataset.eventType === state.hoverType;
    pill.classList.toggle("is-type-hovered", Boolean(active));
    pill.classList.toggle("is-type-dimmed", Boolean(state.hoverType && !active));
  });
  document.querySelectorAll(".day[data-cell-types]:not(.is-outside-month)").forEach((day) => {
    const types = (day.dataset.cellTypes || "").split(",");
    const active = state.hoverType && types.includes(state.hoverType);
    day.classList.toggle("is-type-hovered", Boolean(active));
    day.classList.toggle("is-type-dimmed", Boolean(state.hoverType && !active));
  });
}

function showTooltip(mouseEvent, event) {
  showTooltipHtml(mouseEvent, eventTooltipHtml(event));
}

function bindTooltip(target, show) {
  target.addEventListener("mouseenter", show);
  target.addEventListener("mousemove", moveTooltip);
  target.addEventListener("mouseleave", hideTooltip);
}

function bindOutsideMonthToggle(target) {
  target.addEventListener("click", toggleOutsideMonthEvents);
  target.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleOutsideMonthEvents();
  });
}

function showDayTooltip(mouseEvent, date, events) {
  const title = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const items = events.map((event) => `<li>${eventTooltipHtml(event)}</li>`).join("");
  showTooltipHtml(mouseEvent, `<div class="tooltip-date">${escapeHtml(title)}</div><ul>${items}</ul>`);
}

function eventTooltipHtml(event) {
  const term = [event.semester || event.term, event.session].filter(Boolean).join(" · ");
  return `
    <div class="tooltip-event">
      <span class="tooltip-swatch" style="background:${eventColor(event)}"></span>
      <div>
        <strong>${escapeHtml(event.title)}</strong>
        <span>${formatRange(event.startDate, event.endDate)} · ${escapeHtml(event.category)} · ${escapeHtml(term)}</span>
      </div>
    </div>
  `;
}

function eventColor(event) {
  return TYPE_COLORS[event.eventType] || TYPE_COLORS.default;
}

function showTooltipHtml(mouseEvent, html) {
  el.tooltip.innerHTML = html;
  el.tooltip.style.display = "block";
  moveTooltip(mouseEvent);
}

function moveTooltip(mouseEvent) {
  const x = Math.min(window.innerWidth - 300, mouseEvent.clientX + 14);
  const y = Math.min(window.innerHeight - 80, mouseEvent.clientY + 14);
  el.tooltip.style.left = `${Math.max(10, x)}px`;
  el.tooltip.style.top = `${Math.max(10, y)}px`;
}

function hideTooltip() {
  el.tooltip.style.display = "none";
}

function layoutWeekEvents(weekStart, year, month, maxRows) {
  const weekEnd = addDays(weekStart, 7);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const visibleStart = state.showOutsideMonthEvents ? weekStart : maxDate(weekStart, monthStart);
  const visibleEnd = state.showOutsideMonthEvents ? weekEnd : minDate(weekEnd, monthEnd);
  if (visibleStart >= visibleEnd) return { visible: [], hidden: 0 };

  const rows = Array.from({ length: maxRows }, () => Array(7).fill(false));
  const segments = eventsBetween(visibleStart, visibleEnd, false)
    .map((event) => {
      const segmentStart = maxDate(event.startDate, visibleStart);
      const segmentEnd = minDate(event.endDate, visibleEnd);
      const startCol = daysBetween(weekStart, segmentStart);
      const span = Math.max(1, daysBetween(segmentStart, segmentEnd));
      return { event, startCol, span };
    })
    .sort((a, b) => a.startCol - b.startCol || b.span - a.span || a.event.title.localeCompare(b.event.title));

  const visible = [];
  let hidden = 0;

  segments.forEach((segment) => {
    const row = rows.findIndex((slots) => slots.slice(segment.startCol, segment.startCol + segment.span).every((slot) => !slot));
    if (row === -1) {
      hidden += 1;
      return;
    }
    rows[row].fill(true, segment.startCol, segment.startCol + segment.span);
    visible.push(...splitSegmentByMonth({ ...segment, row }, weekStart, month));
  });

  return { visible, hidden };
}

function splitSegmentByMonth(segment, weekStart, month) {
  const pieces = [];
  let startCol = segment.startCol;
  let isOutsideMonth = addDays(weekStart, startCol).getMonth() !== month;

  for (let col = segment.startCol + 1; col < segment.startCol + segment.span; col += 1) {
    const nextOutside = addDays(weekStart, col).getMonth() !== month;
    if (nextOutside === isOutsideMonth) continue;
    pieces.push({ ...segment, startCol, span: col - startCol, isOutsideMonth });
    startCol = col;
    isOutsideMonth = nextOutside;
  }

  pieces.push({
    ...segment,
    startCol,
    span: segment.startCol + segment.span - startCol,
    isOutsideMonth,
  });
  return pieces;
}

function toggleOutsideMonthEvents() {
  state.showOutsideMonthEvents = !state.showOutsideMonthEvents;
  hideTooltip();
  render();
}

function eventsOnDate(date) {
  return eventsBetween(date, addDays(date, 1), true)
    .sort((a, b) => a.startDate - b.startDate || a.title.localeCompare(b.title));
}

function eventsBetween(start, end, includeDecorations) {
  return visibleEvents().filter((event) => (
    event.startDate < end
    && event.endDate > start
    && (includeDecorations || !CELL_DECORATION_TYPES.has(event.eventType))
  ));
}

function visibleEvents() {
  const preview = state.previewFilter;
  if (!preview || state.filters[preview.name].has(preview.value)) return state.filtered;
  const selectedIds = new Set(state.filtered.map((event) => event.uid));
  const previewEvents = state.events
    .filter((event) => (
      matchesPreview(event, preview)
      && !selectedIds.has(event.uid)
    ))
    .map((event) => ({ ...event, isPreview: true }));
  return [...state.filtered, ...previewEvents];
}

function matchesPreview(event, preview) {
  const yearMatch = preview.name === "years" ? event.academicYear === preview.value : state.filters.years.has(event.academicYear);
  const termMatch = preview.name === "terms" ? event.termKey === preview.value : state.filters.terms.has(event.termKey);
  const typeMatch = preview.name === "types" ? event.eventType === preview.value : state.filters.types.has(event.eventType);
  return yearMatch && termMatch && typeMatch;
}

function monthWeeks(year, month) {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 6 }, (_, index) => addDays(start, index * 7));
}

function movePeriod(direction) {
  if (state.view === "year") {
    state.cursor = new Date(state.cursor.getFullYear() + direction, 0, 1);
  } else {
    state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + direction, 1);
  }
  render();
}

function exportIcs() {
  const content = buildIcs(exportEvents());
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "gatech-custom-calendar.ics";
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportEvents() {
  return uniqueEvents([...state.filtered, ...boundaryEventsForExport()])
    .sort((a, b) => a.startDate - b.startDate || a.title.localeCompare(b.title));
}

function boundaryEventsForExport() {
  return state.termRanges.flatMap((range) => [range.first, range.end]);
}

function uniqueEvents(events) {
  const seen = new Set();
  return events.filter(({ uid }) => !seen.has(uid) && seen.add(uid));
}

function buildIcs(events) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GT Calendar Builder//Custom Academic Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Georgia Tech Custom Academic Calendar",
    "X-WR-TIMEZONE:America/New_York",
  ];

  events.forEach((event) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}@gt-calendar-builder`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(event.startDate)}`,
      `DTEND;VALUE=DATE:${icsDate(event.endDate)}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(`${event.category}\\n${event.semester}\\n${event.source}`)}`,
      `CATEGORIES:${escapeIcs(event.category)},${escapeIcs(event.term)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

function foldIcsLine(line) {
  if (line.length <= 75) return line;
  const chunks = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return chunks.join("\r\n");
}

function escapeIcs(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function formatRange(start, endExclusive) {
  const end = addDays(endExclusive, -1);
  const startText = start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const endText = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return startText === endText ? startText : `${startText} - ${endText}`;
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function icsDate(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function maxDate(...dates) {
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function minDate(...dates) {
  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

function isToday(date) {
  const today = new Date();
  return sameDay(date, today);
}

function daysBetween(start, end) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end - start) / msPerDay);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function termKey(term, session) {
  return slug(`${term}-${session}`);
}

function unique(values) {
  return [...new Set(values)].filter(Boolean);
}

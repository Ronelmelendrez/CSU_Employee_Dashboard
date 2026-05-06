const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2oWP1pAKrI88VovmLc9uVpsRBBIesMkB50RbZ0jwTdGYAERKIfRHv3v3PvC4mlibfbQ/exec";

const TABLE_HEADERS = [
  "Name of Personnel",
  "Start in CSU",
  "Status",
  "Highest Educational Attainment",
  "Academic Rank",
  "Salary Grade",
  "STEP",
  "Salary",
  "Fund Source",
];

const spinner = document.getElementById("loadingSpinner");
const tables = Array.from(document.querySelectorAll("table[data-category]"));
const chartBars = Array.from(document.querySelectorAll(".chart-bar[data-category]"));
const kpiTotal = document.getElementById("kpi-total");
const kpiTeaching = document.getElementById("kpi-teaching");
const kpiNonTeaching = document.getElementById("kpi-nonteaching");
const kpiUpdated = document.getElementById("kpi-updated");
const activityList = document.getElementById("activityList");
const attainmentChart = document.getElementById("attainmentChart");
const attainmentLegendItems = document.querySelectorAll(".legend-item");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const fundFilter = document.getElementById("fundFilter");
const clearFilters = document.getElementById("clearFilters");
const resultCount = document.getElementById("resultCount");

let baseCategories = {};
let filteredCategories = {};
let lastUpdatedAt = "";

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

function parseDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  const trimmed = String(value).trim();
  const parts = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (parts) {
    const partA = Number(parts[1]);
    const partB = Number(parts[2]);
    let year = Number(parts[3]);
    const hours = Number(parts[4] || 0);
    const minutes = Number(parts[5] || 0);
    const seconds = Number(parts[6] || 0);
    if (year < 100) {
      year = year >= 70 ? 1900 + year : 2000 + year;
    }
    const isDayFirst = partA > 12 && partB <= 12;
    const month = isDayFirst ? partB : partA;
    const day = isDayFirst ? partA : partB;
    const built = new Date(year, month - 1, day, hours, minutes, seconds);
    return Number.isNaN(built.getTime()) ? "" : built;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : parsed;
}

function formatCell(key, value) {
  if (key === "Salary" && value !== "") {
    const numeric = Number(String(value).replace(/[^0-9.-]+/g, ""));
    return Number.isNaN(numeric) ? value : currencyFormatter.format(numeric);
  }

  if (key === "Start in CSU") {
    const date = parseDate(value);
    return date ? dateFormatter.format(date) : value;
  }

  if (key === "Status" && value) {
    return `<span class="status-pill">${value}</span>`;
  }

  return value ?? "";
}

function buildRow(record) {
  const normalizedRecord = Object.keys(record || {}).reduce(function (acc, key) {
    acc[normalizeHeaderKey(key)] = record[key];
    return acc;
  }, {});
  const cells = TABLE_HEADERS.map(function (header) {
    const value = getRecordValue(record, normalizedRecord, header);
    return `<td>${formatCell(header, value)}</td>`;
  });
  return `<tr>${cells.join("")}</tr>`;
}

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeHeaderKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRecordValue(record, normalizedRecord, header) {
  if (!record) return "";
  if (record[header] !== undefined) return record[header];
  const normalized = normalizeHeaderKey(header);
  return normalizedRecord[normalized] ?? "";
}

function renderCategory(table, records) {
  const tbody = table.querySelector("tbody");
  if (!tbody) return;

  if (!records || !records.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">No records available.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = records.map(buildRow).join("");
}

function renderTablesFor(categories) {
  tables.forEach(function (table) {
    const category = table.getAttribute("data-category");
    renderCategory(table, categories[category] || []);
  });
}

function getCategoryCount(categories, name) {
  const list = categories[name] || [];
  return Array.isArray(list) ? list.length : 0;
}

function updateKpis(categories, updatedAt) {
  if (kpiTotal) {
    const total = Object.keys(categories).reduce(function (sum, key) {
      return sum + getCategoryCount(categories, key);
    }, 0);
    kpiTotal.textContent = total.toLocaleString("en-PH");
  }

  if (kpiTeaching) {
    const teaching =
      getCategoryCount(categories, "Teaching - Permanent") +
      getCategoryCount(categories, "Teaching - Non-Permanent");
    kpiTeaching.textContent = teaching.toLocaleString("en-PH");
  }

  if (kpiNonTeaching) {
    const nonTeaching =
      getCategoryCount(categories, "Non-Teaching - Permanent") +
      getCategoryCount(categories, "Non-Teaching - Non-Permanent");
    kpiNonTeaching.textContent = nonTeaching.toLocaleString("en-PH");
  }

  if (kpiUpdated && updatedAt) {
    const date = parseDate(updatedAt);
    kpiUpdated.textContent = date ? dateFormatter.format(date) : updatedAt;
  }
}

function updateChart(categories) {
  if (!chartBars.length) return;

  const counts = chartBars.map(function (bar) {
    const category = bar.getAttribute("data-category") || "";
    return getCategoryCount(categories, category);
  });
  const max = Math.max.apply(null, counts.concat(1));

  chartBars.forEach(function (bar, index) {
    const count = counts[index] || 0;
    const width = Math.max(18, Math.round((count / max) * 100));
    bar.style.width = `${width}%`;
    const label = bar.querySelector(".chart-label");
    if (label) {
      const base = label.textContent.split("·")[0].trim();
      label.textContent = `${base} · ${count}`;
    }
    bar.setAttribute("aria-label", `${count} records`);
    bar.title = `${count} records`;
  });
}

function updateActivity(categories, updatedAt) {
  if (!activityList) return;

  const categoryCounts = Object.keys(categories).map(function (name) {
    return { name: name, count: getCategoryCount(categories, name) };
  });

  const totalEmployees = categoryCounts.reduce(function (sum, item) {
    return sum + item.count;
  }, 0);

  const topCategory = categoryCounts.sort(function (a, b) {
    return b.count - a.count;
  })[0];

  const statusSet = new Set();
  const fundSet = new Set();

  Object.keys(categories).forEach(function (key) {
    (categories[key] || []).forEach(function (record) {
      const status = String(record["Status"] ?? "").trim();
      const fund = String(record["Fund Source"] ?? "").trim();
      if (status) statusSet.add(status);
      if (fund) fundSet.add(fund);
    });
  });

  const updatedText = updatedAt
    ? dateFormatter.format(parseDate(updatedAt))
    : "Just now";

  const items = [
    `Roster synced on ${updatedText}.`,
    topCategory
      ? `Largest group in view: ${topCategory.name} (${topCategory.count} of ${totalEmployees}).`
      : "Largest group: unavailable.",
    `Current view includes ${statusSet.size} statuses across ${fundSet.size} fund sources.`,
  ];

  activityList.innerHTML = items
    .map(function (text) {
      return `
        <div class="activity-item">
          <div class="activity-dot"></div>
          <div>
            <div class="activity-text">${text}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function updateAttainmentChart(categories) {
  if (!attainmentChart) return;

  const counts = {
    bachelors: 0,
    masters: 0,
    phd: 0,
    other: 0,
  };

  Object.keys(categories).forEach(function (key) {
    (categories[key] || []).forEach(function (record) {
      const raw = String(record["Highest Educational Attainment"] ?? "").toLowerCase();
      if (raw.includes("bachelor")) {
        counts.bachelors += 1;
      } else if (raw.includes("master")) {
        counts.masters += 1;
      } else if (raw.includes("phd") || raw.includes("doctor")) {
        counts.phd += 1;
      } else if (raw) {
        counts.other += 1;
      }
    });
  });

  attainmentLegendItems.forEach(function (item) {
    const key = item.getAttribute("data-key");
    const valueEl = item.querySelector(".legend-value");
    if (valueEl && key && counts[key] !== undefined) {
      valueEl.textContent = counts[key].toLocaleString("en-PH");
    }
  });

  const total = counts.bachelors + counts.masters + counts.phd + counts.other;
  const ctx = attainmentChart.getContext("2d");
  const size = attainmentChart.width;
  const radius = size / 2 - 6;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);

  if (!total) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#eef2ef";
    ctx.fill();
    ctx.fillStyle = "#5a6a60";
    ctx.font = "12px Manrope, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data", 0, 4);
    ctx.restore();
    return;
  }

  const slices = [
    { value: counts.bachelors, color: "#0b6f3a" },
    { value: counts.masters, color: "#d0a400" },
    { value: counts.phd, color: "#064226" },
    { value: counts.other, color: "#5a6a60" },
  ];

  let startAngle = -Math.PI / 2;
  slices.forEach(function (slice) {
    const angle = (slice.value / total) * Math.PI * 2;
    if (!angle) return;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    startAngle += angle;
  });

  ctx.restore();
}

function populateFilter(select, values) {
  if (!select) return;
  const currentValue = select.value;
  const defaultLabel = select === statusFilter ? "All statuses" : "All fund sources";
  const options = [""].concat(values);
  select.innerHTML = options
    .map(function (value) {
      const label = value || defaultLabel;
      const selected = value === currentValue ? " selected" : "";
      return `<option value="${value}"${selected}>${label}</option>`;
    })
    .join("");
}

function updateFilters(categories) {
  const statuses = new Set();
  const funds = new Set();

  Object.keys(categories).forEach(function (key) {
    (categories[key] || []).forEach(function (record) {
      const status = String(record["Status"] ?? "").trim();
      const fund = String(record["Fund Source"] ?? "").trim();
      if (status) statuses.add(status);
      if (fund) funds.add(fund);
    });
  });

  populateFilter(statusFilter, Array.from(statuses).sort());
  populateFilter(fundFilter, Array.from(funds).sort());
}

function updateResultCount() {
  if (!resultCount) return;
  const total = Object.keys(baseCategories).reduce(function (sum, key) {
    return sum + getCategoryCount(baseCategories, key);
  }, 0);
  const filtered = Object.keys(filteredCategories).reduce(function (sum, key) {
    return sum + getCategoryCount(filteredCategories, key);
  }, 0);
  const hasFilters =
    normalizeValue(searchInput && searchInput.value) ||
    (statusFilter && statusFilter.value) ||
    (fundFilter && fundFilter.value);
  resultCount.textContent = hasFilters
    ? `Showing ${filtered.toLocaleString("en-PH")} of ${total.toLocaleString("en-PH")} records`
    : `Showing ${total.toLocaleString("en-PH")} records`;
}

function applyFilters() {
  const query = normalizeValue(searchInput && searchInput.value);
  const status = statusFilter ? statusFilter.value : "";
  const fund = fundFilter ? fundFilter.value : "";

  filteredCategories = {};

  Object.keys(baseCategories).forEach(function (key) {
    const list = baseCategories[key] || [];
    const filtered = list.filter(function (record) {
      if (status && String(record["Status"] ?? "").trim() !== status) {
        return false;
      }
      if (fund && String(record["Fund Source"] ?? "").trim() !== fund) {
        return false;
      }
      if (query) {
        const haystack = TABLE_HEADERS.map(function (header) {
          return normalizeValue(record[header]);
        }).join(" ");
        return haystack.includes(query);
      }
      return true;
    });
    filteredCategories[key] = filtered;
  });

  renderTablesFor(filteredCategories);
  updateKpis(filteredCategories, lastUpdatedAt);
  updateChart(filteredCategories);
  updateActivity(filteredCategories, lastUpdatedAt);
  updateAttainmentChart(filteredCategories);
  updateResultCount();
}

async function fetchDashboardData() {
  if (SCRIPT_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL") {
    throw new Error("Set SCRIPT_URL to your Apps Script Web App URL.");
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    return fetchJsonp(SCRIPT_URL);
  }
}

function fetchJsonp(url) {
  return new Promise(function (resolve, reject) {
    const callbackName = `csuJsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const separator = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    const cleanup = function () {
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = function (data) {
      cleanup();
      resolve(data);
    };

    script.src = `${url}${separator}callback=${encodeURIComponent(callbackName)}`;
    script.onerror = function () {
      cleanup();
      reject(new Error("JSONP request failed"));
    };

    document.body.appendChild(script);
  });
}

async function initDashboard() {
  try {
    const data = await fetchDashboardData();
    const categories = data.categories || {};

    baseCategories = categories;
    filteredCategories = categories;
    lastUpdatedAt = data.updatedAt || "";

    updateFilters(categories);
    applyFilters();
  } catch (error) {
    renderTablesFor({});
    console.error("Failed to load CSU data:", error);
  } finally {
    spinner.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", initDashboard);

if (searchInput) {
  searchInput.addEventListener("input", applyFilters);
}

if (statusFilter) {
  statusFilter.addEventListener("change", applyFilters);
}

if (fundFilter) {
  fundFilter.addEventListener("change", applyFilters);
}

if (clearFilters) {
  clearFilters.addEventListener("click", function () {
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "";
    if (fundFilter) fundFilter.value = "";
    applyFilters();
  });
}

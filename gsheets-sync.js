const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIZrDVWPcekn-2xtINS_5eOa7tUWmmGdHU5D2uc5_5GV7oElbp3ed0lLDNygY1bUjACg/exec";

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
  const parsed = new Date(value);
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
  const cells = TABLE_HEADERS.map(function (header) {
    const value = record[header] ?? "";
    return `<td>${formatCell(header, value)}</td>`;
  });
  return `<tr>${cells.join("")}</tr>`;
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
    const height = Math.max(18, Math.round((count / max) * 100));
    bar.style.height = `${height}%`;
    const label = bar.querySelector(".chart-label");
    if (label) {
      const base = label.textContent.split("·")[0].trim();
      label.textContent = `${base} · ${count}`;
    }
    bar.setAttribute("aria-label", `${count} records`);
    bar.title = `${count} records`;
  });
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

    tables.forEach(function (table) {
      const category = table.getAttribute("data-category");
      renderCategory(table, categories[category] || []);
    });

    updateKpis(categories, data.updatedAt);
    updateChart(categories);
  } catch (error) {
    tables.forEach(function (table) {
      renderCategory(table, []);
    });
    console.error("Failed to load CSU data:", error);
  } finally {
    spinner.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", initDashboard);

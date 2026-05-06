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

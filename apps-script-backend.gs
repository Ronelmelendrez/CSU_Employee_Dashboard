const SPREADSHEET_ID = ""; // Optional: set to a specific spreadsheet ID
const SHEET_NAMES = [
  "Teaching - Permanent",
  "Teaching - Non-Permanent",
  "Non-Teaching - Permanent",
  "Non-Teaching - Non-Permanent",
];

const CANONICAL_HEADERS = [
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

function doGet(e) {
  var ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  var payload = {};

  SHEET_NAMES.forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      payload[sheetName] = [];
      return;
    }

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      payload[sheetName] = [];
      return;
    }

    var rows = values.slice(1).filter(function (row) {
      return row.some(function (cell) {
        return String(cell).trim() !== "";
      });
    });

    var data = rows.map(function (row) {
      var obj = {};
      CANONICAL_HEADERS.forEach(function (key, idx) {
        obj[key] = row[idx];
      });
      return obj;
    });

    payload[sheetName] = data;
  });

  var json = JSON.stringify({
    updatedAt: new Date().toISOString(),
    categories: payload,
  });

  var callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

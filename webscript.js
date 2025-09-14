const SHEET_NAME = "Sheet1";
const HEADER_ROW = 1;

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _json({ ok: false, error: "Missing JSON body" });
    }

    const payload = JSON.parse(e.postData.contents);
    const values = Array.isArray(payload.values) ? payload.values : [];
    if (!values.length)
      return _json({
        ok: true,
        wrote: 0,
        skipped: 0,
        headerSkipped: 0,
        total: 0,
      });

    const uniqueBy = payload.uniqueBy || []; // e.g. ["Name"] or [0]
    const caseInsensitive = payload.caseInsensitive !== false; // default true
    const doTrim = payload.trim !== false; // default true
    const doClear = !!payload.clear;
    const hasHeaderFlag = !!payload.hasHeader; // only used if sheet is empty

    const sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet)
      return _json({ ok: false, error: `No sheet named ${SHEET_NAME}` });

    const lock = LockService.getDocumentLock();
    lock.waitLock(30000);

    if (doClear) sheet.clearContents();

    // Read existing header (if any)
    let sheetHeader = _getHeaderRow(sheet);
    let wroteHeader = false;

    // If sheet is empty and caller wants to seed a header, write the first row as header once
    if (sheet.getLastRow() === 0 && hasHeaderFlag) {
      sheet.getRange(HEADER_ROW, 1, 1, values[0].length).setValues([values[0]]);
      sheetHeader = values[0].slice();
      wroteHeader = true;
    }

    // Resolve uniqueness columns (use sheet header names if present)
    const headerForMapping = sheetHeader.length ? sheetHeader : [];
    const uniqCols = _resolveUniqueCols(uniqueBy, headerForMapping);
    const uniqueCols = uniqCols.length ? uniqCols : [0]; // default to first column

    // Build existing keys set from the sheet (skip header row)
    const lastRow = sheet.getLastRow();
    const lastCol = Math.max(sheet.getLastColumn(), (values[0] || []).length);
    const existingKeys = new Set();
    if (lastRow > HEADER_ROW) {
      const existing = sheet
        .getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, lastCol)
        .getValues();
      for (const r of existing)
        existingKeys.add(_makeKey(r, uniqueCols, { caseInsensitive, doTrim }));
    }

    // Now iterate every incoming row:
    const rowsToWrite = [];
    let skipped = 0,
      headerSkipped = 0;

    for (const row of values) {
      // If we already have a header in the sheet, skip any incoming row that equals it (anywhere in payload)
      if (sheetHeader.length && _rowsEqual(row, sheetHeader)) {
        headerSkipped++;
        continue;
      }

      // De-dup using unique columns
      const key = _makeKey(row, uniqueCols, { caseInsensitive, doTrim });
      if (!key) continue;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      rowsToWrite.push(row);
      existingKeys.add(key);
    }

    // Write in one batch
    if (rowsToWrite.length) {
      const startRow = Math.max(
        sheet.getLastRow() + 1,
        wroteHeader ? HEADER_ROW + 1 : HEADER_ROW + (sheetHeader.length ? 1 : 0)
      );
      const width = Math.max(lastCol, rowsToWrite[0].length);
      sheet
        .getRange(startRow, 1, rowsToWrite.length, width)
        .setValues(rowsToWrite);
    }

    lock.releaseLock();

    return _json({
      ok: true,
      wrote: rowsToWrite.length,
      skipped, // data duplicates
      headerSkipped, // rows skipped because they matched the header
      total: values.length,
    });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

/** Helpers **/
function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function _getHeaderRow(sheet) {
  const lr = sheet.getLastRow();
  const lc = sheet.getLastColumn();
  if (lr < HEADER_ROW || lc === 0) return [];
  const header = sheet.getRange(HEADER_ROW, 1, 1, lc).getValues()[0];
  return header.some((v) => String(v).trim() !== "") ? header : [];
}

function _resolveUniqueCols(uniqueBy, header) {
  if (!Array.isArray(uniqueBy) || uniqueBy.length === 0) return [];
  const cols = [];
  const nameMap = {};
  header.forEach((h, idx) => {
    if (typeof h === "string") nameMap[h.trim().toLowerCase()] = idx;
  });
  for (const u of uniqueBy) {
    if (typeof u === "number" && isFinite(u)) {
      const i = u >= 1 ? u - 1 : u; // allow 1-based or 0-based
      if (i >= 0) cols.push(i);
    } else if (typeof u === "string") {
      const k = u.trim().toLowerCase();
      if (k in nameMap) cols.push(nameMap[k]);
    }
  }
  return [...new Set(cols)].filter((i) => i >= 0);
}

function _makeKey(row, cols, { caseInsensitive = true, doTrim = true } = {}) {
  if (!row || !cols || !cols.length) return "";
  const parts = cols.map((c) => {
    let v = row[c] != null ? String(row[c]) : "";
    if (doTrim) v = v.trim();
    if (caseInsensitive) v = v.toLowerCase();
    return v;
  });
  return parts.join("||").trim();
}

function _rowsEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const av = (a[i] ?? "").toString().trim().toLowerCase();
    const bv = (b[i] ?? "").toString().trim().toLowerCase();
    if (av !== bv) return false;
  }
  return true;
}

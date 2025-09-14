# Google Apps Script Setup Guide

This guide will help you set up the Google Apps Script web app to receive data from the Latka Scraper extension and automatically insert it into your Google Sheets.

## Prerequisites

- Google Account with Google Drive and Google Sheets access
- A Google Sheet where you want to import the scraped data

## Step 1: Create a New Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com/)
2. Click **+ New project**
3. Replace the default `Code.gs` content with the provided script code
4. Save the project with a descriptive name (e.g., "Latka Data Importer")

## Step 2: Add the Script Code

Replace the entire contents of `Code.gs` with this script:

```javascript
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
```

## Step 3: Configure the Target Google Sheet

1. **Open your target Google Sheet** where you want the data to be imported
2. **Make sure the sheet has a tab named "Sheet1"** (or modify the `SHEET_NAME` constant in the script)
3. **Note down the Google Sheet ID** from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Copy the SHEET_ID part

## Step 4: Link the Script to Your Google Sheet

1. In the Apps Script editor, go to **Resources** → **Cloud Platform project**
2. Copy the **Google Apps Script project ID**
3. Go back to your Google Sheet
4. Click **Extensions** → **Apps Script**
5. This will create a new Apps Script project bound to your sheet

**Alternative Method:**
1. In the Apps Script editor, click the **Select project** dropdown
2. Choose **Create a new project** and select your Google Sheet
3. This automatically binds the script to your sheet

## Step 5: Set Up Permissions

1. In the Apps Script editor, click **Deploy** → **New deployment**
2. Click the **gear icon** next to "Type" and select **Web app**
3. Configure the deployment:
   - **Description**: "Latka Data Import API"
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Click **Deploy**
5. **Review and authorize permissions** when prompted
6. **Copy the Web App URL** - this is your Apps Script URL

## Step 6: Test the Deployment

The Web App URL should look like:
```
https://script.google.com/macros/s/AKfycbyUsdQZIeyGPNWTsETzkEXZHoDTIWenZYehgqxjG5hUFuIKAlUl-03ZqmeKZBJQ7wjOgw/exec
```


## Step 7: Configure the Chrome Extension

1. Open your Latka Scraper Chrome extension
2. Click **Configure Google Sheets**
3. Paste your Web App URL into the Apps Script URL field
4. Click **Save Configuration**

## Script Features

### Deduplication
- Automatically prevents duplicate entries based on specified columns
- Default uniqueness check is on the first column (usually company name)
- Can be customized by modifying the `uniqueBy` parameter

### Header Handling
- Automatically detects existing headers in the sheet
- Skips duplicate header rows from incoming data
- Maintains data integrity across multiple imports

### Batch Operations
- Processes all data in a single batch operation for better performance
- Uses document locks to prevent concurrent access issues
- Provides detailed response with counts of written/skipped rows

### Error Handling
- Comprehensive error catching and logging
- Returns detailed success/failure information
- Handles edge cases like empty data and missing sheets

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the script is deployed as "Execute as: Me" and "Who has access: Anyone"
2. **Sheet Not Found**: Verify the `SHEET_NAME` constant matches your sheet tab name
3. **Script Not Responding**: Check if the Apps Script project is properly bound to your Google Sheet
4. **Data Not Appearing**: Verify the sheet permissions and that the Web App URL is correct

### Debugging

1. Go to Apps Script editor → **View** → **Execution log**
2. Check for any error messages or logs from recent executions
3. Test the script manually using the **Run** button with sample data

## Security Notes

- The script only accepts POST requests with valid JSON data
- Uses Google's built-in authentication and authorization
- All data is processed within Google's secure environment
- No sensitive data is logged or stored outside Google Sheets

## Customization

### Changing the Target Sheet
Modify the `SHEET_NAME` constant:
```javascript
const SHEET_NAME = "YourSheetName"; // Change this to your desired sheet name
```

### Modifying Deduplication Logic
Customize the `uniqueBy` parameter in your extension configuration to specify which columns should be used for uniqueness checking.

### Adding Data Validation
You can extend the script to include data validation, formatting, or additional processing before writing to the sheet.

---

Your Google Apps Script is now ready to receive data from the Latka Scraper Chrome extension!
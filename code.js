// ── Toggle Favorite (คอลัมน์ L = 12, favTime คอลัมน์ M = 13) ───
function toggleFavorite(sheetName, rowIndex, currentStatus) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return JSON.stringify({ success: false, error: `ไม่พบชีท: ${sheetName}` });

    if (sheet.getMaxColumns() < 13) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), 13 - sheet.getMaxColumns());
    }

    const newStatus = !currentStatus;
    const now = new Date();
    sheet.getRange(rowIndex, 12).setValue(newStatus);

    if (newStatus) {
      sheet.getRange(rowIndex, 13).setValue(now);
    }

    return JSON.stringify({
      success: true,
      fav: newStatus,
      favTime: newStatus ? now.getTime() : null
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ==========================================
//  code.gs — Stock Manager
//  Google Apps Script Backend
// ==========================================

const SPREADSHEET_ID = '1WId___CZ_OIcoJWaIjt1BG74erZrsOXzU09Js0nVPO8';
const OH_HEADER = 'จำนวน OH';
const OH_TIME_HEADER = 'Update OH';
const LOT_TIME_HEADER = 'Update Lot';
const APP_ICON_URL = 'https://i.postimg.cc/zDFxrHNZ/image.png';
const SYSTEM_SHEETS = ['Aging', 'Aging_Order'];
const TEMPLATE_SHEET_NAMES = ['Oishi', 'Est', 'Alc.', 'F&N'];

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Stock Manager')
    .setFaviconUrl(APP_ICON_URL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
    .addMetaTag('mobile-web-app-capable', 'yes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function pad2_(value) {
  return String(value).padStart(2, '0');
}

function formatLotDate_(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd/MM/yy');
  }
  const text = String(value).trim();
  if (!text) return '';
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return `${pad2_(match[3])}/${pad2_(match[2])}/${parseInt(match[1], 10) % 100}`;
  }
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    let year = parseInt(match[3], 10);
    if (match[3].length === 4 && year > 2400) year -= 543;
    return `${pad2_(match[1])}/${pad2_(match[2])}/${pad2_(year % 100)}`;
  }
  return text;
}

function formatUpdateDate_(value) {
  if (value == null || value === '' || !(value instanceof Date) || isNaN(value.getTime())) return '';
  return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd/MM/yy HH:mm');
}

function ensureColumns_(sheet) {
  const maxCols = sheet.getMaxColumns();
  if (maxCols < 12) {
    sheet.insertColumnsAfter(maxCols, 12 - maxCols);
  }
  const headers = [[OH_HEADER, OH_TIME_HEADER, LOT_TIME_HEADER, 'Favorite']];
  sheet.getRange(2, 9, 1, 4).setValues(headers);
}

function getMainSheetNames_(ss) {
  return ss.getSheets()
    .map(sheet => sheet.getName())
    .filter(name => !SYSTEM_SHEETS.includes(name));
}

function getTemplateSheet_(ss) {
  for (const name of TEMPLATE_SHEET_NAMES) {
    const sheet = ss.getSheetByName(name);
    if (sheet) return sheet;
  }

  return ss.getSheets().find(sheet => !SYSTEM_SHEETS.includes(sheet.getName())) || null;
}

function initializeProductSheet_(sheet, sheetName) {
  sheet.getRange(1, 1).setValue('Stock Manager — ' + sheetName);
  sheet.getRange(2, 1, 1, 12).setValues([[
    'ลำดับ', 'SKU', 'ชื่อสินค้า', 'ขนาด',
    'LOT1', 'LOT2', 'LOT3', 'LOT4',
    OH_HEADER, OH_TIME_HEADER, LOT_TIME_HEADER, 'Favorite'
  ]]);
  sheet.getRange(2, 1, 1, 12).setFontWeight('bold');
  ensureColumns_(sheet);
}

function createProductSheet_(ss, sheetName) {
  const templateSheet = getTemplateSheet_(ss);
  let sheet;

  if (templateSheet) {
    sheet = templateSheet.copyTo(ss).setName(sheetName);
    sheet.getRange(1, 1).setValue('Stock Manager — ' + sheetName);
    ensureColumns_(sheet);

    const maxRows = sheet.getMaxRows();
    const maxCols = sheet.getMaxColumns();
    if (maxRows > 2) {
      sheet.getRange(3, 1, maxRows - 2, maxCols).clearContent();
    }
    return sheet;
  }

  sheet = ss.insertSheet(sheetName);
  initializeProductSheet_(sheet, sheetName);
  return sheet;
}

function formatOh_(value) {
  return (value == null ? '' : String(value).trim());
}


// ── ดึงข้อมูลทุกชีท (โดยเรียงลำดับตามชีท Aging) ────────────────────
function getAllSheetData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = {};
    
    // 1. ดึง Master Index จากชีท Aging_Order (ลำดับ และ SKU)
    let agingSheet = ss.getSheetByName('Aging_Order');
    let isLegacy = false;
    
    // Fallback เผื่อยังไม่ได้รัน Migration
    if (!agingSheet) {
      agingSheet = ss.getSheetByName('Aging');
      isLegacy = true;
    }
    
    if (!agingSheet) return JSON.stringify({ success: false, error: 'ไม่พบชีท Aging หรือ Aging_Order' });
    
    const agingLastRow = agingSheet.getLastRow();
    let masterSequence = [];
    let masterItems = [];
    
    if (agingLastRow >= 3) {
      if (isLegacy) {
        const agingBarcodesRaw = agingSheet.getRange(3, 2, agingLastRow - 2, 1).getValues();
        masterItems = agingBarcodesRaw
          .map(row => ({ sku: String(row[0] || '').trim(), sheetName: '' }))
          .filter(item => item.sku !== '');
        masterSequence = masterItems.map(item => item.sku);
      } else {
        const agingRaw = agingSheet.getRange(3, 1, agingLastRow - 2, 4).getValues();
        const sortedAging = agingRaw
          .filter(row => String(row[1] || '').trim() !== '')
          .map(row => ({
            order: Number(row[0]) || 0,
            sku: String(row[1]).trim(),
            sheetName: String(row[3] || '').trim()
          }))
          .sort((a, b) => a.order - b.order);
        masterItems = sortedAging.map(item => ({ sku: item.sku, sheetName: item.sheetName }));
        masterSequence = masterItems.map(item => item.sku);
      }
    }

    // 2. ดึงข้อมูลจริง (Raw Data) จากทุกชีทมาเก็บไว้ใน Map
    const allRawData = {};
    const mainSheets = getMainSheetNames_(ss);
    
    mainSheets.forEach(name => {
      const sheet = ss.getSheetByName(name);
      allRawData[name] = {};
      if (sheet) {
        ensureColumns_(sheet);
        const lastRow = sheet.getLastRow();
        if (lastRow >= 3) {
          const vals = sheet.getRange(3, 1, lastRow - 2, 12).getValues();
          vals.forEach((row, idx) => {
            const bc = String(row[1] || '').trim();
            if (bc) {
              allRawData[name][bc] = {
                rowIndex: idx + 3,
                barcode: bc,
                name: String(row[2] || '').trim(),
                size: String(row[3] || '').trim(),
                lot1: formatLotDate_(row[4]),
                lot2: formatLotDate_(row[5]),
                lot3: formatLotDate_(row[6]),
                lot4: formatLotDate_(row[7]),
                oh: formatOh_(row[8]),
                ohTime: formatUpdateDate_(row[9]),
                lotTime: formatUpdateDate_(row[10]),
                fav: row[11] === true || String(row[11]).toUpperCase() === 'TRUE'
              };
            }
          });
        }
      }
    });

    // 3. จัดกลุ่มข้อมูลลงในแต่ละชีท โดยเรียงลำดับตามชีท Aging (Master Sequence)
    const allCombined = [];
    mainSheets.forEach(name => {
      const sheetMap = allRawData[name];
      result[name] = masterSequence
        .filter(bc => sheetMap[bc]) // เอาเฉพาะสินค้าที่อยู่ในชีทนั้นๆ
        .map(bc => {
          const item = sheetMap[bc];
          item.sheetName = name;
          return item;
        });
        
      // เก็บสินค้าในชีทนั้นๆ ที่ไม่อยู่ใน Aging ไว้ต่อท้าย (กันพลาด)
      const agingSet = new Set(masterSequence);
      const leftovers = Object.keys(sheetMap)
        .filter(bc => !agingSet.has(bc))
        .map(bc => {
          const item = sheetMap[bc];
          item.sheetName = name;
          return item;
        });
      
      result[name] = result[name].concat(leftovers);
    });

    // 4. สร้างคีย์ "ทั้งหมด (Aging)" โดยให้ Aging_Order เป็นตัวจัดลำดับเท่านั้น
    //    สินค้าที่อยู่ในชีตหลักแต่ยังไม่มีใน Aging_Order จะถูกต่อท้าย เพื่อไม่ให้หายจากหน้า Update
    const addedAllKeys = new Set();
    const pushCombinedItem = (sheetName, sku, missingFromAging) => {
      const item = allRawData[sheetName] && allRawData[sheetName][sku];
      if (!item) return false;

      const key = `${sheetName}::${sku}`;
      if (addedAllKeys.has(key)) return false;

      const clone = JSON.parse(JSON.stringify(item)); // Clone to avoid reference issues
      clone.sheetName = sheetName;
      clone.missingFromAging = missingFromAging === true;
      allCombined.push(clone);
      addedAllKeys.add(key);
      return true;
    };

    masterItems.forEach(ref => {
      if (ref.sheetName && mainSheets.includes(ref.sheetName)) {
        pushCombinedItem(ref.sheetName, ref.sku, false);
        return;
      }

      mainSheets.forEach(sn => {
        pushCombinedItem(sn, ref.sku, false);
      });
    });

    mainSheets.forEach(sn => {
      Object.keys(allRawData[sn]).forEach(bc => {
        pushCombinedItem(sn, bc, true);
      });
    });
    result['All'] = allCombined;

    return JSON.stringify({ success: true, data: result, sheetNames: mainSheets });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ── บันทึก LOT ──────────────────────────────────────────────────
function saveLotData(sheetName, rowIndex, lot1, lot2, lot3, lot4) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return JSON.stringify({ success: false, error: `ไม่พบชีท: ${sheetName}` });

    const now = new Date();
    const lots = [lot1, lot2, lot3, lot4].map(formatLotDate_);
    const range = sheet.getRange(rowIndex, 5, 1, 4);
    range.setNumberFormat('@');
    range.setValues([lots]);
    sheet.getRange(rowIndex, 11).setValue(now);

    return JSON.stringify({ success: true, lotTime: formatUpdateDate_(now) });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ── บันทึก SKU และชื่อสินค้า ────────────────────────────────────
function saveProductData(sheetName, rowIndex, sku, productName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return JSON.stringify({ success: false, error: `ไม่พบชีท: ${sheetName}` });

    const cleanSku = formatOh_(sku);
    const cleanName = formatOh_(productName);
    if (!cleanName) return JSON.stringify({ success: false, error: 'กรุณากรอกชื่อสินค้า' });

    const range = sheet.getRange(rowIndex, 2, 1, 2);
    range.setNumberFormat('@');
    range.setValues([[cleanSku, cleanName]]);

    return JSON.stringify({ success: true, data: { sku: cleanSku, name: cleanName } });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ── บันทึก OH ───────────────────────────────────────────────────
function saveOhData(sheetName, rowIndex, oh) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return JSON.stringify({ success: false, error: `ไม่พบชีท: ${sheetName}` });

    const now = new Date();
    sheet.getRange(rowIndex, 9).setValue(formatOh_(oh));
    sheet.getRange(rowIndex, 10).setValue(now);

    return JSON.stringify({ success: true, ohTime: formatUpdateDate_(now) });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ── เคลียร์ LOT ─────────────────────────────────────────────────
function clearLotData(sheetName, rowIndex) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return JSON.stringify({ success: false, error: `ไม่พบชีท: ${sheetName}` });

    const now = new Date();
    const range = sheet.getRange(rowIndex, 5, 1, 4);
    range.setNumberFormat('@');
    range.setValues([['', '', '', '']]);
    sheet.getRange(rowIndex, 11).setValue(now);

    return JSON.stringify({ success: true, lotTime: formatUpdateDate_(now) });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ── Toggle Favorite (คอลัมน์ L = 12) ───────────────────────────
function toggleFavorite(sheetName, rowIndex, currentStatus) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return JSON.stringify({ success: false, error: `ไม่พบชีท: ${sheetName}` });

    const newStatus = !currentStatus;
    sheet.getRange(rowIndex, 12).setValue(newStatus);

    return JSON.stringify({ success: true, fav: newStatus });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ── เพิ่มสินค้าใหม่ (ชีตหลัก + Aging_Order) ────────────────────
function addProduct(sheetName, sku, name, size) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    sheetName = formatOh_(sheetName);
    if (!sheetName) return JSON.stringify({ success: false, error: 'กรุณาระบุชื่อหมวดหมู่' });
    if (SYSTEM_SHEETS.includes(sheetName)) return JSON.stringify({ success: false, error: `ไม่สามารถใช้ชื่อชีทระบบ: ${sheetName}` });

    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = createProductSheet_(ss, sheetName);
    }

    const cleanSku = formatOh_(sku);
    const cleanName = formatOh_(name);
    
    // 1. ตรวจสอบว่ามี SKU นี้หรือยัง
    const lastRow = sheet.getLastRow();
    if (lastRow >= 3) {
      const existingSkus = sheet.getRange(3, 2, lastRow - 2, 1).getValues();
      for (let row of existingSkus) {
        if (String(row[0]).trim() === cleanSku) {
          return JSON.stringify({ success: false, error: `รหัสสินค้านี้มีอยู่แล้วในชีท ${sheetName}` });
        }
      }
    }

    // 2. เพิ่มลงชีตหลัก
    // A=ว่าง, B=SKU, C=ชื่อ, D=ขนาด, E-H=LOT, I=OH, J-K=Time, L=Fav
    const newRowData = ['', cleanSku, cleanName, size, '', '', '', '', '', '', '', false];
    sheet.appendRow(newRowData);
    const newRowIndex = sheet.getLastRow();
    
    // จัด Format Text ให้ SKU
    sheet.getRange(newRowIndex, 2).setNumberFormat('@');

    // 3. เพิ่มลง Aging_Order
    let agingSheet = ss.getSheetByName('Aging_Order');
    let isLegacy = false;
    if (!agingSheet) {
      agingSheet = ss.getSheetByName('Aging');
      isLegacy = true;
    }
    
    if (agingSheet) {
      const agingLastRow = agingSheet.getLastRow();
      let nextOrder = 1;
      
      if (!isLegacy && agingLastRow >= 3) {
        // หา order สูงสุด
        const orders = agingSheet.getRange(3, 1, agingLastRow - 2, 1).getValues();
        let maxOrder = 0;
        orders.forEach(row => {
          const val = Number(row[0]);
          if (!isNaN(val) && val > maxOrder) maxOrder = val;
        });
        nextOrder = maxOrder + 1;
      } else if (isLegacy && agingLastRow >= 3) {
        // นับบรรทัดเป็นลำดับ
        nextOrder = agingLastRow - 2 + 1;
      }
      
      if (!isLegacy) {
        // A=ลำดับ, B=SKU, C=ชื่อสินค้า, D=ชีต
        agingSheet.appendRow([nextOrder, cleanSku, cleanName, sheetName]);
        const newAgingRow = agingSheet.getLastRow();
        agingSheet.getRange(newAgingRow, 2).setNumberFormat('@');
      } else {
        // Legacy Aging
        const blankLots = ['', '', '', ''];
        agingSheet.appendRow(['', cleanSku, cleanName, size, ...blankLots, '', '', '', false]);
        const newAgingRow = agingSheet.getLastRow();
        agingSheet.getRange(newAgingRow, 2).setNumberFormat('@');
        agingSheet.getRange(newAgingRow, 5, 1, 4).setNumberFormat('@');
      }
    }

    return JSON.stringify({ success: true, data: { rowIndex: newRowIndex, sku: cleanSku, name: cleanName, size: size, sheetName: sheetName } });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ── สลับลำดับสินค้า ──────────────────────────────────────────
function reorderProduct(skuA, skuB) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const agingSheet = ss.getSheetByName('Aging_Order');
    
    if (!agingSheet) {
      return JSON.stringify({ success: false, error: 'ฟีเจอร์นี้รองรับเฉพาะหลังจาก Migrate เป็น Aging_Order แล้วเท่านั้น' });
    }

    const lastRow = agingSheet.getLastRow();
    if (lastRow < 3) return JSON.stringify({ success: false, error: 'ไม่มีข้อมูลใน Aging_Order' });

    // ดึง SKU มาหา Row
    const skus = agingSheet.getRange(3, 2, lastRow - 2, 1).getValues();
    let rowA = -1;
    let rowB = -1;

    for (let i = 0; i < skus.length; i++) {
      const currentSku = String(skus[i][0]).trim();
      if (currentSku === String(skuA).trim()) rowA = i + 3;
      if (currentSku === String(skuB).trim()) rowB = i + 3;
      
      if (rowA !== -1 && rowB !== -1) break;
    }

    if (rowA !== -1 && rowB !== -1) {
      // ดึงข้อมูลคอลัมน์ B, C, D (SKU, ชื่อสินค้า, ชีต)
      const dataA = agingSheet.getRange(rowA, 2, 1, 3).getValues();
      const dataB = agingSheet.getRange(rowB, 2, 1, 3).getValues();
      
      // สลับข้อมูลระหว่าง Row A และ Row B
      agingSheet.getRange(rowA, 2, 1, 3).setValues(dataB);
      agingSheet.getRange(rowB, 2, 1, 3).setValues(dataA);
      
      return JSON.stringify({ success: true });
    }

    return JSON.stringify({ success: false, error: 'ไม่พบสินค้าบางรายการที่ต้องการสลับ' });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ── One-time Migration Script ──────────────────────────────
// รันฟังก์ชันนี้จาก Apps Script Editor เพื่อสร้างชีต Aging_Order และดึงข้อมูลจาก Aging เดิมมาใส่
function migrateToAgingOrder() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const oldAging = ss.getSheetByName('Aging');
  if (!oldAging) {
    console.log('ไม่พบชีต Aging เดิม');
    return;
  }
  
  let newAging = ss.getSheetByName('Aging_Order');
  if (!newAging) {
    newAging = ss.insertSheet('Aging_Order');
  } else {
    newAging.clear();
  }
  
  // สร้าง Header
  const headers = [['ลำดับ', 'SKU', 'ชื่อสินค้า', 'ชีต']];
  newAging.getRange(1, 1).setValue('สร้างโดย Migration Script');
  newAging.getRange(2, 1, 1, 4).setValues(headers).setFontWeight('bold');
  
  const lastRow = oldAging.getLastRow();
  if (lastRow < 3) {
    console.log('ไม่มีข้อมูลให้ย้าย');
    return;
  }
  
  // ดึงข้อมูล SKU และ ชื่อสินค้า จาก Aging เดิม
  // Column B=SKU (index 1), Column C=ชื่อ (index 2)
  const oldData = oldAging.getRange(3, 1, lastRow - 2, 12).getValues();
  
  // ดึงข้อมูลจากชีตหลักเพื่อหาว่าสินค้านี้มาจากชีตไหน
  const mainSheets = getMainSheetNames_(ss);
  const skuToSheetMap = {};
  
  mainSheets.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() >= 3) {
      const skus = sheet.getRange(3, 2, sheet.getLastRow() - 2, 1).getValues();
      skus.forEach(row => {
        const sku = String(row[0]).trim();
        if (sku) skuToSheetMap[sku] = sheetName;
      });
    }
  });
  
  const newData = [];
  let order = 1;
  
  oldData.forEach(row => {
    const sku = String(row[1]).trim();
    const name = String(row[2]).trim();
    
    if (sku) {
      const sheetName = skuToSheetMap[sku] || 'Unknown';
      newData.push([order, sku, name, sheetName]);
      order++;
    }
  });
  
  if (newData.length > 0) {
    const targetRange = newAging.getRange(3, 1, newData.length, 4);
    targetRange.setValues(newData);
    newAging.getRange(3, 2, newData.length, 1).setNumberFormat('@'); // ตั้ง SKU เป็น Text
  }
  
  // ปรับความกว้างคอลัมน์
  newAging.setColumnWidth(1, 60);
  newAging.setColumnWidth(2, 120);
  newAging.setColumnWidth(3, 250);
  newAging.setColumnWidth(4, 80);
  
  console.log('Migration สำเร็จ! สร้างชีต Aging_Order เรียบร้อย');
}

import { Router } from 'express';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { getEntireDatabase, updateEntireDatabase } from '../services/db.service.js';
import { requestContext } from '../utils/context.js';

const router = Router();

// Helper to convert Excel date values to standard YYYY-MM-DD string
const excelDateToJSDate = (serial) => {
  if (serial === undefined || serial === null || serial === '') return null;
  if (!isNaN(serial)) {
    // Excel base date is 30-Dec-1899 due to leap year bug in Lotus 1-2-3
    const utc_days  = Math.floor(Number(serial) - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    if (isNaN(date_info.getTime())) return null;
    const y = date_info.getFullYear();
    const m = String(date_info.getMonth() + 1).padStart(2, '0');
    const d = String(date_info.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // If it's already a date string (ISO or standard), parse and format it
  try {
    const dObj = new Date(serial);
    if (!isNaN(dObj.getTime())) {
      const y = dObj.getFullYear();
      const m = String(dObj.getMonth() + 1).padStart(2, '0');
      const d = String(dObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch (e) {}

  return String(serial);
};

// Helper to find the Excel file dynamically in Import_Files/ directory
const getExcelPath = () => {
  const dir = path.resolve('Import_Files');
  if (!fs.existsSync(dir)) {
    throw new Error("Import_Files directory not found.");
  }
  const files = fs.readdirSync(dir);
  const matchedFile = files.find(f => 
    f.startsWith('SVBL_VSM_delivery_management') && 
    (f.endsWith('.xlsm') || f.endsWith('.xlsx') || f.endsWith('.xls'))
  );
  if (!matchedFile) {
    throw new Error("No Excel file found starting with 'SVBL_VSM_delivery_management' in Import_Files folder.");
  }
  return path.join(dir, matchedFile);
};

// Helper to map Excel task to Database Task schema with all 38 columns
const mapExcelTaskToDbTask = (extTask, sno, existingTask = null) => {
  // Determine status mapping
  let dbStatus = 'Yet To Start';
  if (extTask.status) {
    const excelStatus = extTask.status.toLowerCase().trim();
    if (excelStatus === 'delivered') dbStatus = 'Delivered';
    else if (excelStatus === 'in progress') dbStatus = 'In Progress';
    else if (excelStatus === 'standby' || excelStatus === 'blocked' || excelStatus === 'blocked pbo') dbStatus = 'Blocked';
    else dbStatus = extTask.status; // Keep other statuses as they are!
  }

  // Workload and FT hours calculations
  const workloadValue = extTask.workload !== undefined && extTask.workload !== null ? Number(extTask.workload) : 0;
  const totalFTHours = Number((workloadValue * 8).toFixed(0));

  // Determine start & end dates
  const startDate = extTask.startDate || extTask.entryDate || new Date().toISOString().split('T')[0];
  const endDate = extTask.needDate || extTask.commitDate || startDate;

  // Preserve owners, completedFT, progress and daily logs if updating
  const owners = existingTask ? (existingTask.owners || []) : [];
  const completedFT = existingTask ? (existingTask.completedFT || 0) : (dbStatus === 'Delivered' ? totalFTHours : 0);
  const progress = extTask.progress !== undefined ? extTask.progress : (dbStatus === 'Delivered' ? 1 : 0);

  return {
    sno: existingTask ? existingTask.sno : sno,
    function: extTask.function || '--',
    taskType: extTask.taskType || '--',
    taskIds: [extTask.taskId],
    startDate,
    endDate,
    status: dbStatus,
    remarks: extTask.remarks || '',
    owners,
    totalFT: totalFTHours || (existingTask ? existingTask.totalFT : 0),
    completedFT,
    progress,
    include_in_dsr: existingTask ? !!existingTask.include_in_dsr : false,
    last_updated: new Date().toISOString().split('T')[0],
    
    // Excel specific columns to keep the exact same format
    requestBy: extTask.requestBy || '',
    entryDate: extTask.entryDate || null,
    referential: extTask.referential || '',
    destinationSw: extTask.destinationSw || '',
    ptVersion: extTask.ptVersion || '',
    inputsDoc: extTask.inputsDoc || '',
    inputsDate: extTask.inputsDate || null,
    otdOld: extTask.otdOld || '',
    otd: extTask.otd || '',
    ftr: extTask.ftr || '',
    prio: extTask.prio || '',
    commitDate: extTask.commitDate || null,
    custAgreed: extTask.custAgreed || '',
    firstDeliveryDate: extTask.firstDeliveryDate || null,
    deliveredDate: extTask.deliveredDate || null,
    justifications: extTask.justifications || '',
    inputsAnalysisDate: extTask.inputsAnalysisDate || null,
    criteria: extTask.criteria || '',
    inductor: extTask.inductor !== undefined ? extTask.inductor : null,
    size: extTask.size || '',
    extraCosts: extTask.extraCosts !== undefined ? extTask.extraCosts : null,
    qualityStatus: extTask.qualityStatus || '',
    remarks2: extTask.remarks2 || '',
    iteration: extTask.iteration || '',
    ptNeedPublication: extTask.ptNeedPublication || '',
    referentialUnique: extTask.referentialUnique || '',
    workload: workloadValue,
    planification: extTask.planification || '',
    cdrWorkload: extTask.cdrWorkload !== undefined ? extTask.cdrWorkload : null,
    cdrCheck: extTask.cdrCheck || ''
  };
};

// GET /api/manager/scan-excel
// Scans the Import_Files directory and extracts metadata from Task_monitoring sheet
router.get('/scan-excel', async (req, res) => {
  try {
    const dir = path.resolve('Import_Files');
    if (!fs.existsSync(dir)) {
      return res.json({ success: false, error: "Import_Files directory not found." });
    }
    const files = fs.readdirSync(dir);
    const matchedFile = files.find(f => 
      f.startsWith('SVBL_VSM_delivery_management') && 
      (f.endsWith('.xlsm') || f.endsWith('.xlsx') || f.endsWith('.xls'))
    );
    if (!matchedFile) {
      return res.json({ success: false, error: "No Excel file found starting with 'SVBL_VSM_delivery_management' in Import_Files folder." });
    }
    
    const excelPath = path.join(dir, matchedFile);
    const stats = fs.statSync(excelPath);
    
    // Read sheets to get task count in Task_monitoring
    const workbook = XLSX.readFile(excelPath);
    const taskSheet = workbook.Sheets['Task_monitoring'];
    let taskCount = 0;
    
    if (taskSheet) {
      const rows = XLSX.utils.sheet_to_json(taskSheet, { header: 1 });
      for (let r = 9; r < rows.length; r++) {
        if (rows[r] && rows[r][9]) { // Column J index 9 is task ID
          taskCount++;
        }
      }
    }
    
    res.json({
      success: true,
      filename: matchedFile,
      sizeBytes: stats.size,
      lastModified: stats.mtime,
      taskCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/manager/import-excel-full
// Performs the full import of all rows in the Task_monitoring sheet
router.post('/import-excel-full', async (req, res) => {
  try {
    const store = requestContext.getStore();
    const variant = store?.variant || 'vsm_pt';

    const excelPath = getExcelPath();
    const filename = path.basename(excelPath);

    // Safety guardrail: Check if variant matches Excel filename prefix
    const isVsmVariant = variant.toLowerCase().startsWith('vsm');
    const isBsiVariant = variant.toLowerCase().startsWith('bsi');
    
    const isVsmFile = filename.toUpperCase().includes('VSM');
    const isBsiFile = filename.toUpperCase().includes('BSI');
    
    if ((isVsmVariant && !isVsmFile) || (isBsiVariant && !isBsiFile)) {
      return res.status(400).json({ 
        success: false, 
        error: `Variant mismatch: Cannot import Excel file '${filename}' into '${variant.toUpperCase()}' database to prevent database contamination.` 
      });
    }

    const workbook = XLSX.readFile(excelPath);
    const taskSheet = workbook.Sheets['Task_monitoring'];
    
    const excelTasks = [];
    if (taskSheet) {
      const rows = XLSX.utils.sheet_to_json(taskSheet, { header: 1 });
      // Header is on Row 8 (index 7). Values start on Row 10 (index 9).
      for (let r = 9; r < rows.length; r++) {
        const row = rows[r];
        if (!row) continue;
        const taskId = row[9];
        if (taskId) {
          excelTasks.push({
            requestBy: row[0],
            entryDate: excelDateToJSDate(row[1]),
            taskType: row[2],
            function: row[3],
            referential: row[4],
            destinationSw: row[5],
            ptVersion: row[6],
            inputsDoc: row[7],
            inputsDate: excelDateToJSDate(row[8]),
            taskId: String(taskId).trim(),
            status: row[10] ? String(row[10]).trim() : 'Initial',
            otdOld: row[11],
            otd: row[12],
            ftr: row[13],
            startDate: excelDateToJSDate(row[14]),
            needDate: excelDateToJSDate(row[15]),
            prio: row[16],
            commitDate: excelDateToJSDate(row[17]),
            custAgreed: row[18],
            progress: row[19] !== undefined ? Number(row[19]) : 0,
            firstDeliveryDate: excelDateToJSDate(row[20]),
            deliveredDate: excelDateToJSDate(row[21]),
            justifications: row[22],
            inputsAnalysisDate: excelDateToJSDate(row[23]),
            remarks: row[24],
            criteria: row[25],
            inductor: row[26] !== undefined ? Number(row[26]) : null,
            size: row[27],
            extraCosts: row[28] !== undefined ? Number(row[28]) : null,
            qualityStatus: row[29],
            remarks2: row[30],
            iteration: row[31],
            ptNeedPublication: row[32],
            referentialUnique: row[33],
            workload: row[34] !== undefined ? Number(row[34]) : null,
            planification: row[35],
            cdrWorkload: row[36] !== undefined ? Number(row[36]) : null,
            cdrCheck: row[37]
          });
        }
      }
    }
    
    const db = await getEntireDatabase();
    
    // Safety & Isolation: Overwrite only db.excelTasks (cached Excel tasks list).
    // Leave db.tasks (developer timesheets database) 100% untouched to prevent corruption!
    db.excelTasks = excelTasks;
    
    await updateEntireDatabase(db);
    
    res.json({
      success: true,
      message: `Successfully imported Excel workbook. Loaded ${excelTasks.length} tasks.`,
      createdCount: excelTasks.length,
      updatedCount: 0,
      totalCount: excelTasks.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy support endpoints (simplified so they don't break, though they won't be used by the new ManagerHub page)
router.get('/dashboard', async (req, res) => {
  try {
    const db = await getEntireDatabase();
    res.json({
      success: true,
      counts: {
        excelTasks: db.excelTasks?.length || 0,
        dbTasks: db.tasks?.length || 0,
        functions: db.excelFunctions?.length || 0,
        leads: db.excelLeads?.length || 0,
        catalog: db.excelCatalog?.length || 0
      },
      discrepancies: [],
      previewTasks: (db.excelTasks || []).slice(0, 15),
      functions: db.excelFunctions || [],
      leads: db.excelLeads || [],
      catalog: db.excelCatalog || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sync-excel', async (req, res) => {
  res.json({ success: true, message: "Sync bypassed. Use the new import-excel-full endpoint." });
});

router.post('/import-tasks', async (req, res) => {
  res.json({ success: true, message: "Legacy import bypassed. Use the new import-excel-full endpoint." });
});

export default router;

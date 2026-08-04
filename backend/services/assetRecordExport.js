import ExcelJS from "exceljs";

/**
 * Builds the asset-records workbook: a three-row grouped header (base columns
 * merged vertically, then "Equipments" spanning a Status/Count pair per item),
 * followed by one row per store.
 *
 * Pure formatting — takes data, returns a workbook. The caller streams it.
 */

const BASE_COLUMNS = [
  { key: "srNo", header: "Sr No.", width: 8 },
  { key: "storeName", header: "Store Name", width: 26 },
  { key: "technicianName", header: "Technician Name", width: 22 },
  { key: "technicianPhone", header: "Technician Phone", width: 16 },
  { key: "submissionDate", header: "Submission Date", width: 20 },
];

const THIN_BORDER = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const CENTERED = {
  vertical: "middle",
  horizontal: "center",
  wrapText: true,
};

const buildHeaders = (worksheet, equipmentList, dynamicColumnCount) => {
  const row1 = BASE_COLUMNS.map((c) => c.header);
  const row2 = BASE_COLUMNS.map(() => "");
  const row3 = BASE_COLUMNS.map(() => "");

  if (equipmentList.length > 0) {
    row1.push("Equipments", ...Array(dynamicColumnCount - 1).fill(""));
    for (const eq of equipmentList) {
      row2.push(eq.name, "");
      row3.push("Status", "Count");
    }
  }

  const headerRows = [
    worksheet.addRow(row1),
    worksheet.addRow(row2),
    worksheet.addRow(row3),
  ];

  // Base columns span all three header rows.
  for (let col = 1; col <= BASE_COLUMNS.length; col++) {
    worksheet.mergeCells(1, col, 3, col);
  }

  if (equipmentList.length > 0) {
    const start = BASE_COLUMNS.length + 1;
    worksheet.mergeCells(1, start, 1, worksheet.columns.length);

    let col = start;
    for (let i = 0; i < equipmentList.length; i++) {
      worksheet.mergeCells(2, col, 2, col + 1);
      col += 2;
    }
  }

  for (const row of headerRows) {
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5E7EB" },
      };
      cell.border = THIN_BORDER;
      cell.alignment = CENTERED;
    });
  }
};

const buildRow = (record, equipmentList, srNo) => {
  const items = Array.isArray(record.equipment) ? record.equipment : [];

  // Match on id first, fall back to name for records predating equipmentId.
  const byId = new Map();
  const byName = new Map();
  for (const item of items) {
    if (item?.equipmentId) byId.set(String(item.equipmentId), item);
    if (item?.name) byName.set(String(item.name).toLowerCase(), item);
  }

  const row = {
    srNo,
    storeName: record.storeName || "",
    technicianName: record.technician?.name || "",
    technicianPhone: record.technician?.phoneNumber || "",
    submissionDate: record.submissionDate || record.createdAt || null,
  };

  for (const eq of equipmentList) {
    const id = String(eq._id);
    const item = byId.get(id) || byName.get(String(eq.name).toLowerCase());

    if (!item) {
      row[`eq_${id}_status`] = "Not recorded";
      row[`eq_${id}_count`] = "";
      continue;
    }

    row[`eq_${id}_status`] = item.isPresent ? "Available" : "Not available";
    row[`eq_${id}_count`] = typeof item.count === "number" ? item.count : 0;
  }

  return row;
};

export const buildAssetRecordsWorkbook = ({ equipmentList, records }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Complaint Management System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Asset Records", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  const dynamicColumns = equipmentList.flatMap((eq) => {
    const id = String(eq._id);
    return [
      { key: `eq_${id}_status`, width: 16 },
      { key: `eq_${id}_count`, width: 12 },
    ];
  });

  worksheet.columns = [
    ...BASE_COLUMNS.map(({ key, width }) => ({ key, width })),
    ...dynamicColumns,
  ];

  buildHeaders(worksheet, equipmentList, dynamicColumns.length);

  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: worksheet.columns.length },
  };

  records.forEach((record, index) => {
    worksheet.addRow(buildRow(record, equipmentList, index + 1));
  });

  worksheet.getColumn("submissionDate").numFmt = "dd-mmm-yyyy";

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 3) return;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = THIN_BORDER;
      cell.alignment = CENTERED;
    });
  });

  return workbook;
};

export const assetRecordsFileName = (date = new Date()) =>
  `asset-records-${date.toISOString().slice(0, 10)}.xlsx`;

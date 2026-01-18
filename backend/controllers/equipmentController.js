import Equipment from "../models/Equipment.js";
import AssetRecord from "../models/AssetRecord.js";
import Client from "../models/Client.js";
import ExcelJS from "exceljs";
import Store from "../models/Store.js";

const findStoreByName = async (storeName) => {
  const name = String(storeName || "").trim();
  if (!name) return null;
  return Store.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  }).select("name managers");
};

const ensureStoreExistsByName = async (storeName) => {
  const name = String(storeName || "").trim();
  if (!name) return null;

  const existing = await Store.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });
  if (existing) return existing;

  try {
    return await Store.create({ name });
  } catch {
    return Store.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
  }
};

// Get equipment list
export const getEquipmentList = async (req, res) => {
  try {
    const equipment = await Equipment.find({ isActive: true }).sort({
      name: 1,
    });
    res.json({
      success: true,
      equipment,
    });
  } catch (error) {
    console.error("Error fetching equipment list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch equipment list",
    });
  }
};

// Create new equipment
export const createEquipment = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Equipment name is required",
      });
    }

    const trimmedName = name.trim();

    // Check if equipment already exists (case-insensitive)
    const existingEquipment = await Equipment.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
      isActive: true,
    });

    if (existingEquipment) {
      return res.status(400).json({
        success: false,
        message: "Equipment with this name already exists",
      });
    }

    const equipment = new Equipment({
      name: trimmedName,
    });

    await equipment.save();

    res.status(201).json({
      success: true,
      message: "Equipment created successfully",
      equipment,
    });
  } catch (error) {
    console.error("Error creating equipment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create equipment",
    });
  }
};

// Update equipment
export const updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const equipment = await Equipment.findById(id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found",
      });
    }

    // Check if name is being changed and if it conflicts (case-insensitive)
    if (name && name.trim() !== equipment.name) {
      const trimmedName = name.trim();
      const existingEquipment = await Equipment.findOne({
        name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        _id: { $ne: id },
        isActive: true,
      });

      if (existingEquipment) {
        return res.status(400).json({
          success: false,
          message: "Equipment with this name already exists",
        });
      }
    }

    // Update fields
    if (name !== undefined && name.trim()) {
      equipment.name = name.trim();
    }

    if (isActive !== undefined) {
      equipment.isActive = isActive;
    }

    await equipment.save();

    res.json({
      success: true,
      message: "Equipment updated successfully",
      equipment,
    });
  } catch (error) {
    console.error("Error updating equipment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update equipment",
    });
  }
};

// Delete equipment
export const deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    const equipment = await Equipment.findById(id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found",
      });
    }

    // Soft delete by setting isActive to false
    equipment.isActive = false;
    await equipment.save();

    res.json({
      success: true,
      message: "Equipment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting equipment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete equipment",
    });
  }
};

// Submit asset record
export const submitAssetRecord = async (req, res) => {
  try {
    const { storeName, equipment, notes } = req.body;
    const technicianId = req.user.id;

    await ensureStoreExistsByName(storeName);

    const assetRecord = new AssetRecord({
      technician: technicianId,
      storeName: storeName.trim(),
      equipment,
      notes: notes?.trim(),
    });

    await assetRecord.save();
    await assetRecord.populate("technician", "name phoneNumber");

    res.status(201).json({
      success: true,
      message: "Asset record submitted successfully",
      record: assetRecord,
    });
  } catch (error) {
    console.error("Error submitting asset record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit asset record",
    });
  }
};

// Get all asset records (Admin)
export const getAssetRecords = async (req, res) => {
  try {
    const { page = 1, limit = 10, storeName, technicianId } = req.query;

    const filter = {};
    if (storeName) filter.storeName = { $regex: storeName, $options: "i" };
    if (technicianId) filter.technician = technicianId;

    const records = await AssetRecord.find(filter)
      .populate("technician", "name phoneNumber")
      .sort({ submissionDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const storeNames = [
      ...new Set(records.map((r) => r.storeName).filter(Boolean)),
    ];
    const stores = await Store.find({
      name: { $in: storeNames },
      isActive: true,
    }).select("name managers");
    const storeByLowerName = new Map(
      stores.map((s) => [String(s.name).toLowerCase(), s]),
    );

    const recordsWithStore = records.map((r) => {
      const store =
        storeByLowerName.get(String(r.storeName).toLowerCase()) || null;
      return {
        ...r.toObject(),
        store,
      };
    });

    const total = await AssetRecord.countDocuments(filter);

    res.json({
      success: true,
      records: recordsWithStore,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (error) {
    console.error("Error fetching asset records:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch asset records",
    });
  }
};

// Get technician's own asset records
export const getTechnicianAssetRecords = async (req, res) => {
  try {
    const technicianId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const records = await AssetRecord.find({ technician: technicianId })
      .populate("technician", "name phoneNumber")
      .sort({ submissionDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AssetRecord.countDocuments({
      technician: technicianId,
    });

    res.json({
      success: true,
      records,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (error) {
    console.error("Error fetching technician asset records:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch asset records",
    });
  }
};

// Get client asset records (for client's stores)
export const getClientAssetRecords = async (req, res) => {
  try {
    const clientId = req.user.id;

    // For now, get all records since we don't have specific client-store mapping
    // In a real scenario, you'd filter by client's actual stores
    const records = await AssetRecord.find({})
      .populate("technician", "name phoneNumber")
      .sort({ submissionDate: -1 });

    res.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error("Error fetching client asset records:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch asset records",
    });
  }
};

// Get asset record by ID
export const getAssetRecordById = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await AssetRecord.findById(id).populate(
      "technician",
      "name phoneNumber",
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Asset record not found",
      });
    }

    const store = await findStoreByName(record.storeName);
    res.json({
      success: true,
      record: {
        ...record.toObject(),
        store,
      },
    });
  } catch (error) {
    console.error("Error fetching asset record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch asset record",
    });
  }
};

// Update asset record (Admin only)
export const updateAssetRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { storeName, equipment, notes } = req.body;

    const record = await AssetRecord.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Asset record not found",
      });
    }

    // Update fields
    if (storeName !== undefined && storeName.trim()) {
      record.storeName = storeName.trim();
      await ensureStoreExistsByName(record.storeName);
    }

    if (equipment !== undefined) {
      record.equipment = equipment;
    }

    if (notes !== undefined) {
      record.notes = notes?.trim();
    }

    await record.save();
    await record.populate("technician", "name phoneNumber");

    res.json({
      success: true,
      message: "Asset record updated successfully",
      record,
    });
  } catch (error) {
    console.error("Error updating asset record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update asset record",
    });
  }
};

// Delete asset record (Admin only)
export const deleteAssetRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await AssetRecord.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Asset record not found",
      });
    }

    await AssetRecord.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Asset record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting asset record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete asset record",
    });
  }
};

// export all asset records to excel
export const exportAssetRecordsExcel = async (req, res) => {
  try {
    const equipmentList = await Equipment.find({ isActive: true }).sort({
      name: 1,
    });

    // IMPORTANT:
    // Technicians can submit multiple records for the same store.
    // For Excel export we only include the latest record per store (case-insensitive).
    const allRecordsSorted = await AssetRecord.find({})
      .populate("technician", "name phoneNumber")
      .sort({ submissionDate: -1, createdAt: -1 });

    const seenStoreKeys = new Set();
    const records = [];
    for (const record of allRecordsSorted) {
      const storeKey = String(record.storeName || "")
        .trim()
        .toLowerCase();

      // If storeName is missing, treat it as a single bucket.
      const dedupeKey = storeKey || "__unknown_store__";
      if (seenStoreKeys.has(dedupeKey)) continue;
      seenStoreKeys.add(dedupeKey);
      records.push(record);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Complaint Management System";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Asset Records", {
      views: [{ state: "frozen", ySplit: 3 }],
    });

    const baseColumns = [
      { key: "srNo", width: 8 },
      { key: "storeName", width: 26 },
      { key: "technicianName", width: 22 },
      { key: "technicianPhone", width: 16 },
      { key: "submissionDate", width: 20 },
    ];

    const dynamicColumns = equipmentList.flatMap((eq) => {
      const id = String(eq._id);
      return [
        { key: `eq_${id}_status`, width: 16 },
        { key: `eq_${id}_count`, width: 12 },
      ];
    });

    worksheet.columns = [...baseColumns, ...dynamicColumns];

    // Build grouped headers
    const headerRow1Values = [
      "Sr No.",
      "Store Name",
      "Technician Name",
      "Technician Phone",
      "Submission Date",
    ];
    const headerRow2Values = ["", "", "", "", ""]; // base columns merged across 3 rows
    const headerRow3Values = ["", "", "", "", ""]; // base columns merged across 3 rows

    if (equipmentList.length > 0) {
      headerRow1Values.push(
        "Equipments",
        ...Array(dynamicColumns.length - 1).fill(""),
      );
      for (const eq of equipmentList) {
        headerRow2Values.push(eq.name, "");
        headerRow3Values.push("Status", "Count");
      }
    }

    const headerRow1 = worksheet.addRow(headerRow1Values);
    const headerRow2 = worksheet.addRow(headerRow2Values);
    const headerRow3 = worksheet.addRow(headerRow3Values);

    // Merge base headers (A1:A3 etc.)
    for (let col = 1; col <= baseColumns.length; col++) {
      worksheet.mergeCells(1, col, 3, col);
    }

    if (equipmentList.length > 0) {
      const equipmentsStartCol = baseColumns.length + 1;
      const equipmentsEndCol = worksheet.columns.length;

      // Merge the top-level "Equipments" header across all equipment columns
      worksheet.mergeCells(1, equipmentsStartCol, 1, equipmentsEndCol);

      // Merge equipment name headers (row 2 spans 2 columns)
      let startCol = equipmentsStartCol;
      for (let i = 0; i < equipmentList.length; i++) {
        worksheet.mergeCells(2, startCol, 2, startCol + 1);
        startCol += 2;
      }
    }

    // Style header rows
    const headerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
    const headerBorder = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    for (const row of [headerRow1, headerRow2, headerRow3]) {
      row.height = 20;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true };
        cell.fill = headerFill;
        cell.border = headerBorder;
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
      });
    }

    worksheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3, column: worksheet.columns.length },
    };

    let srNo = 1;
    for (const record of records) {
      const storeName = record.storeName || "";
      const technicianName = record.technician?.name || "";
      const technicianPhone = record.technician?.phoneNumber || "";
      const submissionDate = record.submissionDate || record.createdAt || null;

      const equipmentItems = Array.isArray(record.equipment)
        ? record.equipment
        : [];

      // Create fast lookup for this record's equipment by equipmentId (preferred) or name
      const equipmentById = new Map();
      const equipmentByName = new Map();
      for (const item of equipmentItems) {
        if (item?.equipmentId)
          equipmentById.set(String(item.equipmentId), item);
        if (item?.name)
          equipmentByName.set(String(item.name).toLowerCase(), item);
      }

      const row = {
        srNo,
        storeName,
        technicianName,
        technicianPhone,
        submissionDate,
      };

      for (const eq of equipmentList) {
        const id = String(eq._id);
        const statusKey = `eq_${id}_status`;
        const countKey = `eq_${id}_count`;

        const item =
          equipmentById.get(id) ||
          equipmentByName.get(String(eq.name).toLowerCase());

        if (!item) {
          row[statusKey] = "Not recorded";
          row[countKey] = "";
          continue;
        }

        row[statusKey] = item.isPresent ? "Available" : "Not available";
        row[countKey] = typeof item.count === "number" ? item.count : 0;
      }

      worksheet.addRow(row);
      srNo += 1;
    }

    // Format date column
    worksheet.getColumn("submissionDate").numFmt = "dd-mmm-yyyy";

    // Improve readability for data rows
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= 3) return;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
      });
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `asset-records-${dateStamp}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting asset records to Excel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export asset records",
    });
  }
};

import { equipmentService } from "../services/equipmentService.js";
import {
  buildAssetRecordsWorkbook,
  assetRecordsFileName,
} from "../services/assetRecordExport.js";
import { respondWithError } from "../utils/httpError.js";

/**
 * HTTP only. Business rules live in services/equipmentService.js; database
 * access in data/equipmentData.js and data/assetRecordData.js.
 */

// ---- equipment catalogue ----

export const getEquipmentList = async (req, res) => {
  try {
    const equipment = await equipmentService.listEquipment();
    res.json({ success: true, equipment });
  } catch (error) {
    console.error("Error fetching equipment list:", error);
    respondWithError(res, error, "Failed to fetch equipment list");
  }
};

export const createEquipment = async (req, res) => {
  try {
    const equipment = await equipmentService.createEquipment({
      name: req.body.name,
    });

    res.status(201).json({
      success: true,
      message: "Equipment created successfully",
      equipment,
    });
  } catch (error) {
    console.error("Error creating equipment:", error);
    respondWithError(res, error, "Failed to create equipment");
  }
};

export const updateEquipment = async (req, res) => {
  try {
    const equipment = await equipmentService.updateEquipment({
      id: req.params.id,
      name: req.body.name,
      isActive: req.body.isActive,
      fields: req.body.fields,
    });

    res.json({
      success: true,
      message: "Equipment updated successfully",
      equipment,
    });
  } catch (error) {
    console.error("Error updating equipment:", error);
    respondWithError(res, error, "Failed to update equipment");
  }
};

export const deleteEquipment = async (req, res) => {
  try {
    await equipmentService.deleteEquipment(req.params.id);
    res.json({ success: true, message: "Equipment deleted successfully" });
  } catch (error) {
    console.error("Error deleting equipment:", error);
    respondWithError(res, error, "Failed to delete equipment");
  }
};

// ---- asset records ----

export const submitAssetRecord = async (req, res) => {
  try {
    const record = await equipmentService.submitRecord({
      technicianId: req.user.id,
      storeName: req.body.storeName,
      equipment: req.body.equipment,
      notes: req.body.notes,
    });

    res.status(201).json({
      success: true,
      message: "Asset record submitted successfully",
      record,
    });
  } catch (error) {
    console.error("Error submitting asset record:", error);
    respondWithError(res, error, "Failed to submit asset record");
  }
};

export const getAssetRecords = async (req, res) => {
  try {
    const { records, pagination } = await equipmentService.listRecords(
      req.query,
    );
    res.json({ success: true, records, pagination });
  } catch (error) {
    console.error("Error fetching asset records:", error);
    respondWithError(res, error, "Failed to fetch asset records");
  }
};

export const getTechnicianAssetRecords = async (req, res) => {
  try {
    const { records, pagination } =
      await equipmentService.listRecordsForTechnician({
        technicianId: req.user.id,
        ...req.query,
      });

    res.json({ success: true, records, pagination });
  } catch (error) {
    console.error("Error fetching technician asset records:", error);
    respondWithError(res, error, "Failed to fetch asset records");
  }
};

export const getClientAssetRecords = async (req, res) => {
  try {
    const records = await equipmentService.listRecordsForClient();
    res.json({ success: true, records });
  } catch (error) {
    console.error("Error fetching client asset records:", error);
    respondWithError(res, error, "Failed to fetch asset records");
  }
};

export const getAssetRecordById = async (req, res) => {
  try {
    const record = await equipmentService.getRecordById(req.params.id);
    res.json({ success: true, record });
  } catch (error) {
    console.error("Error fetching asset record:", error);
    respondWithError(res, error, "Failed to fetch asset record");
  }
};

export const updateAssetRecord = async (req, res) => {
  try {
    const record = await equipmentService.updateRecord({
      id: req.params.id,
      storeName: req.body.storeName,
      equipment: req.body.equipment,
      notes: req.body.notes,
    });

    res.json({
      success: true,
      message: "Asset record updated successfully",
      record,
    });
  } catch (error) {
    console.error("Error updating asset record:", error);
    respondWithError(res, error, "Failed to update asset record");
  }
};

export const deleteAssetRecord = async (req, res) => {
  try {
    await equipmentService.deleteRecord(req.params.id);
    res.json({ success: true, message: "Asset record deleted successfully" });
  } catch (error) {
    console.error("Error deleting asset record:", error);
    respondWithError(res, error, "Failed to delete asset record");
  }
};

export const exportAssetRecordsExcel = async (req, res) => {
  try {
    const workbook = buildAssetRecordsWorkbook(
      await equipmentService.getExportData(),
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${assetRecordsFileName()}"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting asset records to Excel:", error);
    respondWithError(res, error, "Failed to export asset records");
  }
};

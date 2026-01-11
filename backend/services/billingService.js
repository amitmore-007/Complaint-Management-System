import BillingRecord from "../models/BillingRecord.js";
import Complaint from "../models/Complaint.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

const createHttpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const parseBoolean = (value, defaultValue = false) => {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "0" || v === "no") return false;
  }
  return defaultValue;
};

const parseMaterials = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeMaterialInput = (materials) => {
  return materials
    .map((m) => {
      const name = typeof m?.name === "string" ? m.name.trim() : "";
      const quantity =
        m?.quantity === "" || m?.quantity == null ? null : Number(m.quantity);
      const price =
        m?.price === "" || m?.price == null ? null : Number(m.price);
      const billPhotoField =
        typeof m?.billPhotoField === "string" ? m.billPhotoField : null;

      return {
        name,
        quantity: Number.isFinite(quantity) ? quantity : null,
        price: Number.isFinite(price) ? price : null,
        billPhotoField,
      };
    })
    .filter(
      (m) => m.name || m.quantity != null || m.price != null || m.billPhotoField
    );
};

const indexFilesByFieldName = (files) => {
  const list = Array.isArray(files) ? files : [];
  const map = new Map();
  for (const file of list) {
    if (file?.fieldname) map.set(file.fieldname, file);
  }
  return map;
};

export const billingService = {
  technician: {
    createBillingRecord: async ({
      technicianId,
      complaintId,
      isComplaintResolved,
      materialsUsed,
      materials,
      files,
    }) => {
      if (!complaintId) {
        throw createHttpError(400, "complaintId is required");
      }

      const complaint = await Complaint.findById(complaintId).select(
        "assignedTechnician status title description location complaintId"
      );

      if (!complaint) {
        throw createHttpError(404, "Complaint not found");
      }

      if (!complaint.assignedTechnician) {
        throw createHttpError(
          400,
          "Complaint is not assigned to any technician"
        );
      }

      if (String(complaint.assignedTechnician) !== String(technicianId)) {
        throw createHttpError(
          403,
          "You can only create billing for your assigned complaints"
        );
      }

      const existing = await BillingRecord.findOne({
        complaint: complaint._id,
      });
      if (existing) {
        throw createHttpError(
          409,
          "Billing record already submitted for this complaint"
        );
      }

      const safeIsResolved = parseBoolean(isComplaintResolved, false);
      const safeMaterialsUsed = parseBoolean(materialsUsed, false);

      const rawMaterials = parseMaterials(materials);
      const normalizedMaterials = normalizeMaterialInput(rawMaterials);

      const fileByField = indexFilesByFieldName(files);

      let storedMaterials = [];
      if (safeMaterialsUsed) {
        if (normalizedMaterials.length === 0) {
          throw createHttpError(400, "Please add at least one material");
        }

        storedMaterials = await Promise.all(
          normalizedMaterials.map(async (m) => {
            const stored = {
              name: m.name,
              quantity: m.quantity ?? 0,
              price: m.price ?? 0,
              billPhoto: undefined,
            };

            if (m.billPhotoField) {
              const file = fileByField.get(m.billPhotoField);
              if (file) {
                const uploaded = await uploadToCloudinary(file, "cms-billing");
                stored.billPhoto = {
                  url: uploaded.url,
                  publicId: uploaded.publicId,
                  originalName: uploaded.originalName,
                  uploadedAt: new Date(),
                };
              }
            }

            return stored;
          })
        );
      }

      const billingRecord = new BillingRecord({
        complaint: complaint._id,
        technician: technicianId,
        isComplaintResolved: safeIsResolved,
        materialsUsed: safeMaterialsUsed,
        materials: storedMaterials,
        submittedAt: new Date(),
      });

      await billingRecord.save();

      return BillingRecord.findById(billingRecord._id)
        .populate("complaint", "complaintId title description location status")
        .populate("technician", "name phoneNumber");
    },

    listBillingRecords: async ({ technicianId, page = 1, limit = 20 }) => {
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
      const safePage = Math.max(parseInt(page, 10) || 1, 1);

      const filter = { technician: technicianId };

      const records = await BillingRecord.find(filter)
        .populate("complaint", "complaintId title description location status")
        .sort({ submittedAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit);

      const total = await BillingRecord.countDocuments(filter);

      return {
        records,
        pagination: {
          total,
          page: safePage,
          pages: Math.ceil(total / safeLimit),
          limit: safeLimit,
        },
      };
    },
  },

  admin: {
    listBillingRecords: async ({ page = 1, limit = 30 }) => {
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
      const safePage = Math.max(parseInt(page, 10) || 1, 1);

      const records = await BillingRecord.find({})
        .populate("complaint", "complaintId title description location status")
        .populate("technician", "name phoneNumber")
        .sort({ submittedAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit);

      const total = await BillingRecord.countDocuments({});

      return {
        records,
        pagination: {
          total,
          page: safePage,
          pages: Math.ceil(total / safeLimit),
          limit: safeLimit,
        },
      };
    },

    getBillingRecord: async ({ id }) => {
      const record = await BillingRecord.findById(id)
        .populate("complaint", "complaintId title description location status")
        .populate("technician", "name phoneNumber")
        .populate("updatedByAdmin", "name phoneNumber");

      if (!record) {
        throw createHttpError(404, "Billing record not found");
      }

      return record;
    },

    updateBillingRecord: async ({
      adminId,
      id,
      materialsUsed,
      isComplaintResolved,
      materials,
    }) => {
      const record = await BillingRecord.findById(id);
      if (!record) {
        throw createHttpError(404, "Billing record not found");
      }

      const safeMaterialsUsed =
        materialsUsed != null
          ? parseBoolean(materialsUsed, record.materialsUsed)
          : record.materialsUsed;

      const safeIsResolved =
        isComplaintResolved != null
          ? parseBoolean(isComplaintResolved, record.isComplaintResolved)
          : record.isComplaintResolved;

      let nextMaterials = record.materials;
      if (safeMaterialsUsed) {
        const incomingMaterials = Array.isArray(materials)
          ? materials
          : parseMaterials(materials);

        const normalized = normalizeMaterialInput(incomingMaterials).map(
          (m) => ({
            name: m.name,
            quantity: m.quantity ?? 0,
            price: m.price ?? 0,
            billPhoto: undefined,
          })
        );

        nextMaterials = normalized.map((m, idx) => ({
          ...m,
          billPhoto: record.materials?.[idx]?.billPhoto,
        }));
      } else {
        nextMaterials = [];
      }

      record.materialsUsed = safeMaterialsUsed;
      record.isComplaintResolved = safeIsResolved;
      record.materials = nextMaterials;
      record.updatedByAdmin = adminId;
      record.updatedByAdminAt = new Date();

      await record.save();

      return BillingRecord.findById(record._id)
        .populate("complaint", "complaintId title description location status")
        .populate("technician", "name phoneNumber")
        .populate("updatedByAdmin", "name");
    },
  },
};

export const getHttpErrorStatus = (error) => {
  const statusCode = error?.statusCode;
  return Number.isInteger(statusCode) ? statusCode : null;
};

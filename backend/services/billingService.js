import { billingRecordData } from "../data/billingRecordData.js";
import { complaintData } from "../data/complaintData.js";
import { inventoryData } from "../data/inventoryData.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { createHttpError } from "../utils/httpError.js";

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

const resolveMaterialAgainstCatalog = async (name) => {
  const itemNameKey = String(name || "").trim().toLowerCase();
  if (!itemNameKey) return null;

  const catalogItem = await inventoryData.findByNameKey(itemNameKey);
  if (!catalogItem) return null;

  return { gstType: catalogItem.gstType, gstPercent: catalogItem.gstPercent };
};

const computeMaterialTotals = ({ quantity, price, gst }) => {
  const subtotal = Number(quantity || 0) * Number(price || 0);
  const gstPercent = gst?.gstType === "gst" ? Number(gst.gstPercent) || 0 : 0;
  const gstAmount = gst?.gstType === "gst" ? subtotal * (gstPercent / 100) : 0;

  return {
    subtotal,
    gstType: gst?.gstType,
    gstPercent,
    gstAmount,
    totalAmount: subtotal + gstAmount,
  };
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
  // One list for both roles: a technician sees only their own submissions,
  // an admin sees everything. This used to be two near-identical functions.
  listBillingRecords: async ({ role, userId, page = 1, limit = 30 }) => {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const filter = role === "admin" ? {} : { technician: userId };

    const [records, total] = await Promise.all([
      billingRecordData.list({
        filter,
        page: safePage,
        limit: safeLimit,
      }),
      billingRecordData.count(filter),
    ]);

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

  technician: {
    createBillingRecord: async ({
      technicianId,
      complaintId,
      isComplaintResolved,
      files,
    }) => {
      if (!complaintId) {
        throw createHttpError(400, "complaintId is required");
      }

      const complaint = await complaintData.findForBilling(complaintId);

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

      const existing = await billingRecordData.findByComplaint(complaint._id);
      if (existing) {
        throw createHttpError(
          409,
          "Billing record already submitted for this complaint"
        );
      }

      const safeIsResolved = parseBoolean(isComplaintResolved, false);
      const safeMaterialsUsed = !!complaint.materialsUsed;

      const fileByField = indexFilesByFieldName(files);

      let storedMaterials = [];
      if (safeMaterialsUsed) {
        const rows = complaint.materials || [];
        if (rows.length === 0) {
          throw createHttpError(
            400,
            "No materials were recorded when this complaint was resolved"
          );
        }

        storedMaterials = await Promise.all(
          rows.map(async (row, index) => {
            const catalogItem = row.item;
            if (!catalogItem) {
              throw createHttpError(
                400,
                "One of the recorded materials is no longer available"
              );
            }

            const stored = {
              name: catalogItem.itemName,
              quantity: row.quantity ?? 0,
              price: catalogItem.unitRate ?? 0,
              ...computeMaterialTotals({
                quantity: row.quantity,
                price: catalogItem.unitRate,
                gst: {
                  gstType: catalogItem.gstType,
                  gstPercent: catalogItem.gstPercent,
                },
              }),
              billPhoto: undefined,
            };

            const file = fileByField.get(`billPhoto_${index}`);
            if (file) {
              const uploaded = await uploadToCloudinary(file, "cms-billing");
              stored.billPhoto = {
                url: uploaded.url,
                publicId: uploaded.publicId,
                originalName: uploaded.originalName,
                uploadedAt: new Date(),
              };
            }

            return stored;
          })
        );
      }

      const billingRecord = await billingRecordData.create({
        complaint: complaint._id,
        technician: technicianId,
        isComplaintResolved: safeIsResolved,
        materialsUsed: safeMaterialsUsed,
        materials: storedMaterials,
        submittedAt: new Date(),
      });

      await billingRecordData.save(billingRecord);

      return billingRecordData.findByIdPopulated(billingRecord._id);
    },

  },

  admin: {

    getBillingRecord: async ({ id }) => {
      const record = await billingRecordData.findByIdPopulated(id);

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
      const record = await billingRecordData.findById(id);
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

        const normalized = await Promise.all(
          normalizeMaterialInput(incomingMaterials).map(async (m) => {
            // Legacy billing records may reference material names that
            // predate the inventory catalog — fall back to plain totals
            // (no GST) instead of hard-blocking the admin's save.
            const catalogGst = await resolveMaterialAgainstCatalog(m.name);
            return {
              name: m.name,
              quantity: m.quantity ?? 0,
              price: m.price ?? 0,
              ...computeMaterialTotals({
                quantity: m.quantity,
                price: m.price,
                gst: catalogGst,
              }),
              billPhoto: undefined,
            };
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

      await billingRecordData.save(record);

      return billingRecordData.findByIdPopulated(record._id);
    },
  },
};


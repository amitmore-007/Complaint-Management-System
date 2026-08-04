import { equipmentData } from "../data/equipmentData.js";
import { assetRecordData } from "../data/assetRecordData.js";
import { storeData } from "../data/storeData.js";
import { storeService } from "./storeService.js";
import { createHttpError } from "../utils/httpError.js";

const paginate = ({ page = 1, limit = 10 }) => ({
  page: Math.max(parseInt(page, 10) || 1, 1),
  limit: Math.min(Math.max(parseInt(limit, 10) || 10, 1), 200),
});

/** Attach the matching Store (for manager contacts) to each record. */
const attachStores = async (records) => {
  const names = [...new Set(records.map((r) => r.storeName).filter(Boolean))];
  const stores = names.length ? await storeData.findActiveByNames(names) : [];

  const byLowerName = new Map(
    stores.map((s) => [String(s.name).toLowerCase(), s]),
  );

  return records.map((record) => ({
    ...record.toObject(),
    store: byLowerName.get(String(record.storeName).toLowerCase()) || null,
  }));
};

export const equipmentService = {
  // ---- equipment catalogue ----

  listEquipment: () => equipmentData.listActive(),

  createEquipment: async ({ name }) => {
    if (!name || !name.trim()) {
      throw createHttpError(400, "Equipment name is required");
    }

    const trimmed = name.trim();

    if (await equipmentData.findActiveByName({ name: trimmed })) {
      throw createHttpError(400, "Equipment with this name already exists");
    }

    return equipmentData.create({ name: trimmed });
  },

  updateEquipment: async ({ id, name, isActive, fields }) => {
    const equipment = await equipmentData.findById(id);
    if (!equipment) throw createHttpError(404, "Equipment not found");

    if (name && name.trim() !== equipment.name) {
      const clash = await equipmentData.findActiveByName({
        name: name.trim(),
        excludeId: id,
      });
      if (clash) {
        throw createHttpError(400, "Equipment with this name already exists");
      }
    }

    if (name !== undefined && name.trim()) equipment.name = name.trim();
    if (isActive !== undefined) equipment.isActive = isActive;
    if (fields !== undefined) equipment.fields = fields;

    await equipmentData.save(equipment);
    return equipment;
  },

  /** Soft delete — records reference equipment by id, so keep the row. */
  deleteEquipment: async (id) => {
    const equipment = await equipmentData.findById(id);
    if (!equipment) throw createHttpError(404, "Equipment not found");

    equipment.isActive = false;
    await equipmentData.save(equipment);
  },

  // ---- asset records ----

  submitRecord: async ({ technicianId, storeName, equipment, notes }) => {
    if (!storeName || !String(storeName).trim()) {
      throw createHttpError(400, "Store name is required");
    }

    await storeService.ensureExistsByName(storeName);

    const record = await assetRecordData.create({
      technician: technicianId,
      storeName: String(storeName).trim(),
      equipment,
      notes: notes?.trim(),
    });

    return assetRecordData.save(record);
  },

  listRecords: async ({ page, limit, storeName, technicianId }) => {
    const paging = paginate({ page, limit });

    const filter = {};
    if (storeName) filter.storeName = { $regex: storeName, $options: "i" };
    if (technicianId) filter.technician = technicianId;

    const [records, total] = await Promise.all([
      assetRecordData.list({ filter, ...paging }),
      assetRecordData.count(filter),
    ]);

    return {
      records: await attachStores(records),
      pagination: {
        currentPage: paging.page,
        totalPages: Math.ceil(total / paging.limit),
        totalRecords: total,
      },
    };
  },

  listRecordsForTechnician: async ({ technicianId, page, limit }) => {
    const paging = paginate({ page, limit });
    const filter = { technician: technicianId };

    const [records, total] = await Promise.all([
      assetRecordData.list({ filter, ...paging }),
      assetRecordData.count(filter),
    ]);

    return {
      records,
      pagination: {
        currentPage: paging.page,
        totalPages: Math.ceil(total / paging.limit),
        totalRecords: total,
      },
    };
  },

  // Clients currently see every record — there is no client/store mapping yet.
  listRecordsForClient: () => assetRecordData.listAll(),

  getRecordById: async (id) => {
    const record = await assetRecordData.findById(id);
    if (!record) throw createHttpError(404, "Asset record not found");

    return {
      ...record.toObject(),
      store: await storeData.findByExactName(record.storeName),
    };
  },

  updateRecord: async ({ id, storeName, equipment, notes }) => {
    const record = await assetRecordData.findById(id);
    if (!record) throw createHttpError(404, "Asset record not found");

    if (storeName !== undefined && storeName.trim()) {
      record.storeName = storeName.trim();
      await storeService.ensureExistsByName(record.storeName);
    }
    if (equipment !== undefined) record.equipment = equipment;
    if (notes !== undefined) record.notes = notes?.trim();

    return assetRecordData.save(record);
  },

  deleteRecord: async (id) => {
    const record = await assetRecordData.findById(id);
    if (!record) throw createHttpError(404, "Asset record not found");

    await assetRecordData.deleteById(id);
  },

  /**
   * Technicians can submit repeatedly for the same store; the export shows only
   * the most recent record per store (case-insensitive).
   */
  getExportData: async () => {
    const [equipmentList, allRecords] = await Promise.all([
      equipmentData.listActive(),
      assetRecordData.listAllNewestFirst(),
    ]);

    const seen = new Set();
    const records = [];
    for (const record of allRecords) {
      const key =
        String(record.storeName || "").trim().toLowerCase() ||
        "__unknown_store__";
      if (seen.has(key)) continue;
      seen.add(key);
      records.push(record);
    }

    return { equipmentList, records };
  },
};

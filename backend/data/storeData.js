import Store from "../models/Store.js";

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const storeData = {
  findById: (id) => Store.findById(id),

  findByIdName: (id) => Store.findById(id).select("name"),

  /** Exact, case-insensitive name match — used by the store filter. */
  findIdsByExactName: async (name) => {
    const stores = await Store.find({
      name: new RegExp(`^${escapeRegex(name)}$`, "i"),
    }).select("_id");

    return stores.map((s) => s._id);
  },

  /** Partial name match — used by free-text search. */
  findIdsByPartialName: async (term) => {
    const stores = await Store.find({
      name: new RegExp(escapeRegex(term), "i"),
    }).select("_id");

    return stores.map((s) => s._id);
  },

  findByExactName: (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return null;
    return Store.findOne({
      name: new RegExp(`^${escapeRegex(trimmed)}$`, "i"),
    }).select("name managers");
  },

  /** Active stores matching any of the given names — for bulk attachment. */
  findActiveByNames: (names) =>
    Store.find({ name: { $in: names }, isActive: true }).select("name managers"),

  listActive: () => Store.find({ isActive: true }).select("name managers"),

  list: () => Store.find({}),

  // Carries the geofence pin too — the admin store list shows which stores are
  // pinned, and an unpinned store is silently ungated.
  listActiveSorted: () =>
    Store.find({ isActive: true })
      .select("name managers isActive location geofenceRadiusMeters")
      .sort({ name: 1 }),

  findByExactNameWithStatus: (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return null;
    return Store.findOne({
      name: new RegExp(`^${escapeRegex(trimmed)}$`, "i"),
    }).select("name managers isActive");
  },

  save: (store) => store.save(),

  create: (data) => Store.create(data),

  count: (filter = {}) => Store.countDocuments(filter),
};

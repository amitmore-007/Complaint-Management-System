import Equipment from "../models/Equipment.js";

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const exactName = (name) =>
  new RegExp(`^${escapeRegex(String(name).trim())}$`, "i");

export const equipmentData = {
  listActive: () => Equipment.find({ isActive: true }).sort({ name: 1 }),

  findById: (id) => Equipment.findById(id),

  /** Case-insensitive name lookup, optionally excluding one document. */
  findActiveByName: ({ name, excludeId }) => {
    const filter = { name: exactName(name), isActive: true };
    if (excludeId) filter._id = { $ne: excludeId };
    return Equipment.findOne(filter);
  },

  create: (data) => Equipment.create(data),

  save: (equipment) => equipment.save(),
};

import mongoose from "mongoose";
import Complaint from "../models/Complaint.js";

/**
 * Every Complaint read/write goes through here. Services never import the
 * Mongoose model, so query shape, populate specs and role scoping all live in
 * exactly one place.
 */

// One populate set for every complaint read.
const POPULATE = [
  { path: "createdBy", select: "name phoneNumber role" },
  { path: "assignedTechnician", select: "name phoneNumber" },
  { path: "assignedBy", select: "name" },
  { path: "store", select: "name managers" },
  { path: "materials.item", select: "itemName" },
];

/**
 * Which complaints a given user may see.
 *  - admin      : everything
 *  - client     : only the ones they raised
 *  - technician : the ones they raised OR the ones assigned to them
 */
const scopeFor = ({ id, role }) => {
  if (role === "admin") return {};

  if (role === "client") {
    return { createdBy: id, creatorType: "client" };
  }

  return {
    $or: [
      { createdBy: id, creatorType: "technician" },
      { assignedTechnician: id },
    ],
  };
};

// Combine scope + filters without either side clobbering the other's $or.
const withScope = (scope, filter = {}) => {
  const hasScope = Object.keys(scope).length > 0;
  const hasFilter = Object.keys(filter).length > 0;

  if (!hasScope) return filter;
  if (!hasFilter) return scope;
  return { $and: [scope, filter] };
};

export const isValidId = (value) => mongoose.isValidObjectId(value);

export const complaintData = {
  /** Paginated list, already scoped to what `user` may see. */
  listForUser: async ({ user, filter = {}, page = 1, limit = 10 }) => {
    const query = withScope(scopeFor(user), filter);

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate(POPULATE)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit),
      Complaint.countDocuments(query),
    ]);

    return { complaints, total };
  },

  /** Single complaint, scoped — returns null when the user may not see it. */
  findByIdForUser: ({ id, user }) =>
    Complaint.findOne(withScope(scopeFor(user), { _id: id })).populate(POPULATE),

  /** Unscoped fetch, for flows that do their own permission check. */
  findById: (id) => Complaint.findById(id),

  findByIdPopulated: (id) => Complaint.findById(id).populate(POPULATE),

  /** Slim projection used when a technician submits billing for a complaint. */
  findForBilling: (id) =>
    Complaint.findById(id)
      .select(
        "assignedTechnician status title description complaintId materialsUsed materials store",
      )
      .populate("materials.item", "itemName unitRate gstType gstPercent"),

  /** The complaint a technician is actively working on. */
  findAssignedToTechnician: ({ id, technicianId }) =>
    Complaint.findOne({ _id: id, assignedTechnician: technicianId }).populate(
      POPULATE,
    ),

  listAssignedToTechnician: ({ technicianId, status, sort }) =>
    Complaint.find({ assignedTechnician: technicianId, status })
      .populate(POPULATE)
      .sort(sort),

  countAssignedToTechnician: ({ technicianId, status }) =>
    Complaint.countDocuments({ assignedTechnician: technicianId, status }),

  countAllAssignedToTechnician: (technicianId) =>
    Complaint.countDocuments({ assignedTechnician: technicianId }),

  create: (data) => Complaint.create(data),

  /** Persist an already-loaded document, then refresh its populated fields. */
  save: async (complaint) => {
    await complaint.save();
    await complaint.populate(POPULATE);
    return complaint;
  },

  populate: (complaint) => complaint.populate(POPULATE),

  deleteById: (id) => Complaint.findByIdAndDelete(id),

  countActiveForClient: (clientId) =>
    Complaint.countDocuments({
      createdBy: clientId,
      creatorType: "client",
      status: { $in: ["pending", "assigned", "in-progress"] },
    }),

  countActiveForTechnician: (technicianId) =>
    Complaint.countDocuments({
      assignedTechnician: technicianId,
      status: { $in: ["assigned", "in-progress"] },
    }),

  countByCreator: ({ userId, creatorType }) =>
    Complaint.countDocuments({ createdBy: userId, creatorType }),

  count: ({ status, createdAt } = {}) =>
    Complaint.countDocuments({
      ...(status ? { status } : {}),
      ...(createdAt ? { createdAt } : {}),
    }),

  /** Quantity of each inventory item consumed across all complaints. */
  aggregateMaterialUsage: (inventoryCollectionName) =>
    Complaint.aggregate([
      { $match: { materialsUsed: true, "materials.0": { $exists: true } } },
      { $unwind: "$materials" },
      {
        $lookup: {
          from: inventoryCollectionName,
          localField: "materials.item",
          foreignField: "_id",
          as: "invItem",
        },
      },
      { $unwind: "$invItem" },
      {
        $group: {
          _id: "$invItem.itemNameKey",
          usedQty: { $sum: "$materials.quantity" },
        },
      },
    ]),

  /**
   * Record a failed geofence check, outside the normal save path.
   *
   * Written immediately rather than with the status update, because in
   * "enforce" mode the update is about to be rejected and never saves — a
   * blocked attempt would otherwise leave no trace at all. The attempt is
   * appended (capped at 10) so repeated tries do not overwrite each other.
   *
   * `field` is only passed when this call also owns persisting the reading;
   * in "warn" mode the status update saves it as part of its own write.
   */
  recordGeofenceFailure: ({ id, action, reading, field }) =>
    Complaint.findByIdAndUpdate(id, {
      $set: {
        geofenceFlagged: true,
        ...(field ? { [field]: reading } : {}),
      },
      $push: {
        geofenceAttempts: {
          $each: [{ action, reading }],
          $slice: -10,
        },
      },
    }),

  /** Admin geofence review queue — every status update that failed its check. */
  listGeofenceFlagged: ({ limit = 100 } = {}) =>
    Complaint.find({ geofenceFlagged: true })
      .select(
        "complaintId title status store assignedTechnician startLocation resolveLocation geofenceAttempts updatedAt",
      )
      .populate("store", "name location geofenceRadiusMeters")
      .populate("assignedTechnician", "name phoneNumber")
      .sort({ updatedAt: -1 })
      .limit(Math.min(limit, 200)),

  /** Complaint owning a store-approval link, by the link token's hash. */
  findByApprovalTokenHash: (tokenHash) =>
    Complaint.findOne({ "storeApproval.recipients.tokenHash": tokenHash }).populate(
      POPULATE,
    ),

  /**
   * Record a store's answer only if nobody has answered yet, so two managers
   * tapping at once cannot both win.
   */
  respondToStoreApproval: ({ tokenHash, set }) =>
    Complaint.findOneAndUpdate(
      {
        "storeApproval.recipients.tokenHash": tokenHash,
        "storeApproval.status": "pending",
      },
      { $set: set },
      { new: true },
    ).populate(POPULATE),

  listPending: () =>
    Complaint.find({ status: "pending" })
      .populate("createdBy", "phoneNumber")
      .populate("store", "name")
      .sort({ createdAt: 1 }),

  listRecent: ({ createdAt, limit = 5 } = {}) =>
    Complaint.find(createdAt ? { createdAt } : {})
      .populate("createdBy", "name phoneNumber role")
      .populate("assignedTechnician", "name")
      .populate("store", "name")
      .sort({ createdAt: -1 })
      .limit(limit),
};

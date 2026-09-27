import crypto from "crypto";

import { userData } from "../data/userData.js";
import { complaintData } from "../data/complaintData.js";
import { normalizePhoneNumber } from "../utils/phone.js";
import { createHttpError } from "../utils/httpError.js";
import { portalHashPin } from "../utils/portalPin.js";

const MANAGED_ROLES = ["client", "technician"];

const paginate = ({ page = 1, limit = 50 }) => ({
  page: Math.max(parseInt(page, 10) || 1, 1),
  limit: Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200),
});

const searchFilter = (role, search) => {
  const filter = { role };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
    ];
  }
  return filter;
};

const requireManagedUser = async (userId) => {
  const user = await userData.findById(userId);
  if (!user || !MANAGED_ROLES.includes(user.role)) {
    throw createHttpError(404, "User not found");
  }
  return user;
};

/** Shared create path for clients and technicians. */
const createManagedUser = async ({ role, name, phoneNumber, adminId }) => {
  if (!name || !phoneNumber) {
    throw createHttpError(400, "Name and phone number are required");
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const existing = await userData.findByPhoneAndRole({
    phoneNumber: normalizedPhone,
    role,
  });
  if (existing) {
    throw createHttpError(
      400,
      `${role === "client" ? "Client" : "Technician"} with this phone number already exists`,
    );
  }

  return userData.create({
    name: name.trim(),
    phoneNumber: normalizedPhone,
    role,
    isVerified: true,
    isActive: true,
    createdBy: adminId,
  });
};

/** Shared update path for clients and technicians. */
const updateManagedUser = async ({ role, id, name, phoneNumber, isActive }) => {
  const user = await userData.findByIdAndRole({ id, role });
  if (!user) {
    throw createHttpError(
      404,
      `${role === "client" ? "Client" : "Technician"} not found`,
    );
  }

  const normalizedPhone = phoneNumber
    ? normalizePhoneNumber(phoneNumber)
    : null;

  if (normalizedPhone && normalizedPhone !== user.phoneNumber) {
    const clash = await userData.findByPhoneAndRole({
      phoneNumber: normalizedPhone,
      role,
    });
    if (clash && String(clash._id) !== String(id)) {
      throw createHttpError(400, "Phone number already in use");
    }
    user.phoneNumber = normalizedPhone;
    // Old number may now belong to someone else — kill every session issued
    // under it so a device still holding a token loses access.
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  }

  if (name) user.name = name.trim();
  if (isActive !== undefined) user.isActive = isActive;

  await userData.save(user);
  return user;
};

export const userService = {
  listClients: async ({ page, limit, search }) => {
    const paging = paginate({ page, limit });
    const filter = searchFilter("client", search);

    const [clients, total] = await Promise.all([
      userData.list({
        filter,
        select: "name phoneNumber isActive createdAt",
        ...paging,
      }),
      userData.count(filter),
    ]);

    const withStats = await Promise.all(
      clients.map(async (client) => ({
        ...client.toObject(),
        complaintCount: await complaintData.countByCreator({
          userId: client._id,
          creatorType: "client",
        }),
      })),
    );

    return {
      clients: withStats,
      pagination: {
        total,
        page: paging.page,
        pages: Math.ceil(total / paging.limit),
      },
    };
  },

  listTechnicians: async ({ page, limit, search }) => {
    const paging = paginate({ page, limit });
    const filter = searchFilter("technician", search);

    const [technicians, total] = await Promise.all([
      userData.list({
        filter,
        select: "name phoneNumber isActive createdAt +attendanceToken",
        ...paging,
      }),
      userData.count(filter),
    ]);

    const withStats = await Promise.all(
      technicians.map(async (tech) => {
        const [activeAssignments, completedAssignments, totalAssignments] =
          await Promise.all([
            complaintData.countActiveForTechnician(tech._id),
            complaintData.countAssignedToTechnician({
              technicianId: tech._id,
              status: "resolved",
            }),
            complaintData.countAllAssignedToTechnician(tech._id),
          ]);

        const obj = tech.toObject();
        return {
          ...obj,
          // Expose only whether a portal link exists, never the token itself.
          hasAttendanceToken: !!obj.attendanceToken,
          attendanceToken: undefined,
          activeAssignments,
          completedAssignments,
          totalAssignments,
        };
      }),
    );

    return {
      technicians: withStats,
      pagination: {
        total,
        page: paging.page,
        pages: Math.ceil(total / paging.limit),
      },
    };
  },

  createClient: ({ name, phoneNumber, adminId }) =>
    createManagedUser({ role: "client", name, phoneNumber, adminId }),

  createTechnician: ({ name, phoneNumber, adminId }) =>
    createManagedUser({ role: "technician", name, phoneNumber, adminId }),

  updateClient: ({ id, name, phoneNumber, isActive }) =>
    updateManagedUser({ role: "client", id, name, phoneNumber, isActive }),

  updateTechnician: ({ id, name, phoneNumber, isActive }) =>
    updateManagedUser({ role: "technician", id, name, phoneNumber, isActive }),

  toggleStatus: async ({ userId, isActive }) => {
    const user = await requireManagedUser(userId);

    user.isActive = isActive;
    await userData.save(user);

    return user;
  },

  remove: async (userId) => {
    const user = await requireManagedUser(userId);

    if (user.role === "client") {
      const active = await complaintData.countActiveForClient(userId);
      if (active > 0) {
        throw createHttpError(400, "Cannot delete client with active complaints");
      }
    } else {
      const active = await complaintData.countActiveForTechnician(userId);
      if (active > 0) {
        throw createHttpError(
          400,
          "Cannot delete technician with active assignments",
        );
      }
    }

    await userData.deleteById(userId);
  },

  generateAttendanceToken: async ({ userId, userRole, pin }) => {
    if (!userRole || !["admin", "technician"].includes(userRole)) {
      throw createHttpError(400, "userRole must be admin or technician.");
    }
    if (!pin || !/^\d{4}$/.test(pin)) {
      throw createHttpError(400, "PIN must be exactly 4 digits.");
    }

    const user = await userData.findByIdAndRole({ id: userId, role: userRole });
    if (!user) throw createHttpError(404, "User not found.");

    const attendanceToken = crypto.randomBytes(16).toString("hex");

    await userData.setAttendanceToken({
      id: userId,
      attendanceToken,
      attendancePin: portalHashPin(pin, attendanceToken),
    });

    return {
      attendanceToken,
      portalPath: `/attendance/portal/${attendanceToken}`,
    };
  },

  revokeAttendanceToken: async ({ userId, userRole }) => {
    if (!userRole || !["admin", "technician"].includes(userRole)) {
      throw createHttpError(400, "userRole must be admin or technician.");
    }

    await userData.clearAttendanceToken({ id: userId, role: userRole });
  },
};

import SmartDevice from "../models/SmartDevice.js";
import SmartDeviceEnergy from "../models/SmartDeviceEnergy.js";
import TuyaApiUsage from "../models/TuyaApiUsage.js";

export const smartDeviceData = {
  listByIds: (deviceIds) =>
    SmartDevice.find({ deviceId: { $in: deviceIds } }).sort({ name: 1 }).lean(),

  findByDeviceId: (deviceId) => SmartDevice.findOne({ deviceId }).lean(),

  upsert: ({ deviceId, set }) =>
    SmartDevice.findOneAndUpdate(
      { deviceId },
      { $set: set },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),

  listEnergyChunks: ({ deviceId, from, to }) =>
    SmartDeviceEnergy.find({ deviceId, eventTime: { $gte: from, $lte: to } })
      .sort({ eventTime: 1 })
      .select("-_id eventTime kwh")
      .lean(),

  // Upsert so overlapping log windows are idempotent.
  saveEnergyChunks: (chunks) =>
    chunks.length
      ? SmartDeviceEnergy.bulkWrite(
          chunks.map(({ deviceId, eventTime, kwh }) => ({
            updateOne: {
              filter: { deviceId, eventTime },
              update: { $set: { kwh } },
              upsert: true,
            },
          })),
          { ordered: false },
        )
      : null,

  // Total kWh per device within [from, to).
  sumEnergyByDevice: ({ deviceIds, from, to }) =>
    SmartDeviceEnergy.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIds },
          eventTime: { $gte: from, $lt: to },
        },
      },
      { $group: { _id: "$deviceId", kwh: { $sum: "$kwh" } } },
    ]),

  incrementApiUsage: (month) =>
    TuyaApiUsage.updateOne({ month }, { $inc: { calls: 1 } }, { upsert: true }),

  findApiUsage: (month) => TuyaApiUsage.findOne({ month }).lean(),

  // kWh per bucket label (formatted in `timezone`) within [from, to).
  sumEnergyByBucket: ({ deviceId, from, to, format, timezone }) =>
    SmartDeviceEnergy.aggregate([
      { $match: { deviceId, eventTime: { $gte: from, $lt: to } } },
      {
        $group: {
          _id: { $dateToString: { format, date: "$eventTime", timezone } },
          kwh: { $sum: "$kwh" },
        },
      },
    ]),
};

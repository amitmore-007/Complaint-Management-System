import { smartDeviceService } from "../services/smartDeviceService.js";
import { logHttpError, respondWithError } from "../utils/httpError.js";

export const adminListSmartDevices = async (req, res) => {
  try {
    const { devices, syncError, apiUsage } =
      await smartDeviceService.admin.listDevices();
    return res.status(200).json({ success: true, devices, syncError, apiUsage });
  } catch (error) {
    logHttpError("List smart devices error", error);
    return respondWithError(res, error, "Internal server error");
  }
};

export const adminSyncSmartDevices = async (req, res) => {
  try {
    const { devices, syncError, apiUsage } =
      await smartDeviceService.admin.listDevices({ force: true });
    return res.status(200).json({ success: true, devices, syncError, apiUsage });
  } catch (error) {
    logHttpError("Sync smart devices error", error);
    return respondWithError(res, error, "Internal server error");
  }
};

export const adminGetSmartDeviceEnergy = async (req, res) => {
  try {
    const history = await smartDeviceService.admin.getEnergyHistory({
      deviceId: req.params.deviceId,
      granularity: req.query.granularity,
    });
    return res.status(200).json({ success: true, ...history });
  } catch (error) {
    logHttpError("Get smart device energy error", error);
    return respondWithError(res, error, "Internal server error");
  }
};

export const adminGetSmartDevicePower = async (req, res) => {
  try {
    const { hours, intervals } = await smartDeviceService.admin.getPowerHistory({
      deviceId: req.params.deviceId,
      hours: req.query.hours,
    });
    return res.status(200).json({ success: true, hours, intervals });
  } catch (error) {
    logHttpError("Get smart device power error", error);
    return respondWithError(res, error, "Internal server error");
  }
};

import { storeApprovalService } from "../services/storeApprovalService.js";
import { logHttpError, respondWithError } from "../utils/httpError.js";

// ---- Public (link from the store manager's WhatsApp, no login) ----

export const getStoreApproval = async (req, res) => {
  try {
    const approval = await storeApprovalService.getByToken(req.params.token);
    return res.status(200).json({ success: true, approval });
  } catch (error) {
    logHttpError("Get store approval error", error);
    return respondWithError(res, error, "Internal server error");
  }
};

export const respondToStoreApproval = async (req, res) => {
  try {
    const approval = await storeApprovalService.respond({
      token: req.params.token,
      decision: req.body?.decision,
      reason: req.body?.reason,
    });
    return res.status(200).json({ success: true, approval });
  } catch (error) {
    logHttpError("Respond to store approval error", error);
    return respondWithError(res, error, "Internal server error");
  }
};

// ---- Admin ----

export const adminApproveStoreVisit = async (req, res) => {
  try {
    const complaint = await storeApprovalService.approveOnBehalf({
      complaintId: req.params.id,
      adminId: req.user.id,
    });
    return res.status(200).json({
      success: true,
      message: "Visit approved on behalf of the store",
      complaint,
    });
  } catch (error) {
    logHttpError("Approve store visit error", error);
    return respondWithError(res, error, "Internal server error");
  }
};

export const adminResendStoreApproval = async (req, res) => {
  try {
    const complaint = await storeApprovalService.resend({
      complaintId: req.params.id,
    });
    return res.status(200).json({
      success: true,
      message: "Approval request sent to the store",
      complaint,
    });
  } catch (error) {
    logHttpError("Resend store approval error", error);
    return respondWithError(res, error, "Internal server error");
  }
};

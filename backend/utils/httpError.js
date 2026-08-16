/**
 * Services signal HTTP-meaningful failures by throwing one of these; controllers
 * translate it back into a status code. Previously copy-pasted into
 * billingService and inventoryService.
 */
export const createHttpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

export const getHttpErrorStatus = (error) => {
  const statusCode = error?.statusCode;
  return Number.isInteger(statusCode) ? statusCode : null;
};

/**
 * Log a caught error at a level that matches what it is.
 *
 * A deliberate 4xx — wrong status transition, off-site geofence rejection,
 * missing resolution notes — is the API working as designed, not a fault. A
 * full stack trace for one reads as a crash and buries the 500s that matter.
 */
export const logHttpError = (context, error) => {
  const status = getHttpErrorStatus(error);

  if (status && status < 500) {
    console.warn(`${context}: ${status} ${error.message}`);
    return;
  }

  console.error(`${context}:`, error);
};

/**
 * The one place controllers turn a thrown error into a response. Keeps the
 * "leak the message only for deliberate errors, never for a 500" rule in a
 * single spot.
 */
export const respondWithError = (res, error, fallbackMessage) => {
  const status = getHttpErrorStatus(error) ?? 500;

  return res.status(status).json({
    success: false,
    message: status === 500 ? fallbackMessage : error.message,
    ...(status === 500 && process.env.NODE_ENV === "development"
      ? { error: error.message }
      : {}),
  });
};

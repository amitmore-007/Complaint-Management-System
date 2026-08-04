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

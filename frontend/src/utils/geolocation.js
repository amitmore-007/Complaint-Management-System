/**
 * Browser location capture for geofenced actions (start / resolve a complaint).
 *
 * A single getCurrentPosition() call routinely resolves with the first fix the
 * OS has to hand — often a cell-tower estimate accurate to a kilometre, which
 * would fail a 150m fence for a technician standing inside the store. So we
 * watch for a few seconds and keep the best reading instead.
 *
 * Requires a secure context: navigator.geolocation is unavailable on plain
 * HTTP outside localhost.
 */

/** Accurate enough to stop sampling early — no point burning the full window. */
const GOOD_ENOUGH_ACCURACY_M = 25;

/** How long to keep improving the fix before settling for the best so far. */
const SAMPLE_MS = 8000;

/**
 * Absolute ceiling, including the permission prompt. Generous because a cold
 * GPS start — first use of the day, no recent fix cached by the OS — routinely
 * takes 20s+ outdoors and longer indoors. A short ceiling here meant the first
 * attempt of a shift reliably failed and the second one worked, which reads to
 * a technician as the app being broken.
 */
const HARD_STOP_MS = 30000;

/**
 * A fix the OS already has is accepted as a starting point rather than waiting
 * for a fresh one, which is what makes the first attempt usable. Kept short:
 * at driving speed even 30s of staleness is a few hundred metres, and any
 * fresher reading that arrives during the sample window replaces it.
 */
const MAX_CACHED_FIX_AGE_MS = 30000;

/**
 * Coarse network-based fallback, started alongside the GPS attempt. It usually
 * answers in a second or two, so there is something to send even if GPS never
 * produces a fix. Accuracy is poor, and the server's own weak-signal rule
 * rejects it when it is too poor to mean anything.
 */
const COARSE_TIMEOUT_MS = 10000;

export const GEOLOCATION_ERRORS = {
  UNSUPPORTED:
    "This device or browser cannot report your location. Please contact your admin.",
  INSECURE_CONTEXT:
    "Location is only available over a secure (https) connection. Please contact your admin.",
  PERMISSION_DENIED:
    "Location access is blocked. Enable location for this site in your browser settings, then try again.",
  POSITION_UNAVAILABLE:
    "Could not determine your location. Move outside or near a window and try again.",
  TIMEOUT:
    "Timed out finding your location. Move outside or near a window and try again.",
};

export class GeolocationCaptureError extends Error {
  constructor(code) {
    super(GEOLOCATION_ERRORS[code] ?? GEOLOCATION_ERRORS.POSITION_UNAVAILABLE);
    this.name = "GeolocationCaptureError";
    this.code = code;
  }
}

const mapBrowserError = (error) => {
  if (error?.code === 1) return "PERMISSION_DENIED";
  if (error?.code === 3) return "TIMEOUT";
  return "POSITION_UNAVAILABLE";
};

/**
 * Sample position for a few seconds and resolve with the most accurate reading.
 * Rejects with a GeolocationCaptureError carrying a user-facing message.
 */
export const getBestPosition = ({
  sampleMs = SAMPLE_MS,
  hardStopMs = HARD_STOP_MS,
} = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new GeolocationCaptureError("UNSUPPORTED"));
      return;
    }
    if (window.isSecureContext === false) {
      reject(new GeolocationCaptureError("INSECURE_CONTEXT"));
      return;
    }

    let best = null;
    let settled = false;
    let watchId = null;
    let sampleTimer = null;
    let hardTimer = null;

    const cleanup = () => {
      clearTimeout(sampleTimer);
      clearTimeout(hardTimer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };

    /** Keep the most accurate reading seen from either source. */
    const consider = (position) => {
      if (settled) return;
      if (!best || position.coords.accuracy < best.coords.accuracy) {
        best = position;
      }
    };

    const settle = () => {
      if (settled) return;
      settled = true;
      cleanup();

      if (best) resolve(best);
      else reject(new GeolocationCaptureError("TIMEOUT"));
    };

    const failWith = (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new GeolocationCaptureError(code));
    };

    // Coarse, network-based, runs in parallel — this is what makes the first
    // attempt of the day succeed while GPS is still acquiring.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        consider(position);
        // Deliberately does not settle: a wifi fix is a floor, not an answer.
        // Let the sample window run so GPS can better it.
      },
      () => {
        // Nothing to do — the GPS watch below is the primary source.
      },
      {
        enableHighAccuracy: false,
        maximumAge: MAX_CACHED_FIX_AGE_MS,
        timeout: COARSE_TIMEOUT_MS,
      },
    );

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        consider(position);
        if (best.coords.accuracy <= GOOD_ENOUGH_ACCURACY_M) settle();
      },
      (error) => {
        // A late error after we already have a usable fix is not fatal.
        if (best) settle();
        else failWith(mapBrowserError(error));
      },
      {
        enableHighAccuracy: true,
        maximumAge: MAX_CACHED_FIX_AGE_MS,
        timeout: hardStopMs,
      },
    );

    /**
     * The sample window only ends things once something has been captured.
     * Ending it empty would throw away the remaining time in which a cold GPS
     * is still likely to deliver — so with no reading yet, wait for the ceiling.
     */
    sampleTimer = setTimeout(() => {
      if (best) settle();
    }, sampleMs);
    hardTimer = setTimeout(settle, hardStopMs);
  });

/**
 * Capture the technician's position and attach it to an outgoing status
 * update. `capturedAt` lets the server reject a stale fix being replayed.
 *
 * Uses set(), not append(): the same FormData can pass through here more than
 * once (a retry re-runs the mutation on the object it was given), and a
 * duplicated field arrives server-side as an array, which parses to NaN — a
 * valid reading would be read as no reading at all.
 */
export const appendPositionTo = async (formData) => {
  const position = await getBestPosition();

  formData.set("latitude", String(position.coords.latitude));
  formData.set("longitude", String(position.coords.longitude));
  if (Number.isFinite(position.coords.accuracy)) {
    formData.set("accuracy", String(position.coords.accuracy));
  }
  formData.set("capturedAt", String(position.timestamp || Date.now()));
  // A previous attempt may have recorded a failure; this one succeeded.
  formData.delete("locationErrorCode");

  return position;
};

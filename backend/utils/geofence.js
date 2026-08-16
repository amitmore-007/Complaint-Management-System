/**
 * Geofencing for technician status updates: a complaint may only be started or
 * resolved from within its store's radius.
 *
 * Everything here is pure — no I/O — so the caller decides what to load and
 * what to do with the verdict. Distance is haversine (great-circle on a
 * sphere), computed in Node against the already-loaded store document. At the
 * 50-500m scale its spherical-earth error is sub-centimetre, far below GPS
 * noise, so an ellipsoidal formula or a $geoNear round-trip buys nothing.
 */

const EARTH_RADIUS_M = 6371000;

/**
 * A poor fix must not buy unlimited slack: without a cap, a spoofed
 * accuracy of 5000m would clear any fence.
 */
const MAX_ACCURACY_BUFFER_M = 75;

/** Worse than this is not a location, it is a cell-tower guess. */
const UNUSABLE_ACCURACY_M = 300;

/** Older than this and it is a saved fix being replayed, not a live one. */
const MAX_FIX_AGE_MS = 2 * 60 * 1000;

/**
 * An update captured on site but sent later by the offline queue is genuinely
 * old, so freshness is relaxed for it. Distance is not — the recorded position
 * still has to be at the store, which is the check that actually matters.
 */
const MAX_QUEUED_FIX_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * Implied travel speed above which the fix is physically impossible. Generous
 * on purpose — it should catch teleportation, not a technician on a highway.
 */
const MAX_PLAUSIBLE_SPEED_KMH = 150;

/** Below this gap, clock skew dominates and the speed figure is meaningless. */
const MIN_SPEED_CHECK_GAP_MS = 60 * 1000;

export const GEOFENCE_MODES = ["off", "warn", "enforce"];

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** Great-circle distance between two {lat, lng} points, in metres. */
export const distanceMeters = (from, to) => {
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

/**
 * A repeated multipart field arrives as an array. Number(["1","1"]) is NaN, so
 * a duplicate would read as no location at all — take the last one, which is
 * the most recently captured.
 */
const single = (value) =>
  Array.isArray(value) ? value[value.length - 1] : value;

/** Pull a usable position out of the raw multipart body. */
const parsePosition = (raw) => {
  const lat = Number(single(raw?.latitude));
  const lng = Number(single(raw?.longitude));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // Exactly (0, 0) is in the Gulf of Guinea — always a placeholder, never real.
  if (lat === 0 && lng === 0) return null;

  const accuracy = Number(single(raw.accuracy));
  const capturedAt = Number(single(raw.capturedAt));

  return {
    lat,
    lng,
    accuracyMeters: Number.isFinite(accuracy) ? accuracy : null,
    capturedAt: Number.isFinite(capturedAt) ? new Date(capturedAt) : null,
  };
};

/**
 * Implied speed between the user's previous fix and this one. Returns null
 * whenever the comparison would be noise rather than signal.
 */
const impliedSpeedKmh = (previous, current, capturedAt) => {
  if (!previous?.capturedAt) return null;
  if (!Number.isFinite(previous.lat) || !Number.isFinite(previous.lng)) {
    return null;
  }

  const elapsedMs = capturedAt.getTime() - new Date(previous.capturedAt).getTime();
  if (elapsedMs < MIN_SPEED_CHECK_GAP_MS) return null;

  const metres = distanceMeters(
    { lat: previous.lat, lng: previous.lng },
    { lat: current.lat, lng: current.lng },
  );

  return metres / 1000 / (elapsedMs / 1000 / 3600);
};

/**
 * Decide whether a status update may proceed.
 *
 * @param {object}   store            store document, may be unpinned
 * @param {object}   body             raw request body (multipart text fields)
 * @param {object?}  lastKnownLocation the user's previous fix, for the speed check
 * @param {object}   context          { mode, ipAddress, userAgent }
 *
 * @returns {{ applicable: boolean, ok?: boolean, code?: string,
 *             snapshot?: object, distance?: number, speedKmh?: number }}
 *   `applicable: false` means the store has no pin, so there is nothing to
 *   check and the update passes untouched. This is deliberate: geofencing
 *   switches on per store as each one is pinned, and never blocks work at a
 *   store the admin has not configured yet.
 */
export const evaluateGeofence = ({
  store,
  body,
  lastKnownLocation = null,
  context = {},
  now = Date.now(),
}) => {
  const coordinates = store?.location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return { applicable: false, code: "STORE_NOT_PINNED" };
  }

  const audit = {
    mode: context.mode,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    recordedAt: new Date(now),
  };

  const position = parsePosition(body);
  if (!position) {
    return {
      applicable: true,
      ok: false,
      code: "NO_LOCATION",
      snapshot: {
        ...audit,
        withinGeofence: false,
        failureCode: "NO_LOCATION",
        // Why the device could not supply one — permission denied, timeout,
        // insecure context. Distinguishes refusal from bad signal in review.
        clientErrorCode: single(body?.locationErrorCode),
      },
    };
  }

  const capturedAt = position.capturedAt ?? new Date(now);
  const queuedOffline = String(single(body.queuedOffline)) === "true";
  const radius = store.geofenceRadiusMeters ?? 150;
  const distance = distanceMeters(position, {
    lat: coordinates[1],
    lng: coordinates[0],
  });

  const snapshot = {
    ...audit,
    lat: position.lat,
    lng: position.lng,
    accuracyMeters: position.accuracyMeters,
    capturedAt,
    distanceMeters: distance,
    queuedOffline,
  };

  const fail = (code) => ({
    applicable: true,
    ok: false,
    code,
    distance,
    radius,
    accuracy: position.accuracyMeters,
    snapshot: { ...snapshot, withinGeofence: false, failureCode: code },
  });

  if (position.accuracyMeters !== null && position.accuracyMeters > UNUSABLE_ACCURACY_M) {
    return fail("WEAK_SIGNAL");
  }

  const maxAgeMs = queuedOffline ? MAX_QUEUED_FIX_AGE_MS : MAX_FIX_AGE_MS;
  if (now - capturedAt.getTime() > maxAgeMs) return fail("STALE_FIX");

  const speedKmh = impliedSpeedKmh(lastKnownLocation, position, capturedAt);
  if (speedKmh !== null && speedKmh > MAX_PLAUSIBLE_SPEED_KMH) {
    return { ...fail("IMPLAUSIBLE_SPEED"), speedKmh };
  }

  // Credit the device's own error estimate, but only up to the cap.
  const buffer = Math.min(position.accuracyMeters ?? 0, MAX_ACCURACY_BUFFER_M);
  const ok = distance - buffer <= radius;

  return {
    applicable: true,
    ok,
    code: ok ? null : "OUT_OF_RANGE",
    distance,
    radius,
    accuracy: position.accuracyMeters,
    speedKmh,
    snapshot: {
      ...snapshot,
      withinGeofence: ok,
      failureCode: ok ? undefined : "OUT_OF_RANGE",
    },
  };
};

/** What the technician is told, and what they should do about it. */
export const geofenceFailureMessage = (result, storeName = "the store") => {
  switch (result.code) {
    case "NO_LOCATION":
      return "Location is required to update this complaint. Enable location access for this site and try again.";
    case "WEAK_SIGNAL":
      return `GPS signal is too weak to confirm you are on site (accurate to about ${Math.round(
        result.accuracy,
      )}m). Step outside or near a window and try again.`;
    case "STALE_FIX":
      return "Your location reading has expired. Please try again.";
    case "IMPLAUSIBLE_SPEED":
      return "Your location could not be verified. Please try again from the store, or contact your admin.";
    default:
      // "in a straight line" matters: Google Maps reports route distance,
      // which is always longer, so a bare figure looks wrong to anyone who
      // checks it on a map.
      return `You must be at ${storeName} to update this complaint. You are about ${Math.round(
        result.distance,
      )}m away in a straight line.`;
  }
};

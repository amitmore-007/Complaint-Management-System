import { DateTime } from "luxon";
import { smartDeviceData } from "../data/smartDeviceData.js";
import { createHttpError } from "../utils/httpError.js";
import { normalizePhoneNumber } from "../utils/phone.js";
import {
  isTuyaConfigured,
  setTuyaCallListener,
  tuyaRequest,
} from "../utils/tuyaClient.js";

/**
 * Smart breakers (Tuya / Smart Life) for the admin "Smart Devices" tab.
 *
 * Built to stay well inside Tuya's free allowance (~30k API calls/month):
 *   - energy: the `add_ele` report log (≈0.1 kWh chunks, ~110/day/device) is
 *     imported in the background every TUYA_ENERGY_SYNC_MINUTES. This is the
 *     only background work — Tuya keeps logs ~7 days, so it must not depend on
 *     someone opening the tab. Power history is derived from these chunks.
 *   - live status (power/voltage/current/switch/online): fetched only when an
 *     admin opens the tab, reused for a few minutes. Tuya serves a cached value
 *     while the breaker sleeps, so polling it in the background buys little.
 */

const TIMEZONE = "Asia/Kolkata";

// Page loads within this window reuse the stored status instead of calling
// Tuya — an admin leaving the tab open must not burn the monthly allowance.
const STATUS_MAX_AGE_MS = 5 * 60 * 1000;
const FORCE_SYNC_MIN_GAP_MS = 2 * 60 * 1000;
const DEFAULT_ENERGY_SYNC_MINUTES = 60;
// "Cloud Develop Base Resource Trial" allowance, per Tuya console > Usage.
const DEFAULT_MONTHLY_API_LIMIT = 30000;
// Tuya's bulk device endpoints accept at most 20 ids per call.
const BULK_ID_LIMIT = 20;
// Tuya keeps report logs for about 7 days on the free tier.
const ENERGY_BACKFILL_MS = 7 * 24 * 60 * 60 * 1000;
// Re-read a little of the previous window: devices that were offline upload
// late, and the unique index makes the overlap free of double counting.
const ENERGY_LOG_OVERLAP_MS = 60 * 60 * 1000;
const ENERGY_WINDOW_MS = 24 * 60 * 60 * 1000;
const LOG_PAGE_SIZE = 100;
const MAX_PAGES_PER_WINDOW = 20;
// Chunks closer together than this (e.g. a backlog uploaded on reconnect) are
// merged into the next interval so they don't read as a huge power spike.
const MIN_POWER_INTERVAL_MS = 2 * 60 * 1000;
// Look this far before the requested range for the chunk that opens its first
// interval.
const POWER_LOOKBACK_MS = 24 * 60 * 60 * 1000;

// Bit order of the breaker's `fault` bitmap DP.
const FAULT_LABELS = [
  "Over-current",
  "Over-voltage",
  "Over-power",
  "Low current",
  "Low voltage",
  "Low power",
];

const HISTORY_GRANULARITIES = {
  hour: {
    count: 24,
    unit: "hours",
    mongoFormat: "%Y-%m-%d %H",
    keyFormat: "yyyy-MM-dd HH",
    labelFormat: "HH:00",
  },
  day: {
    count: 30,
    unit: "days",
    mongoFormat: "%Y-%m-%d",
    keyFormat: "yyyy-MM-dd",
    labelFormat: "dd MMM",
  },
  month: {
    count: 12,
    unit: "months",
    mongoFormat: "%Y-%m",
    keyFormat: "yyyy-MM",
    labelFormat: "MMM yyyy",
  },
};

export const getConfiguredDeviceIds = () =>
  (process.env.TUYA_DEVICE_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

// Technicians (10-digit phones) who may also open the Smart Devices tab.
const getTechnicianViewerPhones = () =>
  (process.env.SMART_DEVICE_TECHNICIAN_PHONES || "")
    .split(",")
    .map((phone) => normalizePhoneNumber(phone.trim()))
    .filter(Boolean);

export const canViewSmartDevices = (user) =>
  user?.role === "admin" ||
  (user?.role === "technician" &&
    getTechnicianViewerPhones().includes(normalizePhoneNumber(user.phoneNumber)));

const isConfigured = () =>
  isTuyaConfigured() && getConfiguredDeviceIds().length > 0;

const getEnergySyncIntervalMs = () =>
  Math.max(
    15,
    Number(process.env.TUYA_ENERGY_SYNC_MINUTES) || DEFAULT_ENERGY_SYNC_MINUTES,
  ) *
  60 *
  1000;

const currentMonth = () => DateTime.now().setZone(TIMEZONE).toFormat("yyyy-MM");

const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );

const toNumber = (value) => {
  const n = Number(value);
  return value === null || value === "" || !Number.isFinite(n) ? null : n;
};

const scaled = (value, divisor) => {
  const n = toNumber(value);
  return n === null ? null : n / divisor;
};

const roundKwh = (kwh) => Math.round((kwh || 0) * 1000) / 1000;

// Scales come from the device spec: voltage ×10, current in mA, power ×10.
const parseStatus = (statusList = []) => {
  const byCode = Object.fromEntries(
    statusList.map(({ code, value }) => [code, value]),
  );
  const fault = toNumber(byCode.fault) ?? 0;
  return {
    switchOn: typeof byCode.switch_1 === "boolean" ? byCode.switch_1 : null,
    voltage: scaled(byCode.cur_voltage, 10),
    current: scaled(byCode.cur_current, 1000),
    power: scaled(byCode.cur_power, 10),
    fault,
    faultLabels: FAULT_LABELS.filter((_, bit) => fault & (1 << bit)),
  };
};

// Collapse concurrent callers (poller + page loads) onto one in-flight run.
const singleFlight = (fn) => {
  let inFlight = null;
  return () => {
    if (!inFlight) {
      inFlight = fn().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };
};

let lastStatusSyncAt = 0;
let lastEnergySyncAt = 0;

const syncStatus = singleFlight(async () => {
  const batches = await Promise.all(
    chunk(getConfiguredDeviceIds(), BULK_ID_LIMIT).map((ids) => {
      const query = { device_ids: ids.join(",") };
      return Promise.all([
        tuyaRequest({ path: "/v2.0/cloud/thing/batch", query }),
        tuyaRequest({ path: "/v1.0/iot-03/devices/status", query }),
      ]);
    }),
  );
  const details = batches.flatMap(([batchDetails]) => batchDetails || []);
  const statuses = batches.flatMap(([, batchStatuses]) => batchStatuses || []);

  const statusById = new Map(statuses.map(({ id, status }) => [id, status]));
  const now = new Date();

  await Promise.all(
    details.map((device) =>
      smartDeviceData.upsert({
        deviceId: device.id,
        set: {
          name: device.custom_name || device.name,
          productName: device.product_name,
          online: Boolean(device.is_online),
          ...parseStatus(statusById.get(device.id)),
          statusSyncedAt: now,
        },
      }),
    ),
  );

  lastStatusSyncAt = Date.now();
});

const fetchEnergyWindow = async ({ deviceId, start, end }) => {
  const chunks = [];
  let lastRowKey;

  for (let page = 0; page < MAX_PAGES_PER_WINDOW; page += 1) {
    const result = await tuyaRequest({
      path: `/v2.0/cloud/thing/${deviceId}/report-logs`,
      query: {
        codes: "add_ele",
        start_time: start,
        end_time: end,
        size: LOG_PAGE_SIZE,
        last_row_key: lastRowKey,
      },
    });

    for (const log of result?.logs || []) {
      const kwh = scaled(log.value, 1000);
      if (log.code === "add_ele" && kwh > 0) {
        chunks.push({ deviceId, eventTime: new Date(Number(log.event_time)), kwh });
      }
    }

    if (!result?.has_more || !result.last_row_key) {
      return { chunks, complete: true };
    }
    lastRowKey = result.last_row_key;
  }

  return { chunks, complete: false };
};

const syncDeviceEnergy = async (deviceId) => {
  const device = await smartDeviceData.findByDeviceId(deviceId);
  const now = Date.now();
  const earliest = now - ENERGY_BACKFILL_MS;
  let cursor = device?.energySyncedUntil
    ? Math.max(device.energySyncedUntil.getTime() - ENERGY_LOG_OVERLAP_MS, earliest)
    : earliest;

  while (cursor < now) {
    const windowEnd = Math.min(cursor + ENERGY_WINDOW_MS, now);
    const { chunks, complete } = await fetchEnergyWindow({
      deviceId,
      start: cursor,
      end: windowEnd,
    });
    if (!complete) {
      console.warn(
        `Smart device ${deviceId}: energy log window truncated at ${new Date(cursor).toISOString()}`,
      );
    }
    await smartDeviceData.saveEnergyChunks(chunks);
    await smartDeviceData.upsert({
      deviceId,
      set: { energySyncedUntil: new Date(windowEnd), lastSyncError: null },
    });
    cursor = windowEnd;
  }
};

const syncEnergy = singleFlight(async () => {
  // Sequential and isolated: one bad device must not block the others.
  for (const deviceId of getConfiguredDeviceIds()) {
    try {
      await syncDeviceEnergy(deviceId);
    } catch (error) {
      console.error(`Smart device ${deviceId} energy sync failed:`, error.message);
      await smartDeviceData.upsert({
        deviceId,
        set: { lastSyncError: error.message },
      });
    }
  }
  lastEnergySyncAt = Date.now();
});

const refresh = async ({ force = false } = {}) => {
  const now = Date.now();
  const tasks = [];
  const statusGap = force ? FORCE_SYNC_MIN_GAP_MS : STATUS_MAX_AGE_MS;
  if (now - lastStatusSyncAt > statusGap) tasks.push(syncStatus());
  if (force || now - lastEnergySyncAt > getEnergySyncIntervalMs()) {
    if (now - lastEnergySyncAt > FORCE_SYNC_MIN_GAP_MS) tasks.push(syncEnergy());
  }
  await Promise.all(tasks);
};

const assertConfigured = () => {
  if (!isConfigured()) {
    throw createHttpError(
      503,
      "Smart devices are not configured. Set TUYA_ACCESS_ID, TUYA_ACCESS_SECRET and TUYA_DEVICE_IDS.",
    );
  }
};

const assertKnownDevice = (deviceId) => {
  if (!getConfiguredDeviceIds().includes(deviceId)) {
    throw createHttpError(404, "Device not found");
  }
};

const listDevices = async ({ force = false } = {}) => {
  assertConfigured();

  let syncError = null;
  try {
    await refresh({ force });
  } catch (error) {
    // Serve the last stored values rather than failing the whole tab.
    console.error("Smart device refresh failed:", error.message);
    syncError = error.message;
  }

  const deviceIds = getConfiguredDeviceIds();
  const now = DateTime.now().setZone(TIMEZONE);
  const until = now.plus({ minutes: 1 }).toJSDate();

  const [devices, todayTotals, monthTotals, usage] = await Promise.all([
    smartDeviceData.listByIds(deviceIds),
    smartDeviceData.sumEnergyByDevice({
      deviceIds,
      from: now.startOf("day").toJSDate(),
      to: until,
    }),
    smartDeviceData.sumEnergyByDevice({
      deviceIds,
      from: now.startOf("month").toJSDate(),
      to: until,
    }),
    smartDeviceData.findApiUsage(currentMonth()),
  ]);

  const todayById = new Map(todayTotals.map(({ _id, kwh }) => [_id, kwh]));
  const monthById = new Map(monthTotals.map(({ _id, kwh }) => [_id, kwh]));

  return {
    syncError,
    apiUsage: {
      month: currentMonth(),
      calls: usage?.calls ?? 0,
      limit: Number(process.env.TUYA_MONTHLY_API_LIMIT) || DEFAULT_MONTHLY_API_LIMIT,
    },
    devices: devices.map((device) => ({
      deviceId: device.deviceId,
      name: device.name,
      productName: device.productName,
      online: device.online,
      switchOn: device.switchOn,
      voltage: device.voltage,
      current: device.current,
      power: device.power,
      fault: device.fault,
      faultLabels: device.faultLabels,
      statusSyncedAt: device.statusSyncedAt,
      energySyncedUntil: device.energySyncedUntil,
      lastSyncError: device.lastSyncError,
      todayKwh: roundKwh(todayById.get(device.deviceId)),
      monthKwh: roundKwh(monthById.get(device.deviceId)),
    })),
  };
};

const getEnergyHistory = async ({ deviceId, granularity = "day" }) => {
  assertConfigured();
  assertKnownDevice(deviceId);

  const config = HISTORY_GRANULARITIES[granularity];
  if (!config) {
    throw createHttpError(400, "granularity must be one of: hour, day, month");
  }

  const singular = config.unit.slice(0, -1);
  const end = DateTime.now().setZone(TIMEZONE).startOf(singular);
  const start = end.minus({ [config.unit]: config.count - 1 });

  const rows = await smartDeviceData.sumEnergyByBucket({
    deviceId,
    from: start.toJSDate(),
    to: end.plus({ [config.unit]: 1 }).toJSDate(),
    format: config.mongoFormat,
    timezone: TIMEZONE,
  });
  const kwhByKey = new Map(rows.map(({ _id, kwh }) => [_id, kwh]));

  const buckets = Array.from({ length: config.count }, (_, i) => {
    const at = start.plus({ [config.unit]: i });
    const key = at.toFormat(config.keyFormat);
    return {
      key,
      label: at.toFormat(config.labelFormat),
      kwh: roundKwh(kwhByKey.get(key)),
    };
  });

  return {
    granularity,
    buckets,
    totalKwh: roundKwh(buckets.reduce((sum, b) => sum + b.kwh, 0)),
  };
};

/**
 * Average power between consecutive energy reports. Each `add_ele` chunk is the
 * energy used since the previous report, so chunk ÷ elapsed time is the mean
 * power over that interval — real measured data with no extra API calls,
 * unlike Tuya's live status which goes stale while the breaker sleeps.
 */
const getPowerHistory = async ({ deviceId, hours }) => {
  assertConfigured();
  assertKnownDevice(deviceId);

  const span = Math.min(Math.max(parseInt(hours, 10) || 24, 1), 24 * 31);
  const to = Date.now();
  const from = to - span * 60 * 60 * 1000;

  const chunks = await smartDeviceData.listEnergyChunks({
    deviceId,
    from: new Date(from - POWER_LOOKBACK_MS),
    to: new Date(to),
  });

  const intervals = [];
  let intervalStart = null;
  let intervalKwh = 0;

  for (const { eventTime, kwh } of chunks) {
    const t = eventTime.getTime();
    // The first chunk's energy belongs to an interval that started before
    // anything we hold, so it only marks where the next interval begins.
    if (intervalStart === null) {
      intervalStart = t;
      continue;
    }

    intervalKwh += kwh;
    const elapsedMs = t - intervalStart;
    if (elapsedMs < MIN_POWER_INTERVAL_MS) continue;

    if (t > from) {
      intervals.push({
        start: new Date(intervalStart),
        end: eventTime,
        kwh: roundKwh(intervalKwh),
        watts: Math.round((intervalKwh * 1000 * 10) / (elapsedMs / 3_600_000)) / 10,
      });
    }
    intervalStart = t;
    intervalKwh = 0;
  }

  return { hours: span, intervals };
};

export const smartDeviceService = {
  admin: {
    listDevices,
    getEnergyHistory,
    getPowerHistory,
  },
};

export const startSmartDevicePoller = () => {
  // Count every Tuya call (background and page loads alike) for the usage meter.
  setTuyaCallListener(() => smartDeviceData.incrementApiUsage(currentMonth()));

  if (!isConfigured()) {
    console.log("🔌 Smart devices: Tuya not configured, energy import disabled");
    return;
  }
  if (String(process.env.TUYA_POLL_ENABLED || "true").toLowerCase() === "false") {
    console.log("🔌 Smart devices: energy import disabled by TUYA_POLL_ENABLED=false");
    return;
  }

  const intervalMs = getEnergySyncIntervalMs();
  const tick = () =>
    syncEnergy().catch((error) =>
      console.error("Smart device energy import failed:", error.message),
    );
  tick();
  setInterval(tick, intervalMs).unref();
  console.log(
    `🔌 Smart devices: importing energy every ${intervalMs / 60000} min`,
  );
};

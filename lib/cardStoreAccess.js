const SOURCE = "verify-card-store-access-api";
const RUNTIME_VERSION = "verify-card-store-access-v1.0-supabase";

function text(value) {
  return String(value || "").trim();
}

function normalizedStoreId(value) {
  return text(value).toUpperCase();
}

function parseDate(value, endOfDay = false) {
  const raw = text(value);
  if (!raw) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T${endOfDay ? "23:59:59" : "00:00:00"}+08:00`)
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function supabaseConfig() {
  const url = text(process.env.SUPABASE_URL).replace(/\/+$/, "");
  const serviceRoleKey = text(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return url && serviceRoleKey ? { url, serviceRoleKey } : null;
}

async function selectStore(config, storeId) {
  const query = new URLSearchParams({
    store_id: `eq.${storeId}`,
    select: [
      "store_id", "store_name", "access_code", "active", "start_at", "expires_at",
      "features", "brokerage_name", "broker_name", "broker_license_no"
    ].join(","),
    limit: "1"
  });
  const response = await fetch(`${config.url}/rest/v1/stores?${query}`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: "application/json"
    }
  });
  if (!response.ok) throw new Error(`Supabase stores query failed: ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

function failure(reason, message, requestedStoreId, extra = {}) {
  return { verified: false, success: false, reason, message, source: SOURCE, runtimeVersion: RUNTIME_VERSION, requestedStoreId, ...extra };
}

export async function verifyCardStoreAccess(input = {}) {
  const storeId = normalizedStoreId(input.storeId);
  const accessCode = text(input.accessCode);
  if (!storeId || !accessCode) return failure("MISSING_INPUT", "Store id and access code are required", storeId);

  const config = supabaseConfig();
  if (!config) return failure("SUPABASE_CONFIG_MISSING", "Supabase server-side environment variables are not configured", storeId);

  try {
    const store = await selectStore(config, storeId);
    if (!store) return failure("STORE_NOT_FOUND", "Store was not found", storeId);
    if (text(store.access_code) !== accessCode) return failure("INVALID_CODE", "Invalid access code", storeId);
    if (store.active !== true) return failure("STORE_DISABLED", "Store is disabled", storeId);

    const now = new Date();
    const startAt = parseDate(store.start_at);
    const expiresAt = parseDate(store.expires_at, true);
    if (startAt && now < startAt) return failure("NOT_STARTED", "Store access has not started", storeId, { startAt: text(store.start_at) });
    if (expiresAt && now > expiresAt) return failure("EXPIRED", "Store access has expired", storeId, { expiresAt: text(store.expires_at) });

    const disclosure = {
      brokerageName: text(store.brokerage_name),
      brokerName: text(store.broker_name),
      brokerLicenseNo: text(store.broker_license_no)
    };
    const missingDisclosure = Object.entries(disclosure).filter(([, value]) => !value).map(([key]) => key);
    if (missingDisclosure.length) return failure("DISCLOSURE_INCOMPLETE", "Store disclosure is incomplete", storeId, { missingDisclosure });

    return {
      verified: true, success: true, reason: "OK", source: SOURCE, runtimeVersion: RUNTIME_VERSION,
      storeId: text(store.store_id), storeName: text(store.store_name), active: true,
      startAt: text(store.start_at), expiresAt: text(store.expires_at),
      remainingDays: expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000)) : null,
      features: Array.isArray(store.features) ? store.features : [],
      disclosure, disclosureComplete: true, missingDisclosure: []
    };
  } catch {
    return failure("SERVER_ERROR", "Store verification failed", storeId);
  }
}
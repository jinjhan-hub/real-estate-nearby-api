const RUNTIME_VERSION = "admin-usage-status-v1.10";
const SOURCE = "admin-usage-status-api";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-admin-token");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function safeString(value) {
  return String(value || "").trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(",")
        .map((item) => safeString(item))
        .filter(Boolean);
    }
  }
  return [];
}

function toBoolean(value) {
  if (value === true || value === false) return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function makeRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSupabaseConfig() {
  const url = safeString(process.env.SUPABASE_URL).replace(/\/+$/, "");
  const serviceRoleKey = safeString(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceRoleKey) return null;

  return { url, serviceRoleKey };
}

function getHeader(req, name) {
  const value = req.headers?.[name] || req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? safeString(value[0]) : safeString(value);
}

async function supabaseSelect(config, table, query) {
  const response = await fetch(`${config.url}/rest/v1/${table}?${query}`, {
    method: "GET",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table} query failed: ${response.status}`);
  }

  return response.json();
}

async function fetchQuotaStatus(config) {
  const params = new URLSearchParams({
    select: [
      "store_id",
      "store_name",
      "nearby_enabled",
      "daily_quota",
      "monthly_quota",
      "today_usage_count",
      "month_usage_count",
      "today_remaining",
      "month_remaining",
      "google_daily_quota",
      "google_monthly_quota",
      "today_google_api_count",
      "month_google_api_count",
      "today_google_remaining",
      "month_google_remaining"
    ].join(","),
    order: "store_id.asc"
  });

  return supabaseSelect(config, "nearby_store_quota_status", params.toString());
}

async function fetchNearbySettings(config) {
  const params = new URLSearchParams({
    select: [
      "store_id",
      "default_radius",
      "allowed_radii",
      "allowed_categories"
    ].join(",")
  });

  return supabaseSelect(config, "nearby_store_settings", params.toString());
}

function buildSettingsMap(settingsRows) {
  return new Map(
    settingsRows.map((settings) => [
      safeString(settings.store_id),
      settings
    ])
  );
}

function buildStore(row, settingsMap) {
  const storeId = safeString(row.store_id);
  const nearbyEnabled = toBoolean(row.nearby_enabled);
  const settings = settingsMap.get(storeId) || {};

  return {
    storeId,
    storeName: safeString(row.store_name),
    nearbyEnabled,
    status: nearbyEnabled ? "ENABLED" : "DISABLED",
    dailyQuota: toNumber(row.daily_quota),
    monthlyQuota: toNumber(row.monthly_quota),
    todayUsed: toNumber(row.today_usage_count),
    monthUsed: toNumber(row.month_usage_count),
    todayRemaining: toNumber(row.today_remaining),
    monthRemaining: toNumber(row.month_remaining),
    googleDailyQuota: toNumber(row.google_daily_quota),
    googleMonthlyQuota: toNumber(row.google_monthly_quota),
    googleTodayUsed: toNumber(row.today_google_api_count),
    googleMonthUsed: toNumber(row.month_google_api_count),
    googleTodayRemaining: toNumber(row.today_google_remaining),
    googleMonthRemaining: toNumber(row.month_google_remaining),
    defaultRadius: toNumber(settings.default_radius, 1000),
    allowedRadii: toArray(settings.allowed_radii).map((radius) => toNumber(radius)),
    allowedCategories: toArray(settings.allowed_categories)
  };
}

function buildSummary(stores) {
  return stores.reduce(
    (summary, store) => {
      summary.totalStores += 1;
      if (store.nearbyEnabled) summary.enabledStores += 1;
      else summary.disabledStores += 1;
      summary.totalTodayUsed += store.todayUsed;
      summary.totalMonthUsed += store.monthUsed;
      summary.totalGoogleTodayUsed += store.googleTodayUsed;
      summary.totalGoogleMonthUsed += store.googleMonthUsed;
      return summary;
    },
    {
      totalStores: 0,
      enabledStores: 0,
      disabledStores: 0,
      totalTodayUsed: 0,
      totalMonthUsed: 0,
      totalGoogleTodayUsed: 0,
      totalGoogleMonthUsed: 0
    }
  );
}

export default async function handler(req, res) {
  setCors(res);

  const requestId = makeRequestId();

  const fail = (reason, message, status = 200) => {
    return res.status(status).json({
      success: false,
      reason,
      message,
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION,
      requestId
    });
  };

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return fail("METHOD_NOT_ALLOWED", "Only GET is allowed.");
  }

  const adminToken = safeString(process.env.ADMIN_API_TOKEN);

  if (!adminToken) {
    return fail("ADMIN_TOKEN_NOT_CONFIGURED", "Admin API token is not configured.");
  }

  const requestToken = getHeader(req, "x-admin-token");

  if (!requestToken) {
    return fail("MISSING_ADMIN_TOKEN", "Admin token is required.");
  }

  if (requestToken !== adminToken) {
    return fail("INVALID_ADMIN_TOKEN", "Admin token is invalid.");
  }

  try {
    const config = getSupabaseConfig();

    if (!config) {
      return fail("SUPABASE_CONFIG_MISSING", "Server configuration is missing.");
    }

    const [quotaRows, settingsRows] = await Promise.all([
      fetchQuotaStatus(config),
      fetchNearbySettings(config)
    ]);
    const settingsMap = buildSettingsMap(Array.isArray(settingsRows) ? settingsRows : []);
    const stores = (Array.isArray(quotaRows) ? quotaRows : []).map((row) =>
      buildStore(row, settingsMap)
    );

    return res.status(200).json({
      success: true,
      reason: "OK",
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION,
      requestId,
      stores,
      summary: buildSummary(stores)
    });
  } catch (error) {
    return fail("SERVER_ERROR", "Admin usage status request failed.");
  }
}

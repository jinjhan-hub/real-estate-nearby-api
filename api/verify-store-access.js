const RUNTIME_VERSION = "verify-store-access-v1.2-supabase";

const SOURCE = "verify-store-access-api";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function safeString(value) {
  return String(value || "").trim();
}

function normalizeStoreId(value) {
  return safeString(value).toUpperCase();
}

function makeRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

function getSupabaseConfig() {
  const url = safeString(process.env.SUPABASE_URL).replace(/\/+$/, "");
  const serviceRoleKey = safeString(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceRoleKey) return null;

  return { url, serviceRoleKey };
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
    const errorText = await response.text();
    throw new Error(`Supabase ${table} query failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function fetchSingleByStoreId(config, table, storeId, select) {
  const params = new URLSearchParams({
    store_id: `eq.${storeId}`,
    select,
    limit: "1"
  });

  const rows = await supabaseSelect(config, table, params.toString());
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function parseDate(value, endOfDay = false) {
  const raw = safeString(value);
  if (!raw) return null;

  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T${endOfDay ? "23:59:59" : "00:00:00"}+08:00`)
    : new Date(raw);

  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

function formatDateField(value) {
  return safeString(value);
}

function buildDisclosure(store) {
  return {
    brokerageName: safeString(store.brokerage_name),
    brokerName: safeString(store.broker_name),
    brokerLicenseNo: safeString(store.broker_license_no)
  };
}

function getMissingDisclosure(disclosure) {
  const missing = [];

  if (!disclosure.brokerageName) missing.push("brokerageName");
  if (!disclosure.brokerName) missing.push("brokerName");
  if (!disclosure.brokerLicenseNo) missing.push("brokerLicenseNo");

  return missing;
}

function buildNearby(settings, quotaStatus) {
  const enabled = toBoolean(settings.nearby_enabled);
  const dailyQuota = toNumber(settings.daily_quota);
  const monthlyQuota = toNumber(settings.monthly_quota);
  const googleDailyQuota = toNumber(settings.google_daily_quota);
  const googleMonthlyQuota = toNumber(settings.google_monthly_quota);

  const todayUsed = toNumber(quotaStatus?.today_usage_count);
  const monthUsed = toNumber(quotaStatus?.month_usage_count);
  const googleTodayUsed = toNumber(quotaStatus?.today_google_api_count);
  const googleMonthUsed = toNumber(quotaStatus?.month_google_api_count);

  return {
    enabled,
    canSearchAddress: enabled,
    status: enabled ? "ENABLED" : "DISABLED",
    dailyQuota,
    monthlyQuota,
    todayUsed,
    monthUsed,
    todayRemaining: toNumber(
      quotaStatus?.today_remaining,
      Math.max(dailyQuota - todayUsed, 0)
    ),
    monthRemaining: toNumber(
      quotaStatus?.month_remaining,
      Math.max(monthlyQuota - monthUsed, 0)
    ),
    googleDailyQuota,
    googleMonthlyQuota,
    googleTodayUsed,
    googleMonthUsed,
    googleTodayRemaining: toNumber(
      quotaStatus?.today_google_remaining,
      Math.max(googleDailyQuota - googleTodayUsed, 0)
    ),
    googleMonthRemaining: toNumber(
      quotaStatus?.month_google_remaining,
      Math.max(googleMonthlyQuota - googleMonthUsed, 0)
    ),
    defaultRadius: toNumber(settings.default_radius, 1000),
    allowedRadii: toArray(settings.allowed_radii).map((radius) => toNumber(radius)),
    allowedCategories: toArray(settings.allowed_categories)
  };
}

export default async function handler(req, res) {
  setCors(res);

  const requestId = makeRequestId();

  const fail = (reason, message, extra = {}) => {
    return res.status(200).json({
      verified: false,
      success: false,
      reason,
      message,
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION,
      requestId,
      ...extra
    });
  };

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return fail("METHOD_NOT_ALLOWED", "Only POST is allowed");
  }

  try {
    const config = getSupabaseConfig();

    if (!config) {
      return fail(
        "SUPABASE_CONFIG_MISSING",
        "Supabase server-side environment variables are not configured"
      );
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const storeId = normalizeStoreId(
      body.storeId ||
        body.storeCode ||
        body.store ||
        body.storeNo ||
        body.id
    );

    const accessCode = safeString(
      body.accessCode ||
        body.verifyCode ||
        body.verificationCode ||
        body.authCode ||
        body.password ||
        body.code
    );

    if (!storeId || !accessCode) {
      return fail("MISSING_INPUT", "Store id and access code are required", {
        requestedStoreId: storeId
      });
    }

    const store = await fetchSingleByStoreId(
      config,
      "stores",
      storeId,
      [
        "store_id",
        "store_name",
        "access_code",
        "active",
        "start_at",
        "expires_at",
        "features",
        "brokerage_name",
        "broker_name",
        "broker_license_no"
      ].join(",")
    );

    if (!store) {
      return fail("STORE_NOT_FOUND", "Store was not found", {
        requestedStoreId: storeId
      });
    }

    if (safeString(store.access_code) !== accessCode) {
      return fail("INVALID_CODE", "Invalid access code", {
        requestedStoreId: storeId
      });
    }

    if (store.active !== true) {
      return fail("STORE_DISABLED", "Store is disabled", {
        requestedStoreId: storeId
      });
    }

    const now = new Date();
    const startAtDate = parseDate(store.start_at, false);
    const expiresAtDate = parseDate(store.expires_at, true);

    if (startAtDate && now < startAtDate) {
      return fail("NOT_STARTED", "Store access has not started", {
        requestedStoreId: storeId,
        startAt: formatDateField(store.start_at)
      });
    }

    if (expiresAtDate && now > expiresAtDate) {
      return fail("EXPIRED", "Store access has expired", {
        requestedStoreId: storeId,
        expiresAt: formatDateField(store.expires_at)
      });
    }

    const remainingDays = expiresAtDate
      ? Math.max(
          0,
          Math.ceil((expiresAtDate.getTime() - now.getTime()) / 86400000)
        )
      : null;

    const disclosure = buildDisclosure(store);
    const missingDisclosure = getMissingDisclosure(disclosure);

    if (missingDisclosure.length > 0) {
      return fail("DISCLOSURE_INCOMPLETE", "Store disclosure is incomplete", {
        requestedStoreId: storeId,
        missingDisclosure
      });
    }

    const settings = await fetchSingleByStoreId(
      config,
      "nearby_store_settings",
      storeId,
      [
        "store_id",
        "nearby_enabled",
        "daily_quota",
        "monthly_quota",
        "allowed_radii",
        "default_radius",
        "allowed_categories",
        "google_daily_quota",
        "google_monthly_quota"
      ].join(",")
    );

    if (!settings) {
      return fail(
        "NEARBY_SETTINGS_NOT_FOUND",
        "Nearby store settings were not found",
        { requestedStoreId: storeId }
      );
    }

    const quotaStatus = await fetchSingleByStoreId(
      config,
      "nearby_store_quota_status",
      storeId,
      [
        "store_id",
        "today_usage_count",
        "month_usage_count",
        "today_remaining",
        "month_remaining",
        "today_google_api_count",
        "month_google_api_count",
        "today_google_remaining",
        "month_google_remaining"
      ].join(",")
    );

    return res.status(200).json({
      verified: true,
      success: true,
      reason: "OK",
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION,
      requestId,

      storeId: safeString(store.store_id),
      storeName: safeString(store.store_name),
      active: true,
      startAt: formatDateField(store.start_at),
      expiresAt: formatDateField(store.expires_at),
      remainingDays,

      features: toArray(store.features),

      disclosure,
      disclosureComplete: true,
      missingDisclosure: [],

      nearby: buildNearby(settings, quotaStatus)
    });
  } catch (error) {
    return fail("SERVER_ERROR", "Store verification failed");
  }
}

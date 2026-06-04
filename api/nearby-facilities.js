import crypto from "crypto";
import { lookupGoogleNearbyFacilities } from "../lib/googleNearbyProvider.js";

const RUNTIME_VERSION = "nearby-facilities-v1.4.3-cache-lookup-skeleton";
const SOURCE = "nearby-facilities-api";

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

function parseDate(value, endOfDay = false) {
  const raw = safeString(value);
  if (!raw) return null;

  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T${endOfDay ? "23:59:59" : "00:00:00"}+08:00`)
    : new Date(raw);

  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
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
    throw new Error(`Supabase ${table} query failed: ${response.status}`);
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

function maskAddress(address) {
  const value = safeString(address);
  if (!value) return "";
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function normalizeAddress(address) {
  return safeString(address).replace(/\s+/g, " ");
}

function getRequestBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

function getRequestedCategories(body, nearby) {
  const rawCategories = toArray(body.categories);
  const allowedCategories = nearby.allowedCategories;

  if (rawCategories.length === 0) return allowedCategories;

  return [...new Set(rawCategories.map((category) => safeString(category)).filter(Boolean))];
}

function buildRequestHash({ storeId, normalizedAddress, radius, categories, language, region }) {
  const hashPayload = {
    storeId,
    normalizedAddress,
    radius,
    categories: [...categories].sort(),
    language,
    region
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(hashPayload))
    .digest("hex");
}

function buildCacheKey(requestHash) {
  return `nearby:v1:${requestHash}`;
}

async function fetchNearbyCache(config, requestHash, cacheKey) {
  const params = new URLSearchParams({
    select: [
      "cache_key",
      "request_hash",
      "result_json",
      "result_count",
      "expires_at"
    ].join(","),
    request_hash: `eq.${requestHash}`,
    cache_key: `eq.${cacheKey}`,
    expires_at: `gt.${new Date().toISOString()}`,
    order: "expires_at.desc",
    limit: "1"
  });

  const rows = await supabaseSelect(config, "nearby_cache", params.toString());
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function buildCacheFacilities(cacheRow) {
  const result = cacheRow?.result_json;
  if (!result || typeof result !== "object" || Array.isArray(result)) return {};
  if (result.facilities && typeof result.facilities === "object") return result.facilities;
  return {};
}

function buildCacheSummary(cacheRow) {
  const result = cacheRow?.result_json;
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  return Array.isArray(result.summary) ? result.summary : [];
}

export default async function handler(req, res) {
  setCors(res);

  const requestId = makeRequestId();

  const fail = (reason, message, extra = {}) => {
    return res.status(200).json({
      success: false,
      reason,
      message,
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION,
      requestId,
      facilities: {},
      summary: [],
      ...extra
    });
  };

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return fail("METHOD_NOT_ALLOWED", "Only POST is allowed.");
  }

  try {
    const config = getSupabaseConfig();

    if (!config) {
      return fail("SUPABASE_CONFIG_MISSING", "Server configuration is missing.");
    }

    const body = getRequestBody(req);
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
      return fail("MISSING_INPUT", "Store id and access code are required.", {
        storeId: storeId || null
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
        "expires_at"
      ].join(",")
    );

    if (!store) {
      return fail("STORE_NOT_FOUND", "Store was not found.", { storeId });
    }

    if (safeString(store.access_code) !== accessCode) {
      return fail("INVALID_CODE", "Invalid access code.", { storeId });
    }

    if (store.active !== true) {
      return fail("STORE_DISABLED", "Store is disabled.", { storeId });
    }

    const now = new Date();
    const startAtDate = parseDate(store.start_at, false);
    const expiresAtDate = parseDate(store.expires_at, true);

    if (startAtDate && now < startAtDate) {
      return fail("NOT_STARTED", "Store access has not started.", { storeId });
    }

    if (expiresAtDate && now > expiresAtDate) {
      return fail("EXPIRED", "Store access has expired.", { storeId });
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
      return fail("NEARBY_SETTINGS_NOT_FOUND", "Nearby store settings were not found.", {
        storeId
      });
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

    const nearby = buildNearby(settings, quotaStatus);

    if (!nearby.enabled) {
      return fail(
        "NEARBY_DISABLED",
        "Nearby search is disabled for this store.",
        {
          storeId: safeString(store.store_id),
          storeName: safeString(store.store_name),
          nearby
        }
      );
    }

    const address = normalizeAddress(body.address);

    if (!address) {
      return fail("MISSING_ADDRESS", "Address is required.", {
        storeId: safeString(store.store_id),
        storeName: safeString(store.store_name),
        nearby
      });
    }

    if (address.length < 4) {
      return fail("INVALID_ADDRESS", "Address is too short.", {
        storeId: safeString(store.store_id),
        storeName: safeString(store.store_name),
        nearby
      });
    }

    const radius = toNumber(body.radius, nearby.defaultRadius);

    if (!nearby.allowedRadii.includes(radius)) {
      return fail("INVALID_RADIUS", "Radius is not allowed for this store.", {
        storeId: safeString(store.store_id),
        storeName: safeString(store.store_name),
        nearby,
        allowedRadii: nearby.allowedRadii
      });
    }

    const categories = getRequestedCategories(body, nearby);
    const invalidCategories = categories.filter(
      (category) => !nearby.allowedCategories.includes(category)
    );

    if (categories.length === 0 || invalidCategories.length > 0) {
      return fail("INVALID_CATEGORY", "One or more categories are not allowed.", {
        storeId: safeString(store.store_id),
        storeName: safeString(store.store_name),
        nearby,
        allowedCategories: nearby.allowedCategories
      });
    }

    if (nearby.todayRemaining <= 0 || nearby.monthRemaining <= 0) {
      return fail("QUERY_QUOTA_EXCEEDED", "Store query quota has been exhausted.", {
        storeId: safeString(store.store_id),
        storeName: safeString(store.store_name),
        nearby
      });
    }

    if (nearby.googleTodayRemaining <= 0 || nearby.googleMonthRemaining <= 0) {
      return fail("GOOGLE_QUOTA_EXCEEDED", "Store Google API quota has been exhausted.", {
        storeId: safeString(store.store_id),
        storeName: safeString(store.store_name),
        nearby
      });
    }

    const language = safeString(body.language) || "zh-TW";
    const region = safeString(body.region) || "TW";
    const requestHash = buildRequestHash({
      storeId: safeString(store.store_id),
      normalizedAddress: address,
      radius,
      categories,
      language,
      region
    });
    const cacheKey = buildCacheKey(requestHash);
    const cacheHit = await fetchNearbyCache(config, requestHash, cacheKey);

    if (cacheHit) {
      return res.status(200).json({
        success: true,
        reason: "CACHE_HIT",
        message: "Nearby facility cache was found.",
        apiSource: SOURCE,
        runtimeVersion: RUNTIME_VERSION,
        requestId,
        storeId: safeString(store.store_id),
        storeName: safeString(store.store_name),
        query: {
          addressMasked: maskAddress(address),
          radius,
          categories,
          language,
          region
        },
        source: {
          cacheHit: true,
          googleApiCalled: false,
          requestHash,
          cacheKey,
          dataSource: "cache"
        },
        quota: {
          todayRemaining: nearby.todayRemaining,
          monthRemaining: nearby.monthRemaining,
          googleTodayRemaining: nearby.googleTodayRemaining,
          googleMonthRemaining: nearby.googleMonthRemaining
        },
        nearby,
        facilities: buildCacheFacilities(cacheHit),
        summary: buildCacheSummary(cacheHit)
      });
    }

    const providerResult = await lookupGoogleNearbyFacilities({
      storeId: safeString(store.store_id),
      address,
      radius,
      categories,
      language,
      region,
      requestHash,
      cacheKey
    });

    return fail(
      providerResult.reason,
      providerResult.message,
      {
        storeId: safeString(store.store_id),
        storeName: safeString(store.store_name),
        query: {
          addressMasked: maskAddress(address),
          radius,
          categories,
          language,
          region
        },
        source: {
          cacheHit: false,
          googleApiCalled: providerResult.googleApiCalled === true,
          requestHash,
          cacheKey,
          dataSource: providerResult.dataSource || "not_implemented"
        },
        quota: {
          todayRemaining: nearby.todayRemaining,
          monthRemaining: nearby.monthRemaining,
          googleTodayRemaining: nearby.googleTodayRemaining,
          googleMonthRemaining: nearby.googleMonthRemaining
        },
        nearby,
        facilities: providerResult.facilities || {},
        summary: Array.isArray(providerResult.summary) ? providerResult.summary : []
      }
    );
  } catch (error) {
    return fail("SERVER_ERROR", "Nearby facility request failed.");
  }
}

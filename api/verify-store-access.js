const RUNTIME_VERSION = "verify-store-access-2026-05-25-v8-public-whitelist";

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

function getAllowedStoreIds() {
  const raw =
    process.env.PUBLIC_ALLOWED_STORE_IDS ||
    process.env.ALLOWED_STORE_IDS ||
    "";

  return String(raw)
    .split(",")
    .map((id) => normalizeStoreId(id))
    .filter(Boolean);
}

function parseStoreConfig(rawConfig) {
  if (!rawConfig) return null;

  const parsed = JSON.parse(rawConfig.trim());

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  return parsed;
}

function getStoreCode(store) {
  return safeString(
    store.code ||
      store.accessCode ||
      store.verifyCode ||
      store.verificationCode ||
      store.authCode ||
      store.password
  );
}

export default function handler(req, res) {
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
    const body = req.body || {};

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
      return fail("MISSING_INPUT", "請輸入店家代號與認證碼。", {
        requestedStoreId: storeId
      });
    }

    /**
     * 第一層：公版白名單檢查
     *
     * 重點：
     * 不在 PUBLIC_ALLOWED_STORE_IDS 內，直接失敗。
     * 不繼續查 STORE_ACCESS_CONFIG。
     * 不回傳 storeName。
     * 不回傳 disclosure。
     */
    const allowedStoreIds = getAllowedStoreIds();

    if (allowedStoreIds.length === 0) {
      return fail("PUBLIC_WHITELIST_NOT_SET", "尚未設定 PUBLIC_ALLOWED_STORE_IDS。", {
        requestedStoreId: storeId
      });
    }

    if (!allowedStoreIds.includes(storeId)) {
      return fail("STORE_ID_NOT_ALLOWED", "此店家代號不在認證公版允許清單內。", {
        requestedStoreId: storeId
      });
    }

    /**
     * 第二層：讀取店家設定
     */
    const rawConfig = process.env.STORE_ACCESS_CONFIG;

    if (!rawConfig) {
      return fail("ENV_NOT_SET", "尚未設定 STORE_ACCESS_CONFIG。", {
        requestedStoreId: storeId,
        configSource: "STORE_ACCESS_CONFIG"
      });
    }

    let stores;

    try {
      stores = parseStoreConfig(rawConfig);
    } catch (error) {
      return fail("ENV_PARSE_ERROR", "STORE_ACCESS_CONFIG 不是有效 JSON。", {
        requestedStoreId: storeId,
        configSource: "STORE_ACCESS_CONFIG"
      });
    }

    if (!stores) {
      return fail("ENV_PARSE_ERROR", "STORE_ACCESS_CONFIG 格式錯誤，必須是店家物件資料。", {
        requestedStoreId: storeId,
        configSource: "STORE_ACCESS_CONFIG"
      });
    }

    const store = stores[storeId];

    if (!store) {
      return fail("STORE_NOT_FOUND", "查無此店家代號，請確認 STORE_ACCESS_CONFIG。", {
        requestedStoreId: storeId,
        configSource: "STORE_ACCESS_CONFIG"
      });
    }

    /**
     * 第三層：驗證碼
     */
    const expectedCode = getStoreCode(store);

    if (!expectedCode) {
      return fail("STORE_CODE_MISSING", "此店家尚未設定認證碼，請聯絡管理者。", {
        requestedStoreId: storeId
      });
    }

    if (expectedCode !== accessCode) {
      return fail("INVALID_CODE", "認證碼錯誤，請重新輸入。", {
        requestedStoreId: storeId
      });
    }

    /**
     * 第四層：啟用狀態
     */
    if (store.active !== true) {
      return fail("STORE_DISABLED", "此認證碼已停用，請聯絡管理者。", {
        requestedStoreId: storeId
      });
    }

    /**
     * 第五層：期限
     */
    const now = new Date();

    const expiresAtDate = store.expiresAt
      ? new Date(`${store.expiresAt}T23:59:59+08:00`)
      : null;

    if (expiresAtDate && Number.isNaN(expiresAtDate.getTime())) {
      return fail("INVALID_EXPIRES_AT", "店家到期日格式錯誤，請聯絡管理者。", {
        requestedStoreId: storeId
      });
    }

    if (expiresAtDate && now > expiresAtDate) {
      return fail("EXPIRED", "此認證碼已過期，請聯絡管理者。", {
        requestedStoreId: storeId
      });
    }

    const remainingDays = expiresAtDate
      ? Math.max(
          0,
          Math.ceil((expiresAtDate.getTime() - now.getTime()) / 86400000)
        )
      : null;

    /**
     * 第六層：公版揭露資料
     */
    const disclosure = store.disclosure || {};

    const missingDisclosure = [];

    if (!safeString(disclosure.brokerageName)) {
      missingDisclosure.push("brokerageName");
    }

    if (!safeString(disclosure.brokerName)) {
      missingDisclosure.push("brokerName");
    }

    if (!safeString(disclosure.brokerLicenseNo)) {
      missingDisclosure.push("brokerLicenseNo");
    }

    if (missingDisclosure.length > 0) {
      return fail("DISCLOSURE_INCOMPLETE", "店家公版揭露資料不完整，請聯絡管理者。", {
        requestedStoreId: storeId,
        missingDisclosure
      });
    }

    /**
     * 全部通過才回傳店家資料與 disclosure
     */
    return res.status(200).json({
      verified: true,
      success: true,
      reason: "OK",
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION,
      requestId,

      storeId,
      storeName: safeString(store.storeName),
      startAt: store.startAt || "",
      expiresAt: store.expiresAt || "",
      active: true,
      remainingDays,

      features: Array.isArray(store.features) ? store.features : [],

      disclosure: {
        brokerageName: safeString(disclosure.brokerageName),
        brokerName: safeString(disclosure.brokerName),
        brokerLicenseNo: safeString(disclosure.brokerLicenseNo)
      },

      disclosureComplete: true,
      missingDisclosure: []
    });
  } catch (error) {
    return fail("SERVER_ERROR", "系統驗證失敗，請稍後再試或聯絡管理者。");
  }
}

const RUNTIME_VERSION = "verify-store-access-2026-05-24-v7";
const SOURCE = "verify-store-access-api";

const EXPECTED_STORES = {
  CH001: "彰化民族店",
  CH002: "彰化彰美店",
  CH003: "員林僑信店",
  CH004: "員林萬年店",
  CH005: "彰化川井永安店"
};

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

    if (!Object.prototype.hasOwnProperty.call(EXPECTED_STORES, storeId)) {
      return fail("STORE_ID_NOT_ALLOWED", "此店家代號不在認證公版允許清單內。", {
        requestedStoreId: storeId,
        allowedStoreIds: Object.keys(EXPECTED_STORES)
      });
    }

    const rawConfig = process.env.STORE_ACCESS_CONFIG;

    if (!rawConfig) {
      return fail("ENV_NOT_SET", "尚未設定 STORE_ACCESS_CONFIG。", {
        requestedStoreId: storeId,
        configSource: "STORE_ACCESS_CONFIG"
      });
    }

    let stores;

    try {
      stores = JSON.parse(rawConfig.trim());
    } catch (error) {
      return fail("ENV_PARSE_ERROR", "STORE_ACCESS_CONFIG 不是有效 JSON。", {
        requestedStoreId: storeId,
        configSource: "STORE_ACCESS_CONFIG"
      });
    }

    if (!stores || typeof stores !== "object" || Array.isArray(stores)) {
      return fail("ENV_PARSE_ERROR", "STORE_ACCESS_CONFIG 格式錯誤，必須是店家物件資料。", {
        requestedStoreId: storeId,
        configSource: "STORE_ACCESS_CONFIG"
      });
    }

    const store = stores[storeId];

    if (!store) {
      return fail("STORE_NOT_FOUND", "查無此店家代號，請確認輸入是否正確。", {
        requestedStoreId: storeId,
        configSource: "STORE_ACCESS_CONFIG",
        storeCount: Object.keys(stores).length
      });
    }

    const expectedStoreName = EXPECTED_STORES[storeId];
    const actualStoreName = safeString(store.storeName);

    if (actualStoreName !== expectedStoreName) {
      return fail("STORE_CONFIG_MISMATCH", "店家資料與系統允許清單不一致，請聯絡管理者。", {
        requestedStoreId: storeId,
        expectedStoreName,
        actualStoreName
      });
    }

    if (safeString(store.code) !== accessCode) {
      return fail("INVALID_CODE", "認證碼錯誤，請重新輸入。", {
        requestedStoreId: storeId
      });
    }

    if (store.active !== true) {
      return fail("STORE_DISABLED", "此認證碼已停用，請聯絡管理者。", {
        requestedStoreId: storeId
      });
    }

    const now = new Date();

    const expiresAtDate = store.expiresAt
      ? new Date(`${store.expiresAt}T23:59:59+08:00`)
      : null;

    if (expiresAtDate && Number.isNaN(expiresAtDate.getTime())) {
      return fail("INVALID_EXPIRES_AT", "店家到期日格式錯誤，請聯絡管理者。", {
        requestedStoreId: storeId,
        expiresAt: store.expiresAt || ""
      });
    }

    if (expiresAtDate && now > expiresAtDate) {
      return fail("EXPIRED", "此認證碼已過期，請聯絡管理者。", {
        requestedStoreId: storeId,
        expiresAt: store.expiresAt || ""
      });
    }

    const remainingDays = expiresAtDate
      ? Math.max(
          0,
          Math.ceil((expiresAtDate.getTime() - now.getTime()) / 86400000)
        )
      : null;

    const disclosure = store.disclosure || {};

    const missingDisclosure = [];

    if (!safeString(disclosure.brokerageName)) missingDisclosure.push("brokerageName");
    if (!safeString(disclosure.brokerName)) missingDisclosure.push("brokerName");
    if (!safeString(disclosure.brokerLicenseNo)) missingDisclosure.push("brokerLicenseNo");

    if (missingDisclosure.length > 0) {
      return fail("DISCLOSURE_INCOMPLETE", "店家公版揭露資料不完整，請聯絡管理者。", {
        requestedStoreId: storeId,
        missingDisclosure
      });
    }

    return res.status(200).json({
      verified: true,
      success: true,
      reason: "OK",
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION,
      requestId,

      storeId,
      storeName: actualStoreName,
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

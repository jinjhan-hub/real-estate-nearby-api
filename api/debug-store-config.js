const RUNTIME_VERSION = "debug-store-config-2026-05-24-v2";
const SOURCE = "debug-store-config-api";

const EXPECTED_STORES = {
  CH001: "彰化民族店",
  CH002: "彰化彰美店",
  CH003: "員林僑信店",
  CH004: "員林萬年店",
  CH005: "彰化井川永安店"
};

const GHOST_KEYWORDS = [
  "永慶",
  "永慶房屋",
  "永慶不動產",
  "有旺",
  "有旺不動產",
  "陳志宏",
  "陳志忠",
  "2026-12-31",
  "彰化員林大道加盟店"
];

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function safeString(value) {
  return String(value || "").trim();
}

function simpleHash(text) {
  let hash = 0;
  const value = String(text || "");

  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(16);
}

export default function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(200).json({
      ok: false,
      success: false,
      reason: "METHOD_NOT_ALLOWED",
      message: "Only GET is allowed",
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION
    });
  }

  const debugToken = process.env.DEBUG_TOKEN || "";
  const inputToken = safeString(req.query.token);

  if (debugToken && inputToken !== debugToken) {
    return res.status(200).json({
      ok: false,
      success: false,
      reason: "UNAUTHORIZED",
      message: "debug token 錯誤。",
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION
    });
  }

  const rawConfig = process.env.STORE_ACCESS_CONFIG || "";

  if (!rawConfig) {
    return res.status(200).json({
      ok: false,
      success: false,
      reason: "ENV_NOT_SET",
      message: "Production runtime 沒有讀到 STORE_ACCESS_CONFIG。",
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION
    });
  }

  let stores;

  try {
    stores = JSON.parse(rawConfig.trim());
  } catch (error) {
    return res.status(200).json({
      ok: false,
      success: false,
      reason: "ENV_PARSE_ERROR",
      message: "STORE_ACCESS_CONFIG 不是有效 JSON。",
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION,
      rawLength: rawConfig.length,
      configFingerprint: simpleHash(rawConfig)
    });
  }

  if (!stores || typeof stores !== "object" || Array.isArray(stores)) {
    return res.status(200).json({
      ok: false,
      success: false,
      reason: "ENV_FORMAT_ERROR",
      message: "STORE_ACCESS_CONFIG 格式錯誤，必須是物件格式。",
      source: SOURCE,
      runtimeVersion: RUNTIME_VERSION,
      rawLength: rawConfig.length,
      configFingerprint: simpleHash(rawConfig)
    });
  }

  const storeIds = Object.keys(stores);

  const ghostKeywordHits = GHOST_KEYWORDS.filter((keyword) =>
    rawConfig.includes(keyword)
  );

  const unexpectedStoreIds = storeIds.filter(
    (storeId) => !Object.prototype.hasOwnProperty.call(EXPECTED_STORES, storeId)
  );

  const missingExpectedStoreIds = Object.keys(EXPECTED_STORES).filter(
    (storeId) => !Object.prototype.hasOwnProperty.call(stores, storeId)
  );

  const storesSummary = storeIds.map((storeId) => {
    const store = stores[storeId] || {};
    const disclosure = store.disclosure || {};

    const actualStoreName = safeString(store.storeName);
    const expectedStoreName = EXPECTED_STORES[storeId] || "";

    const hasDisclosure = {
      brokerageName: Boolean(safeString(disclosure.brokerageName)),
      brokerName: Boolean(safeString(disclosure.brokerName)),
      brokerLicenseNo: Boolean(safeString(disclosure.brokerLicenseNo))
    };

    return {
      storeId,
      storeName: actualStoreName,
      expectedStoreName,
      storeNameMatched: actualStoreName === expectedStoreName,
      active: store.active === true,
      startAt: store.startAt || "",
      expiresAt: store.expiresAt || "",
      codeLength: safeString(store.code).length,
      hasDisclosure,
      disclosurePreview: {
        brokerageName: safeString(disclosure.brokerageName),
        brokerName: safeString(disclosure.brokerName),
        brokerLicenseNo: safeString(disclosure.brokerLicenseNo)
      }
    };
  });

  const suspiciousStores = storesSummary.filter((store) => {
    return (
      !Object.prototype.hasOwnProperty.call(EXPECTED_STORES, store.storeId) ||
      store.storeNameMatched !== true ||
      store.active !== true ||
      store.hasDisclosure.brokerageName !== true ||
      store.hasDisclosure.brokerName !== true ||
      store.hasDisclosure.brokerLicenseNo !== true
    );
  });

  return res.status(200).json({
    ok: true,
    success: true,
    reason: "OK",
    message: "Production runtime 已成功讀取 STORE_ACCESS_CONFIG。",
    source: SOURCE,
    runtimeVersion: RUNTIME_VERSION,

    configSource: "STORE_ACCESS_CONFIG",
    rawLength: rawConfig.length,
    configFingerprint: simpleHash(rawConfig),

    storeCount: storeIds.length,
    storeIds,
    expectedStoreIds: Object.keys(EXPECTED_STORES),

    unexpectedStoreIds,
    missingExpectedStoreIds,
    ghostKeywordHits,
    suspiciousStores,

    storesSummary
  });
}

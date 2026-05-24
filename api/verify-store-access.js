export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const fail = (reason, message, extra = {}) => {
    return res.status(200).json({
      verified: false,
      success: false,
      reason,
      message,
      ...extra
    });
  };

  if (req.method !== "POST") {
    return fail("METHOD_NOT_ALLOWED", "Only POST is allowed");
  }

  try {
    const body = req.body || {};

    const storeId = String(
      body.storeId ||
      body.storeCode ||
      body.store ||
      body.storeNo ||
      body.id ||
      ""
    )
      .trim()
      .toUpperCase();

    const accessCode = String(
      body.accessCode ||
      body.verifyCode ||
      body.verificationCode ||
      body.authCode ||
      body.password ||
      body.code ||
      ""
    ).trim();

    if (!storeId || !accessCode) {
      return fail("MISSING_INPUT", "請輸入店家代號與認證碼。", {
        requestedStoreId: storeId
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
      return fail("STORE_NOT_FOUND", "查無此店家代號，請確認 Vercel Production 的 STORE_ACCESS_CONFIG 是否包含此店家。", {
        requestedStoreId: storeId,
        configSource: "STORE_ACCESS_CONFIG",
        storeCount: Object.keys(stores).length
      });
    }

    if (String(store.code || "").trim() !== accessCode) {
      return fail("INVALID_CODE", "認證碼錯誤，請重新輸入。", {
        requestedStoreId: storeId,
        storeName: store.storeName || ""
      });
    }

    if (store.active !== true) {
      return fail("STORE_DISABLED", "此認證碼已停用，請聯絡管理者。", {
        requestedStoreId: storeId,
        storeName: store.storeName || ""
      });
    }

    const now = new Date();
    const expiresAtDate = store.expiresAt
      ? new Date(`${store.expiresAt}T23:59:59+08:00`)
      : null;

    if (expiresAtDate && Number.isNaN(expiresAtDate.getTime())) {
      return fail("INVALID_EXPIRES_AT", "店家到期日格式錯誤，請聯絡管理者。", {
        requestedStoreId: storeId,
        storeName: store.storeName || "",
        expiresAt: store.expiresAt || ""
      });
    }

    if (expiresAtDate && now > expiresAtDate) {
      return fail("EXPIRED", "此認證碼已過期，請聯絡管理者。", {
        requestedStoreId: storeId,
        storeName: store.storeName || "",
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

    if (!disclosure.brokerageName) missingDisclosure.push("brokerageName");
    if (!disclosure.brokerName) missingDisclosure.push("brokerName");
    if (!disclosure.brokerLicenseNo) missingDisclosure.push("brokerLicenseNo");

    return res.status(200).json({
      verified: true,
      success: true,
      reason: "OK",
      storeId,
      storeName: store.storeName || "",
      startAt: store.startAt || "",
      expiresAt: store.expiresAt || "",
      active: true,
      remainingDays,
      features: Array.isArray(store.features) ? store.features : [],
      disclosure: {
        brokerageName: disclosure.brokerageName || "",
        brokerName: disclosure.brokerName || "",
        brokerLicenseNo: disclosure.brokerLicenseNo || ""
      },
      disclosureComplete: missingDisclosure.length === 0,
      missingDisclosure
    });
  } catch (error) {
    return fail("SERVER_ERROR", "系統驗證失敗，請稍後再試或聯絡管理者。");
  }
}

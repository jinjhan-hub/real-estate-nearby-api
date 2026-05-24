export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      verified: false,
      success: false,
      reason: "METHOD_NOT_ALLOWED",
      message: "Only POST is allowed"
    });
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
      return res.status(400).json({
        verified: false,
        success: false,
        reason: "MISSING_INPUT",
        message: "請輸入店家代號與認證碼。"
      });
    }

    const rawConfig = process.env.STORE_ACCESS_CONFIG;

    if (!rawConfig) {
      return res.status(500).json({
        verified: false,
        success: false,
        reason: "ENV_NOT_SET",
        message: "尚未設定 STORE_ACCESS_CONFIG。"
      });
    }

    let stores;

    try {
      stores = JSON.parse(rawConfig);
    } catch (error) {
      return res.status(500).json({
        verified: false,
        success: false,
        reason: "ENV_PARSE_ERROR",
        message: "STORE_ACCESS_CONFIG 不是有效 JSON。"
      });
    }

    const store = stores[storeId];

    if (!store) {
      return res.status(404).json({
        verified: false,
        success: false,
        reason: "STORE_NOT_FOUND",
        message: "查無此店家代號，請確認輸入是否正確。"
      });
    }

    if (String(store.code).trim() !== accessCode) {
      return res.status(401).json({
        verified: false,
        success: false,
        reason: "INVALID_CODE",
        message: "認證碼錯誤，請重新輸入。"
      });
    }

    if (store.active !== true) {
      return res.status(403).json({
        verified: false,
        success: false,
        reason: "STORE_DISABLED",
        message: "此認證碼已停用，請聯絡管理者。"
      });
    }

    const now = new Date();
    const expiresAtDate = store.expiresAt
      ? new Date(`${store.expiresAt}T23:59:59+08:00`)
      : null;

    if (expiresAtDate && now > expiresAtDate) {
      return res.status(403).json({
        verified: false,
        success: false,
        reason: "EXPIRED",
        message: "此認證碼已過期，請聯絡管理者。"
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
      code: store.code || "",
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
    return res.status(500).json({
      verified: false,
      success: false,
      reason: "SERVER_ERROR",
      message: "系統驗證失敗，請稍後再試或聯絡管理者。"
    });
  }
}

export default async function handler(req, res) {
  // 允許 GPTs Action 呼叫
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      verified: false,
      reason: "METHOD_NOT_ALLOWED",
      message: "Only POST method is allowed."
    });
  }

  try {
    const { storeId, code } = req.body || {};

    if (!storeId || !code) {
      return res.status(400).json({
        ok: false,
        verified: false,
        reason: "MISSING_INPUT",
        message: "請輸入店家代號與認證碼。"
      });
    }

    const rawCodes = process.env.STORE_ACCESS_CODES;

    if (!rawCodes) {
      return res.status(500).json({
        ok: false,
        verified: false,
        reason: "ENV_NOT_SET",
        message: "尚未設定 STORE_ACCESS_CODES。"
      });
    }

    let stores;

    try {
      stores = JSON.parse(rawCodes);
    } catch (error) {
      return res.status(500).json({
        ok: false,
        verified: false,
        reason: "ENV_JSON_INVALID",
        message: "STORE_ACCESS_CODES 格式錯誤，請檢查 JSON。"
      });
    }

    const inputStoreId = String(storeId).trim();
    const inputCode = String(code).trim();

    const store = stores[inputStoreId];

    if (!store) {
      return res.status(401).json({
        ok: false,
        verified: false,
        reason: "STORE_NOT_FOUND",
        message: "查無此店家代號。"
      });
    }

    if (!store.active) {
      return res.status(403).json({
        ok: false,
        verified: false,
        reason: "STORE_DISABLED",
        message: "此認證碼已停用。"
      });
    }

    if (String(store.code).trim() !== inputCode) {
      return res.status(401).json({
        ok: false,
        verified: false,
        reason: "INVALID_CODE",
        message: "認證碼錯誤。"
      });
    }

    const now = new Date();

    // expiresAt 用台灣時間當天 23:59:59 結束
    const expiresAt = new Date(`${store.expiresAt}T23:59:59+08:00`);

    if (Number.isNaN(expiresAt.getTime())) {
      return res.status(500).json({
        ok: false,
        verified: false,
        reason: "INVALID_EXPIRES_AT",
        message: "到期日格式錯誤，請使用 YYYY-MM-DD。"
      });
    }

    if (now > expiresAt) {
      return res.status(403).json({
        ok: false,
        verified: false,
        reason: "EXPIRED",
        message: "此認證碼已過期。"
      });
    }

    return res.status(200).json({
      ok: true,
      verified: true,
      storeId: inputStoreId,
      storeName: store.storeName || "",
      expiresAt: store.expiresAt,
      features: store.features || [],
      message: "認證成功。"
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      verified: false,
      reason: "SERVER_ERROR",
      message: "系統驗證失敗。",
      detail: error.message || "Unknown error"
    });
  }
}

export default async function handler(req, res) {
  // CORS / GPTs Actions 相容處理
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).json({
      ok: true,
      message: "OPTIONS ok"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "POST only"
    });
  }

  try {
    let body = req.body;

    // 避免某些環境把 body 當成字串傳入
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (error) {
        return res.status(400).json({
          ok: false,
          error: "invalid JSON body"
        });
      }
    }

    const stage = String(body?.stage || "").trim();

    const files = {
      property_extraction: "01_PROPERTY_DATA_EXTRACTION.txt",
      business_card_extraction: "02_BUSINESS_CARD_EXTRACTION.txt",
      fb_card_rules: "03_FB_CARD_CONTENT_RULES.txt",
      style_selection: "04_IMAGE_STYLE_LIBRARY.txt",
      image_prompt: "05_IMAGE_PROMPT_TEMPLATE.txt",
      generation_failsafe: "06_IMAGE_GENERATION_FAILSAFE.txt",
      compliance_check: "07_AD_COMPLIANCE_CHECK.txt"
    };

    const fileName = files[stage];

    if (!fileName) {
      return res.status(400).json({
        ok: false,
        error: "invalid stage",
        receivedStage: stage,
        allowedStages: Object.keys(files)
      });
    }

    const sourceUrl = `https://raw.githubusercontent.com/jinjhan-hub/real-estate-gpt-knowledge/main/fb_card_public/${fileName}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response;

    try {
      response = await fetch(sourceUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return res.status(500).json({
        ok: false,
        error: "github load failed",
        stage,
        fileName,
        sourceUrl,
        githubStatus: response.status
      });
    }

    const text = await response.text();

    if (!text || text.trim().length === 0) {
      return res.status(500).json({
        ok: false,
        error: "knowledge file is empty",
        stage,
        fileName,
        sourceUrl
      });
    }

    return res.status(200).json({
      ok: true,
      module: "fb_card_public",
      stage,
      fileName,
      contentLength: text.length,
      knowledgeText: text.substring(0, 8000)
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "server error",
      message: error.message
    });
  }
}

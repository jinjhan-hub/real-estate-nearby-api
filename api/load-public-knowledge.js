export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).json({
      ok: true,
      success: true,
      stage: "options",
      fileName: "",
      contentLength: 0,
      knowledgeText: "OPTIONS ok",
      error: ""
    });
  }

  if (req.method !== "POST") {
    return res.status(200).json({
      ok: false,
      success: false,
      stage: "",
      fileName: "",
      contentLength: 0,
      knowledgeText: "",
      error: "POST only"
    });
  }

  try {
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (error) {
        return res.status(200).json({
          ok: false,
          success: false,
          stage: "",
          fileName: "",
          contentLength: 0,
          knowledgeText: "",
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
      return res.status(200).json({
        ok: false,
        success: false,
        stage,
        fileName: "",
        contentLength: 0,
        knowledgeText: "",
        error: "invalid stage",
        allowedStages: Object.keys(files)
      });
    }

    const sourceUrl = `https://raw.githubusercontent.com/jinjhan-hub/real-estate-gpt-knowledge/main/fb_card_public/${fileName}`;

    const response = await fetch(sourceUrl, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        success: false,
        stage,
        fileName,
        contentLength: 0,
        knowledgeText: "",
        error: `github load failed: ${response.status}`
      });
    }

    const text = await response.text();
    const cleanText = String(text || "").trim();

    if (!cleanText) {
      return res.status(200).json({
        ok: false,
        success: false,
        stage,
        fileName,
        contentLength: 0,
        knowledgeText: "",
        error: "knowledge file is empty"
      });
    }

    return res.status(200).json({
      ok: true,
      success: true,
      stage,
      fileName,
      contentLength: cleanText.length,
      knowledgeText: cleanText.substring(0, 7500),
      error: ""
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      success: false,
      stage: "",
      fileName: "",
      contentLength: 0,
      knowledgeText: "",
      error: error.message || "server error"
    });
  }
}

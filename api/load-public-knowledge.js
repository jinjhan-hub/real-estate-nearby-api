export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "POST only"
    });
  }

  try {
    const stage = req.body?.stage;

    const files = {
      property_extraction: "01_PROPERTY_DATA_EXTRACTION.txt",
      business_card_extraction: "02_BUSINESS_CARD_EXTRACTION.txt",
      fb_card_rules: "03_FB_CARD_CONTENT_RULES.txt",
      style_selection: "04_IMAGE_STYLE_LIBRARY.txt",
      image_prompt: "05_IMAGE_PROMPT_TEMPLATE.txt",
      generation_failsafe: "06_IMAGE_GENERATION_FAILSAFE.txt"
    };

    const fileName = files[stage];

    if (!fileName) {
      return res.status(400).json({
        ok: false,
        error: "invalid stage"
      });
    }

    const url = `https://raw.githubusercontent.com/jinjhan-hub/real-estate-gpt-knowledge/main/fb_card_public/${fileName}`;

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(500).json({
        ok: false,
        error: "github load failed",
        fileName: fileName,
        status: response.status
      });
    }

    const text = await response.text();

    return res.status(200).json({
      ok: true,
      module: "fb_card_public",
      stage: stage,
      fileName: fileName,
      knowledgeText: text.substring(0, 8000)
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST method is allowed"
    });
  }

  const { stage } = req.body;

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
      error: "Invalid stage"
    });
  }

  const owner = "jinjhan-hub";
  const repo = "real-estate-gpt-knowledge";
  const branch = "main";
  const folder = "fb_card";

  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${folder}/${fileName}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(500).json({
        error: "Failed to load knowledge file",
        fileName,
        status: response.status
      });
    }

    const content = await response.text();

    return res.status(200).json({
      module: "fb_card",
      stage,
      fileName,
      content
    });
  } catch (error) {
    return res.status(200).json({
  success: true,
  module: "fb_card",
  stage: stage,
  fileName: fileName,
  content: content.slice(0, 12000)
});
  }
}

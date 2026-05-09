const MODULE_MAP = {
  sales_generator: "02_SALES_GENERATOR_MASTER.txt",
  nearby_facilities: "03_NEARBY_FACILITIES_MASTER.txt",
  floorplan_converter: "04_FLOORPLAN_CONVERTER_MASTER.txt",
  market_content: "06_MARKET_CONTENT_MASTER.txt",
  tax_calculator: "07_TAX_CALCULATOR_MASTER.txt",
  api_actions: "08_API_ACTIONS_MASTER.txt",
  examples: "99_EXAMPLES_MASTER_OPTIONAL.txt"
};

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/jinjhan-hub/real-estate-gpt-knowledge/main";

export default async function handler(req, res) {
  try {
    const { module } = req.query;

    if (!module) {
      return res.status(400).json({
        ok: false,
        error: "Missing module parameter",
        allowedModules: Object.keys(MODULE_MAP)
      });
    }

    if (!MODULE_MAP[module]) {
      return res.status(400).json({
        ok: false,
        error: "Invalid module",
        allowedModules: Object.keys(MODULE_MAP)
      });
    }

    const fileName = MODULE_MAP[module];
    const url = `${GITHUB_RAW_BASE}/${fileName}`;

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: "Failed to fetch knowledge file from GitHub",
        status: response.status,
        fileName
      });
    }

    const content = await response.text();

    return res.status(200).json({
      ok: true,
      module,
      fileName,
      source: url,
      content
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      detail: error.message
    });
  }
}

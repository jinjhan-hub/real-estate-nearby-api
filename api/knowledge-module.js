const MODULE_MAP = {
  sales_generator: {
    type: "folder",
    files: [
      "02_sales_generator/01_RULES.txt",
      "02_sales_generator/02_VARIABLE_SCHEMA.txt",
      "02_sales_generator/06_OUTPUT_TEMPLATES.txt"
    ]
  },

  nearby_facilities: {
    type: "single",
    file: "03_NEARBY_FACILITIES_MASTER.txt"
  },

  floorplan_converter: {
    type: "single",
    file: "04_FLOORPLAN_CONVERTER_MASTER.txt"
  },

  market_content: {
    type: "single",
    file: "06_MARKET_CONTENT_MASTER.txt"
  },

  tax_calculator: {
    type: "single",
    file: "07_TAX_CALCULATOR_MASTER.txt"
  },

  api_actions: {
    type: "single",
    file: "08_API_ACTIONS_MASTER.txt"
  },

  examples: {
    type: "single",
    file: "99_EXAMPLES_MASTER_OPTIONAL.txt"
  }
};

const GITHUB_ROOT_BASE =
  "https://raw.githubusercontent.com/jinjhan-hub/real-estate-gpt-knowledge/main";

const MERGED_UPLOAD_BASE =
  `${GITHUB_ROOT_BASE}/merged_upload_files`;

async function fetchTextFile(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw {
      status: response.status,
      url
    };
  }

  return await response.text();
}

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

    const moduleConfig = MODULE_MAP[module];

    if (!moduleConfig) {
      return res.status(400).json({
        ok: false,
        error: "Invalid module",
        allowedModules: Object.keys(MODULE_MAP)
      });
    }

    // 新版：sales_generator 讀 GitHub 資料夾內多個 txt
    if (moduleConfig.type === "folder") {
      const loadedFiles = [];

      for (const filePath of moduleConfig.files) {
        const url = `${GITHUB_ROOT_BASE}/${filePath}`;
        const text = await fetchTextFile(url);

        loadedFiles.push({
          filePath,
          source: url,
          content: text
        });
      }

      const content = loadedFiles
        .map((file) => {
          return [
            `===== ${file.filePath} =====`,
            file.content
          ].join("\n\n");
        })
        .join("\n\n");

      return res.status(200).json({
        ok: true,
        module,
        mode: "folder",
        files: loadedFiles.map((file) => ({
          filePath: file.filePath,
          source: file.source
        })),
        content
      });
    }

    // 舊版：其他 module 暫時仍讀 merged_upload_files 裡的 MASTER txt
    if (moduleConfig.type === "single") {
      const fileName = moduleConfig.file;
      const url = `${MERGED_UPLOAD_BASE}/${fileName}`;

      const content = await fetchTextFile(url);

      return res.status(200).json({
        ok: true,
        module,
        mode: "single",
        fileName,
        source: url,
        content
      });
    }

    return res.status(500).json({
      ok: false,
      error: "Unknown module config type"
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: "Failed to fetch knowledge file from GitHub",
      status: error.status || 500,
      source: error.url || null
    });
  }
}

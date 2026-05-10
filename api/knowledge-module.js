const MODULE_MAP = {
  sales_generator: {
  type: "folder",
  files: [
    "02_sales_generator/00_MODULE_OVERVIEW.txt",
    "02_sales_generator/01_PROPERTY_DATA_EXTRACTION.txt",
    "02_sales_generator/02_BUSINESS_CARD_EXTRACTION.txt",
    "02_sales_generator/03_SALES_IMAGE_CARD_RULES.txt",
    "02_sales_generator/04_COPY_PLATFORM_RULES.txt",
    "02_sales_generator/05_STYLE_LIBRARY.txt",
    "02_sales_generator/06_CONFIRMATION_FLOW.txt",
    "02_sales_generator/07_GLOBAL_OUTPUT_RULES.txt",
    "02_sales_generator/08_FB_TEMPLATE.txt",
    "02_sales_generator/09_IG_TEMPLATE.txt",
    "02_sales_generator/10_THREADS_TEMPLATE.txt",
    "02_sales_generator/11_CTA_LIBRARY.txt",
    "02_sales_generator/12_HASHTAG_RULES.txt",
    "02_sales_generator/13_INVEST_STYLE.txt",
"02_sales_generator/14_WARM_HOME_STYLE.txt",
"02_sales_generator/15_FIRST_BUYER_STYLE.txt",
"02_sales_generator/16_LUXURY_STYLE.txt",
"02_sales_generator/17_MINIMAL_STYLE.txt",
"02_sales_generator/18_FB_HOOK_LIBRARY.txt",
"02_sales_generator/19_IG_HOOK_LIBRARY.txt",
"02_sales_generator/20_THREADS_HOOK_LIBRARY.txt",
"02_sales_generator/21_OBSERVATION_LIBRARY.txt",
"02_sales_generator/22_EMOTIONAL_TRANSITION_LIBRARY.txt",
"02_sales_generator/23_ERROR_CASES.txt",
    
    // 舊版保留（過渡期）
    "02_sales_generator/06_OUTPUT_TEMPLATES.txt"
  ]
},


  nearby_facilities: {
  type: "folder",
  files: [
    "03_nearby_facilities/00_MODULE_OVERVIEW.txt",
    "03_nearby_facilities/01_COORDINATE_POLICY.txt",
    "03_nearby_facilities/02_FACILITY_CATEGORY_RULES.txt",
    "03_nearby_facilities/03_NEARBY_OUTPUT_TEMPLATE.txt"
  ]
},

  floorplan_converter: {
  type: "folder",
  files: [
    "04_floorplan_converter/00_MODULE_OVERVIEW.txt",
    "04_floorplan_converter/01_RECOGNITION_CONFIRMATION_RULES.txt",
    "04_floorplan_converter/02_GEOMETRY_LOCK_RULES.txt",
    "04_floorplan_converter/03_FLOORPLAN_STYLE_LIBRARY.txt"
  ]
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
  type: "folder",
  files: [
    "08_api_actions/00_API_ACTIONS_OVERVIEW.txt",
    "08_api_actions/01_NEARBY_API_CONTRACT.txt",
    "08_api_actions/02_GITHUB_KNOWLEDGE_LOADER_RULES.txt"
  ]
},
  
  workflows: {
  type: "folder",
  files: [
    "09_workflows/01_PROPERTY_CONFIRMATION_WORKFLOW.txt",
    "09_workflows/02_PLATFORM_SELECTION_WORKFLOW.txt",
    "09_workflows/03_STYLE_SELECTION_WORKFLOW.txt",
    "09_workflows/04_IMAGE_GENERATION_WORKFLOW.txt",
    "09_workflows/05_COPY_GENERATION_WORKFLOW.txt",
    "09_workflows/06_IMAGE_COPY_SEPARATION_WORKFLOW.txt",
    "09_workflows/07_FINAL_CONFIRMATION_WORKFLOW.txt"
  ]
},
  
state_machine: {
  type: "folder",
  files: [
    "10_state_machine/01_STATE_OVERVIEW.txt",
    "10_state_machine/02_PROPERTY_STATE.txt",
    "10_state_machine/03_PLATFORM_STATE.txt",
    "10_state_machine/04_STYLE_STATE.txt",
    "10_state_machine/05_IMAGE_STATE.txt",
    "10_state_machine/06_COPY_STATE.txt",
    "10_state_machine/07_FINAL_REVIEW_STATE.txt",
    "10_state_machine/08_ERROR_RECOVERY_STATE.txt"
  ]
},
  
 examples: {
  type: "folder",
  files: [
    "99_examples/01_PROPERTY_CONFIRMATION_EXAMPLE.txt",
    "99_examples/02_FB_COPY_EXAMPLE.txt",
    "99_examples/03_THREADS_EXAMPLE.txt",
    "99_examples/04_FB_INVEST_CASE.txt",
    "99_examples/05_FB_SELFUSE_CASE.txt",
    "99_examples/06_IG_LIFESTYLE_CASE.txt",
    "99_examples/07_THREADS_OBSERVATION_CASE.txt",
    "99_examples/08_SHORT_MINIMAL_CASE.txt"
  ]
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
   const { module, section } = req.query;

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
    // section mode：只讀指定單一 section
if (moduleConfig.type === "folder" && section) {
  const filePath = moduleConfig.files.find((file) =>
    file.includes(`/${section}.txt`)
  );

  if (!filePath) {
    return res.status(400).json({
      ok: false,
      error: "Invalid section",
      module,
      section,
      allowedSections: moduleConfig.files.map((file) =>
        file.split("/").pop().replace(".txt", "")
      )
    });
  }

  const url = `${GITHUB_ROOT_BASE}/${filePath}`;
  const content = await fetchTextFile(url);

  return res.status(200).json({
    ok: true,
    module,
    mode: "section",
    section,
    filePath,
    source: url,
    content
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

const GITHUB_ROOT_BASE =
  "https://raw.githubusercontent.com/jinjhan-hub/real-estate-gpt-knowledge/main";

const MERGED_UPLOAD_BASE =
  `${GITHUB_ROOT_BASE}/merged_upload_files`;

const GLOBAL_FILES = [
  "01_global/00_GLOBAL_HARD_RULES.txt",
  "01_global/01_CONFIRMATION_FLOW.txt",
  "01_global/02_FACT_AND_SOURCE_POLICY.txt",
  "01_global/03_OUTPUT_STYLE_BASELINE.txt"
];

const MODULE_MAP = {
  sales_generator: {
    type: "folder",
    files: [
      // 舊版主檔案
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
      "02_sales_generator/06_OUTPUT_TEMPLATES.txt",

      // 新版細分檔案
      "02_sales_generator/platforms/FB_RULES.txt",
      "02_sales_generator/platforms/IG_RULES.txt",
      "02_sales_generator/platforms/THREADS_RULES.txt",

      "02_sales_generator/sizes/RATIO_1_1.txt",
      "02_sales_generator/sizes/RATIO_4_5.txt",
      "02_sales_generator/sizes/RATIO_9_16.txt",
      "02_sales_generator/sizes/RATIO_STORY_9_16.txt",

      "02_sales_generator/styles/INVEST_STYLE.txt",
      "02_sales_generator/styles/WARM_HOME_STYLE.txt",
      "02_sales_generator/styles/FIRST_BUYER_STYLE.txt",
      "02_sales_generator/styles/LUXURY_STYLE.txt",
      "02_sales_generator/styles/MINIMAL_STYLE.txt",

      "02_sales_generator/templates/FB_TEMPLATE.txt",
      "02_sales_generator/templates/IG_TEMPLATE.txt",
      "02_sales_generator/templates/THREADS_TEMPLATE.txt",
      "02_sales_generator/templates/SALES_CARD_TEXT_TEMPLATE.txt",
      "02_sales_generator/templates/IMAGE_PROMPT_TEMPLATE.txt",

      "02_sales_generator/hooks/FB_HOOK_LIBRARY.txt",
      "02_sales_generator/hooks/IG_HOOK_LIBRARY.txt",
      "02_sales_generator/hooks/THREADS_HOOK_LIBRARY.txt",

      "02_sales_generator/libraries/CTA_LIBRARY.txt",
      "02_sales_generator/libraries/HASHTAG_RULES.txt",
      "02_sales_generator/libraries/OBSERVATION_LIBRARY.txt",
      "02_sales_generator/libraries/EMOTIONAL_TRANSITION_LIBRARY.txt",
      "02_sales_generator/libraries/PROHIBITED_WORDS.txt",

      "02_sales_generator/workflows/PROPERTY_CONFIRMATION_WORKFLOW.txt",
      "02_sales_generator/workflows/IMAGE_SETTING_WORKFLOW.txt",
      "02_sales_generator/workflows/IMAGE_GENERATION_WORKFLOW.txt",
      "02_sales_generator/workflows/COPY_GENERATION_WORKFLOW.txt",
      "02_sales_generator/workflows/FINAL_REVIEW_WORKFLOW.txt",

      "02_sales_generator/errors/ERROR_CASES.txt",
      "02_sales_generator/errors/IMAGE_GENERATION_FAILSAFE.txt",
      "02_sales_generator/errors/MISSING_DATA_RESPONSE.txt"
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

  tax_redirect: {
  type: "folder",
  files: [
    "07_tax_redirect/00_TAX_ENTRY_REDIRECT_RULES.txt"
  ]
},

tax_calculator_dev: {
  type: "folder",
  files: [
    "07_tax_calculator/00_TAX_CALCULATOR_OVERVIEW.txt",
    "07_tax_calculator/01_HOUSE_LAND_TRANSACTION_TAX_RULES.txt",
    "07_tax_calculator/02_LAND_VALUE_INCREMENT_TAX_RULES.txt",
    "07_tax_calculator/03_PRINT_AND_UI_RULES.txt"
  ]
}
  },

  api_actions: {
    type: "folder",
    files: [
      "08_api_actions/00_API_ACTIONS_OVERVIEW.txt",
      "08_api_actions/01_NEARBY_API_CONTRACT.txt",
      "08_api_actions/02_GITHUB_KNOWLEDGE_LOADER_RULES.txt",
      "08_api_actions/03_GRANULAR_SALES_KNOWLEDGE_LOADER.txt"
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

const SALES_BASE_FILES = [
  "02_sales_generator/00_MODULE_OVERVIEW.txt",
  "02_sales_generator/01_PROPERTY_DATA_EXTRACTION.txt",
  "02_sales_generator/02_BUSINESS_CARD_EXTRACTION.txt"
];

const PLATFORM_FILES = {
  fb: "02_sales_generator/platforms/FB_RULES.txt",
  ig: "02_sales_generator/platforms/IG_RULES.txt",
  threads: "02_sales_generator/platforms/THREADS_RULES.txt"
};

const RATIO_FILES = {
  "1:1": "02_sales_generator/sizes/RATIO_1_1.txt",
  "4:5": "02_sales_generator/sizes/RATIO_4_5.txt",
  "9:16": "02_sales_generator/sizes/RATIO_9_16.txt",
  story: "02_sales_generator/sizes/RATIO_STORY_9_16.txt"
};

const STYLE_FILES = {
  invest: "02_sales_generator/styles/INVEST_STYLE.txt",
  warm_home: "02_sales_generator/styles/WARM_HOME_STYLE.txt",
  first_buyer: "02_sales_generator/styles/FIRST_BUYER_STYLE.txt",
  luxury: "02_sales_generator/styles/LUXURY_STYLE.txt",
  minimal: "02_sales_generator/styles/MINIMAL_STYLE.txt"
};

const TEMPLATE_FILES = {
  fb: "02_sales_generator/templates/FB_TEMPLATE.txt",
  ig: "02_sales_generator/templates/IG_TEMPLATE.txt",
  threads: "02_sales_generator/templates/THREADS_TEMPLATE.txt",
  sales_card: "02_sales_generator/templates/SALES_CARD_TEXT_TEMPLATE.txt",
  image_prompt: "02_sales_generator/templates/IMAGE_PROMPT_TEMPLATE.txt"
};

const HOOK_FILES = {
  fb: "02_sales_generator/hooks/FB_HOOK_LIBRARY.txt",
  ig: "02_sales_generator/hooks/IG_HOOK_LIBRARY.txt",
  threads: "02_sales_generator/hooks/THREADS_HOOK_LIBRARY.txt"
};

const LIBRARY_FILES = {
  cta: "02_sales_generator/libraries/CTA_LIBRARY.txt",
  hashtag: "02_sales_generator/libraries/HASHTAG_RULES.txt",
  observation: "02_sales_generator/libraries/OBSERVATION_LIBRARY.txt",
  emotional_transition: "02_sales_generator/libraries/EMOTIONAL_TRANSITION_LIBRARY.txt",
  prohibited_words: "02_sales_generator/libraries/PROHIBITED_WORDS.txt"
};

const WORKFLOW_FILES = {
  property_confirmation: "02_sales_generator/workflows/PROPERTY_CONFIRMATION_WORKFLOW.txt",
  image_setting: "02_sales_generator/workflows/IMAGE_SETTING_WORKFLOW.txt",
  image_generation: "02_sales_generator/workflows/IMAGE_GENERATION_WORKFLOW.txt",
  copy_generation: "02_sales_generator/workflows/COPY_GENERATION_WORKFLOW.txt",
  final_review: "02_sales_generator/workflows/FINAL_REVIEW_WORKFLOW.txt"
};

const ERROR_FILES = {
  image_failsafe: "02_sales_generator/errors/IMAGE_GENERATION_FAILSAFE.txt",
  missing_data: "02_sales_generator/errors/MISSING_DATA_RESPONSE.txt",
  error_cases: "02_sales_generator/errors/ERROR_CASES.txt"
};

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizePlatform(value) {
  const raw = String(value || "").trim();
  const v = normalizeText(raw);

  if (!v) return "";

  if (["fb", "facebook", "臉書"].includes(v)) return "fb";
  if (["ig", "instagram", "ins"].includes(v)) return "ig";
  if (["threads", "thread", "串文"].includes(v)) return "threads";

  return v;
}

function normalizeRatio(value) {
  const raw = String(value || "").trim();
  const v = raw.toLowerCase();

  if (!v) return "";

  if (v.includes("4:5") || raw.includes("4比5")) return "4:5";
  if (v.includes("1:1") || raw.includes("1比1") || raw.includes("正方形")) return "1:1";
  if (v.includes("9:16") || raw.includes("9比16") || raw.includes("限動") || raw.includes("直式")) return "9:16";
  if (v.includes("story")) return "story";

  return v;
}

function normalizeStyle(value) {
  const raw = String(value || "").trim();
  const v = normalizeText(raw);

  if (!v) return "";

  if (
    v.includes("warm") ||
    raw.includes("自住") ||
    raw.includes("溫暖") ||
    raw.includes("溫馨") ||
    raw.includes("家庭")
  ) {
    return "warm_home";
  }

  if (
    v.includes("invest") ||
    raw.includes("投資") ||
    raw.includes("理性")
  ) {
    return "invest";
  }

  if (
    v.includes("first") ||
    raw.includes("首購") ||
    raw.includes("新手")
  ) {
    return "first_buyer";
  }

  if (
    v.includes("luxury") ||
    raw.includes("高質感") ||
    raw.includes("精品") ||
    raw.includes("豪宅")
  ) {
    return "luxury";
  }

  if (
    v.includes("minimal") ||
    raw.includes("極簡") ||
    raw.includes("簡約") ||
    raw.includes("乾淨")
  ) {
    return "minimal";
  }

  return v;
}

function normalizeStage(value) {
  const raw = String(value || "").trim();
  const v = normalizeText(raw);

  if (!v) return "";

  if (
    v.includes("confirm") ||
    v.includes("property_confirmation") ||
    raw.includes("確認")
  ) {
    return "property_confirmation";
  }

  if (
    v.includes("setting") ||
    v.includes("image_setting") ||
    raw.includes("設定")
  ) {
    return "image_setting";
  }

  if (
    v.includes("image_generation") ||
    v.includes("generate_image") ||
    raw.includes("產圖") ||
    raw.includes("圖片")
  ) {
    return "image_generation";
  }

  if (
    v.includes("copy") ||
    v.includes("copy_generation") ||
    raw.includes("文案")
  ) {
    return "copy_generation";
  }

  if (
    v.includes("review") ||
    v.includes("final") ||
    raw.includes("檢查")
  ) {
    return "final_review";
  }

  return v;
}

function uniqueFiles(files) {
  return [...new Set(files.filter(Boolean))];
}

function cleanSectionPath(section) {
  const s = String(section || "").trim();

  if (!s) return "";

  if (s.includes("..")) {
    throw {
      status: 400,
      message: "Invalid section path"
    };
  }

  return s
    .replace(/^\/+/, "")
    .replace(/\.txt$/i, "");
}

function resolveSectionPath(moduleName, section) {
  const moduleConfig = MODULE_MAP[moduleName];

  if (!moduleConfig || moduleConfig.type !== "folder") {
    throw {
      status: 400,
      message: "Section mode only supports folder modules"
    };
  }

  const clean = cleanSectionPath(section);

  if (!clean) {
    throw {
      status: 400,
      message: "Missing section"
    };
  }

  const matched = moduleConfig.files.find((filePath) => {
    const noExt = filePath.replace(/\.txt$/i, "");

    return (
      noExt === clean ||
      noExt.endsWith(`/${clean}`) ||
      filePath.endsWith(`/${clean}.txt`)
    );
  });

  if (!matched) {
    throw {
      status: 400,
      message: "Invalid section",
      detail: {
        module: moduleName,
        section,
        allowedSections: moduleConfig.files.map((file) =>
          file.split("/").pop().replace(".txt", "")
        )
      }
    };
  }

  return matched;
}

function shouldUseGranularSalesMode(query) {
  return Boolean(
    query.platform ||
    query.ratio ||
    query.style ||
    query.stage
  );
}

function buildSalesGeneratorFiles(query) {
  const section = query.section;
  const legacy = String(query.legacy || "").toLowerCase() === "true";
  const mode = String(query.mode || "").toLowerCase();

  if (section) {
    return [resolveSectionPath("sales_generator", section)];
  }

  // 舊版完整載入：只有你明確要求 legacy=true 或 mode=folder 才會載全部。
  if (legacy || mode === "folder" || mode === "legacy") {
    return MODULE_MAP.sales_generator.files;
  }

  const platform = normalizePlatform(query.platform);
  const ratio = normalizeRatio(query.ratio);
  const style = normalizeStyle(query.style);
  const stage = normalizeStage(query.stage);

  const files = [];

  // 精準載入基礎規則
  files.push(...GLOBAL_FILES);
  files.push(...SALES_BASE_FILES);

  if (PLATFORM_FILES[platform]) {
    files.push(PLATFORM_FILES[platform]);
  }

  if (RATIO_FILES[ratio]) {
    files.push(RATIO_FILES[ratio]);
  }

  if (STYLE_FILES[style]) {
    files.push(STYLE_FILES[style]);
  }

  if (stage === "property_confirmation") {
    files.push(WORKFLOW_FILES.property_confirmation);
    files.push(ERROR_FILES.missing_data);
  }

  if (stage === "image_setting") {
    files.push("02_sales_generator/03_SALES_IMAGE_CARD_RULES.txt");
    files.push(TEMPLATE_FILES.sales_card);
    files.push(TEMPLATE_FILES.image_prompt);
    files.push(WORKFLOW_FILES.image_setting);
    files.push(ERROR_FILES.missing_data);
  }

  if (stage === "image_generation") {
    files.push("02_sales_generator/03_SALES_IMAGE_CARD_RULES.txt");
    files.push(TEMPLATE_FILES.sales_card);
    files.push(TEMPLATE_FILES.image_prompt);
    files.push(LIBRARY_FILES.cta);
    files.push(WORKFLOW_FILES.image_setting);
    files.push(WORKFLOW_FILES.image_generation);
    files.push(ERROR_FILES.image_failsafe);
  }

  if (stage === "copy_generation") {
    if (TEMPLATE_FILES[platform]) {
      files.push(TEMPLATE_FILES[platform]);
    }

    if (HOOK_FILES[platform]) {
      files.push(HOOK_FILES[platform]);
    }

    files.push(LIBRARY_FILES.cta);
    files.push(LIBRARY_FILES.prohibited_words);
    files.push(WORKFLOW_FILES.copy_generation);

    if (platform === "ig") {
      files.push(LIBRARY_FILES.hashtag);
    }

    if (platform === "threads") {
      files.push(LIBRARY_FILES.observation);
      files.push(LIBRARY_FILES.emotional_transition);
    }
  }

  if (stage === "final_review") {
    files.push(WORKFLOW_FILES.final_review);
    files.push(ERROR_FILES.error_cases);
  }

  // 沒指定 stage，但有指定 platform / ratio / style 時，回傳輕量規則，不載全部。
  if (!stage && shouldUseGranularSalesMode(query)) {
    files.push("02_sales_generator/04_COPY_PLATFORM_RULES.txt");
    files.push("02_sales_generator/05_STYLE_LIBRARY.txt");
    files.push("02_sales_generator/07_GLOBAL_OUTPUT_RULES.txt");
  }

  // 完全沒有 platform / ratio / style / stage 時，也不要載整包，改回傳基礎索引。
  if (!shouldUseGranularSalesMode(query)) {
    files.push("02_sales_generator/04_COPY_PLATFORM_RULES.txt");
    files.push("02_sales_generator/05_STYLE_LIBRARY.txt");
    files.push("02_sales_generator/06_CONFIRMATION_FLOW.txt");
    files.push("02_sales_generator/07_GLOBAL_OUTPUT_RULES.txt");
  }

  return uniqueFiles(files);
}

function buildGenericModuleFiles(moduleName, query) {
  const moduleConfig = MODULE_MAP[moduleName];

  if (!moduleConfig) {
    throw {
      status: 400,
      message: "Invalid module"
    };
  }

  if (moduleConfig.type === "folder") {
    if (query.section) {
      return [resolveSectionPath(moduleName, query.section)];
    }

    return moduleConfig.files;
  }

  return [];
}

async function fetchTextFileByPath(filePath) {
  const url = `${GITHUB_ROOT_BASE}/${filePath}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw {
      status: response.status,
      url,
      filePath
    };
  }

  const text = await response.text();

  return {
    filePath,
    source: url,
    content: text
  };
}

async function fetchSingleMasterFile(fileName) {
  const url = `${MERGED_UPLOAD_BASE}/${fileName}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw {
      status: response.status,
      url,
      fileName
    };
  }

  return await response.text();
}

async function fetchMultipleFiles(filePaths) {
  const loadedFiles = [];

  for (const filePath of filePaths) {
    const file = await fetchTextFileByPath(filePath);
    loadedFiles.push(file);
  }

  return loadedFiles;
}

function mergeFileContents(loadedFiles) {
  return loadedFiles
    .map((file) => {
      return [
        `===== ${file.filePath} =====`,
        file.content
      ].join("\n\n");
    })
    .join("\n\n");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const query =
      req.method === "POST"
        ? { ...(req.query || {}), ...(req.body || {}) }
        : { ...(req.query || {}) };

    const moduleName = normalizeText(query.module);

    if (!moduleName) {
      return res.status(400).json({
        ok: false,
        error: "Missing module parameter",
        allowedModules: Object.keys(MODULE_MAP)
      });
    }

    const moduleConfig = MODULE_MAP[moduleName];

    if (!moduleConfig) {
      return res.status(400).json({
        ok: false,
        error: "Invalid module",
        allowedModules: Object.keys(MODULE_MAP)
      });
    }

    // sales_generator：新版精準載入
    if (moduleName === "sales_generator") {
      const filePaths = buildSalesGeneratorFiles(query);
      const loadedFiles = await fetchMultipleFiles(filePaths);
      const content = mergeFileContents(loadedFiles);

      return res.status(200).json({
        ok: true,
        module: moduleName,
        mode: query.section
          ? "section"
          : shouldUseGranularSalesMode(query)
            ? "granular"
            : "base",
        platform: normalizePlatform(query.platform),
        ratio: normalizeRatio(query.ratio),
        style: normalizeStyle(query.style),
        stage: normalizeStage(query.stage),
        files: loadedFiles.map((file) => ({
          filePath: file.filePath,
          source: file.source
        })),
        loadedFiles: loadedFiles.map((file) => file.filePath),
        content
      });
    }

    // folder module：維持舊版邏輯
    if (moduleConfig.type === "folder") {
      const filePaths = buildGenericModuleFiles(moduleName, query);
      const loadedFiles = await fetchMultipleFiles(filePaths);
      const content = mergeFileContents(loadedFiles);

      return res.status(200).json({
        ok: true,
        module: moduleName,
        mode: query.section ? "section" : "folder",
        files: loadedFiles.map((file) => ({
          filePath: file.filePath,
          source: file.source
        })),
        loadedFiles: loadedFiles.map((file) => file.filePath),
        content
      });
    }

    // single module：維持舊版 merged_upload_files MASTER txt
    if (moduleConfig.type === "single") {
      const fileName = moduleConfig.file;
      const content = await fetchSingleMasterFile(fileName);

      return res.status(200).json({
        ok: true,
        module: moduleName,
        mode: "single",
        fileName,
        source: `${MERGED_UPLOAD_BASE}/${fileName}`,
        content
      });
    }

    return res.status(500).json({
      ok: false,
      error: "Unknown module config type"
    });
  } catch (error) {
    return res.status(error.status || 502).json({
      ok: false,
      error:
        error.message ||
        "Failed to fetch knowledge file from GitHub",
      status: error.status || 500,
      source: error.url || null,
      filePath: error.filePath || null,
      detail: error.detail || null
    });
  }
}

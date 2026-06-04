# V0.1 Repo 盤點與 Legacy 分類

盤點日期：2026-06-04

範圍：僅針對目前 `api/` 資料夾與既有 repo 結構做靜態盤點。未連接 Google API、未連接 Supabase、未修改 Vercel 環境變數、未建立資料表、未部署。

## Project Root Check

- 已確認目前目錄：`C:\Users\User\Documents\real-estate-nearby-api`
- 已確認根目錄包含：
  - `package.json`
  - `README.md`
  - `api/`

## Repo 目前用途判斷

目前這個 repo 不是單一用途 API，而是同時混有新版周邊機能 GPTs 可能會用到的核心 API，以及舊版 / 其他 GPTs knowledge loader API。

目前 repo 同時包含：

- 周邊機能查詢 API
- 店家認證 API
- 店家設定 debug API
- 舊版 / 其他 GPTs knowledge loader API

因此 V0.1 的重點不是立即改程式，而是先把現有 API 分類，確認哪些檔案和新版周邊機能 GPTs 高度相關、哪些屬於 legacy 保留、哪些未來可能停用或改成 admin-only。

## Project Snapshot

- `package.json` 宣告為極簡 Node ESM 專案：
  - package name: `real-estate-nearby-api`
  - version: `1.0.0`
  - type: `module`
- `README.md` 存在，但目前內容看起來有 mojibake / 編碼亂碼。
- API files found:
  - `api/debug-store-config.js`
  - `api/knowledge-module.js`
  - `api/load-fb-card-knowledge.js`
  - `api/load-knowledge.js`
  - `api/load-public-knowledge.js`
  - `api/nearby-facilities.js`
  - `api/verify-store-access.js`

## API 盤點表

| 檔案 | 目前功能 | 與新版周邊機能 GPTs 是否相關 | 建議處理方式 | 備註 |
| --- | --- | --- | --- | --- |
| `api/nearby-facilities.js` | 使用 Overpass / OpenStreetMap 查詢地址周邊設施；目前需傳入 `address`、`lat`、`lng` | 高度相關 | 重寫候選 | 新版方向預計改為 Google Geocoding + Google Places，並加入 cache、quota、usage logs |
| `api/verify-store-access.js` | 使用 Vercel env 中的店家設定驗證店家代碼，回傳店家狀態與 disclosure | 高度相關 | 重寫候選 | 新版方向預計改查 Supabase `stores` 與 nearby 設定 / quota |
| `api/debug-store-config.js` | 讀取 `STORE_ACCESS_CONFIG` 做店家設定檢查與 debug summary | 間接相關 | 停用候選 / admin-only 候選 | 若保留，應強制 token 並避免暴露敏感設定摘要 |
| `api/knowledge-module.js` | 從 GitHub raw 載入多模組 knowledge files，支援 section / granular mode | 非主流程直接相關 | legacy 保留 | 與新版周邊查詢 API 主流程無直接關係，但可能仍供其他 GPTs 使用 |
| `api/load-knowledge.js` | 舊版 fb_card knowledge loader，從 GitHub raw 載入指定 stage 文字 | 非主流程直接相關 | legacy / 停用候選 | 看起來是較舊版本，錯誤處理存在 catch scope 風險 |
| `api/load-fb-card-knowledge.js` | 載入 `fb_card` knowledge files，回傳 `knowledgeText` | 非主流程直接相關 | legacy 保留 | 與新版周邊主流程無直接關係，可暫時保留避免影響其他 GPTs |
| `api/load-public-knowledge.js` | 載入 `fb_card_public` knowledge files，回傳 `knowledgeText` | 非主流程直接相關 | legacy 保留 | 與新版周邊主流程無直接關係，可暫時保留避免影響公開 knowledge 流程 |

## Endpoint Inventory

### `/api/nearby-facilities`

- File: `api/nearby-facilities.js`
- Handler type: async serverless handler
- Allowed method: `POST`
- Non-POST behavior: returns HTTP `405`
- Request body:
  - `address` required
  - `lat` required number
  - `lng` required number
  - `radius` optional, clamped to 100-500 meters; default `500`
  - `categories` optional array
- Supported categories:
  - `school`
  - `transport`
  - `shopping`
  - `park`
  - `medical`
- External dependency:
  - Overpass API via `https://overpass.private.coffee/api/interpreter`
  - fallback to `https://overpass-api.de/api/interpreter`
- Response shape:
  - `success`
  - `query`
  - `facilities`
  - `summary`
  - `note` on success
  - Overpass diagnostics on external fetch failure
- Observations:
  - No Google API usage found.
  - Radius cannot exceed 500 meters because the code clamps input.
  - Results are deduplicated by `category-name`, sorted by distance per selected category, and capped at 5 items per category.
  - Many response messages and summary labels appear mojibake/encoding-corrupted.
  - In `buildFacilitySummary`, template strings appear to contain `{radius}` and `{item.name}` instead of `${radius}` and `${item.name}` in visible output, so summaries may show literal placeholders rather than values.

### `/api/verify-store-access`

- File: `api/verify-store-access.js`
- Handler type: synchronous serverless handler
- CORS: `*`, `POST,OPTIONS`, `Content-Type`
- Allowed methods:
  - `OPTIONS`
  - `POST`
- Non-POST behavior: returns HTTP `200` with `verified: false`
- Request body accepts store id aliases:
  - `storeId`
  - `storeCode`
  - `store`
  - `storeNo`
  - `id`
- Request body accepts access code aliases:
  - `accessCode`
  - `verifyCode`
  - `verificationCode`
  - `authCode`
  - `password`
  - `code`
- Environment variables read:
  - `PUBLIC_ALLOWED_STORE_IDS`
  - `ALLOWED_STORE_IDS`
  - `STORE_ACCESS_CONFIG`
- Response shape on success:
  - `verified: true`
  - `success: true`
  - `reason: "OK"`
  - `source`
  - `runtimeVersion`
  - `requestId`
  - store metadata
  - `features`
  - disclosure fields
- Validation flow:
  - Requires public allowlist.
  - Requires store id in allowlist.
  - Requires `STORE_ACCESS_CONFIG` JSON object.
  - Requires store config entry.
  - Requires matching code.
  - Requires `active === true`.
  - Validates `expiresAt` if present.
  - Requires disclosure fields:
    - `brokerageName`
    - `brokerName`
    - `brokerLicenseNo`
- Observations:
  - Store ids are normalized to uppercase.
  - Most failures return HTTP `200` with failure flags, which may be intentional for action integrations but should be documented for clients.
  - Error and message strings appear mojibake/encoding-corrupted.
  - The endpoint exposes disclosure details on successful verification.

### `/api/debug-store-config`

- File: `api/debug-store-config.js`
- Handler type: synchronous serverless handler
- CORS: `*`, `GET,OPTIONS`, `Content-Type`
- Allowed methods:
  - `OPTIONS`
  - `GET`
- Non-GET behavior: returns HTTP `200` with `success: false`
- Query parameters:
  - `token` optional/required depending on `DEBUG_TOKEN`
- Environment variables read:
  - `DEBUG_TOKEN`
  - `STORE_ACCESS_CONFIG`
- Response shape:
  - config metadata
  - config fingerprint
  - store id lists
  - unexpected/missing store ids
  - ghost keyword hits
  - suspicious store summaries
  - disclosure previews
- Observations:
  - If `DEBUG_TOKEN` is empty or unset, the endpoint allows access without token.
  - Successful response includes store names and disclosure previews. This is useful for diagnostics but sensitive enough that production access should require a token.
  - Expected store names and messages appear mojibake/encoding-corrupted.

### `/api/load-fb-card-knowledge`

- File: `api/load-fb-card-knowledge.js`
- Handler type: async serverless handler
- CORS: `*`, `GET, POST, OPTIONS`, `Content-Type`
- Allowed methods:
  - `OPTIONS`
  - `POST`
- Non-POST behavior: returns HTTP `200` with `success: false`
- Request body:
  - `stage`
- Allowed stages:
  - `property_extraction`
  - `business_card_extraction`
  - `fb_card_rules`
  - `style_selection`
  - `image_prompt`
  - `generation_failsafe`
  - `compliance_check`
- External dependency:
  - GitHub raw content under `real-estate-gpt-knowledge/main/fb_card/`
- Response shape:
  - `ok`
  - `success`
  - `stage`
  - `fileName`
  - `contentLength`
  - `knowledgeText`
  - `error`
  - `allowedStages`
- Observations:
  - Returns at most 7,500 characters of loaded content.
  - JSON string body is parsed.
  - JSON parse errors fall into the outer catch and return `success: false`.
  - This endpoint overlaps heavily with `/api/load-public-knowledge`, except source folder differs.

### `/api/load-public-knowledge`

- File: `api/load-public-knowledge.js`
- Handler type: async serverless handler
- CORS: `*`, `GET, POST, OPTIONS`, `Content-Type`
- Allowed methods:
  - `OPTIONS`
  - `POST`
- GET behavior: returns HTTP `200` with `success: false`, `error: "POST only"`, and `allowedStages`
- Request body:
  - `stage`
- Allowed stages:
  - `property_extraction`
  - `business_card_extraction`
  - `fb_card_rules`
  - `style_selection`
  - `image_prompt`
  - `generation_failsafe`
  - `compliance_check`
- External dependency:
  - GitHub raw content under `real-estate-gpt-knowledge/main/fb_card_public/`
- Response shape:
  - `ok`
  - `success`
  - `stage`
  - `fileName`
  - `contentLength`
  - `knowledgeText`
  - `error`
  - `allowedStages`
- Observations:
  - Returns at most 7,500 characters of loaded content.
  - Handles invalid JSON string bodies explicitly.
  - Mostly mirrors `/api/load-fb-card-knowledge`.

### `/api/load-knowledge`

- File: `api/load-knowledge.js`
- Handler type: async serverless handler
- Allowed method: `POST`
- Non-POST behavior: returns HTTP `405`
- Request body:
  - `stage`
- Allowed stages:
  - `property_extraction`
  - `business_card_extraction`
  - `fb_card_rules`
  - `style_selection`
  - `image_prompt`
  - `generation_failsafe`
- External dependency:
  - GitHub raw content under `real-estate-gpt-knowledge/main/fb_card/`
- Response shape on success:
  - `success`
  - `module: "fb_card"`
  - `stage`
  - `fileName`
  - `content`
- Observations:
  - This appears to be an older/legacy variant of `/api/load-fb-card-knowledge`.
  - It does not include `compliance_check`.
  - It returns up to 10,000 characters as `content`, while newer loaders return up to 7,500 characters as `knowledgeText`.
  - The `catch` block references `stage`, `fileName`, and `text` variables declared inside `try`; if an error occurs before those bindings are available to the catch scope, the catch response itself can throw.
  - The catch response also reports `ok: true`, which conflicts with error semantics.

### `/api/knowledge-module`

- File: `api/knowledge-module.js`
- Handler type: async serverless handler
- CORS: `*`, `GET,POST,OPTIONS`, `Content-Type`
- Allowed methods:
  - `OPTIONS`
  - `GET`
  - `POST`
  - Other non-POST methods are not explicitly rejected and will be treated like query-only requests.
- Request data:
  - For `POST`: merges `req.query` and `req.body`
  - For other methods: uses `req.query`
- Main required parameter:
  - `module`
- Supported modules:
  - `sales_generator`
  - `nearby_facilities`
  - `floorplan_converter`
  - `market_content`
  - `tax_redirect`
  - `tax_calculator_dev`
  - `api_actions`
  - `workflows`
  - `state_machine`
  - `examples`
- Optional parameters:
  - `section`
  - `legacy`
  - `mode`
  - `platform`
  - `ratio`
  - `style`
  - `stage`
- External dependency:
  - GitHub raw content under `real-estate-gpt-knowledge/main/`
  - For single master files: `real-estate-gpt-knowledge/main/merged_upload_files/`
- Response shape:
  - `ok`
  - `module`
  - `mode`
  - selected normalized fields for `sales_generator`
  - `files`
  - `loadedFiles`
  - `content`
  - error metadata on failure
- Observations:
  - This is the most complete and flexible knowledge loader.
  - `section` mode validates against the configured file list and blocks `..` in section paths.
  - Requests can fetch many files sequentially, so large modules may be slow or fragile if GitHub raw access is unavailable.
  - Several normalization aliases and comments appear mojibake/encoding-corrupted.
  - Non-POST, non-GET methods are not explicitly rejected after `OPTIONS`.

## 現有 `nearby-facilities.js` 與新版需求差距

- 目前使用 Overpass / OpenStreetMap，不符合新版 Google Geocoding + Google Places 方向。
- 目前需要呼叫端提供 `lat` / `lng`，新版希望使用者只輸入地址後，由 API 端負責 geocoding。
- 目前半徑上限為 500 公尺；新版第一版希望固定 1000 公尺，未來預留 500 / 1000 / 1500 公尺。
- 目前沒有店家認證檢查。
- 目前沒有每日額度控管。
- 目前沒有每月額度控管。
- 目前沒有 Supabase cache。
- 目前沒有 usage logs。
- 目前沒有 Google API usage logs。
- 目前沒有分店用量統計。
- 目前沒有避免同地址、同半徑、同分類重複呼叫外部 API 的機制。

## 現有 `verify-store-access.js` 與新版 Supabase 店家認證差距

- 目前使用 Vercel env `STORE_ACCESS_CONFIG` 作為店家資料來源。
- 新版要改用 Supabase `stores` 表。
- 目前不查 `nearby_store_settings`。
- 目前不回傳今日剩餘查詢次數。
- 目前不回傳本月剩餘查詢次數。
- 目前不檢查該店是否啟用 nearby 功能。
- 目前不寫入認證或查詢紀錄。
- 目前 `features` 雖有回傳，但沒有和 nearby quota 綁定。

## External Services Used By Current API Code

- Overpass API:
  - Used by `api/nearby-facilities.js`
  - Purpose: nearby OpenStreetMap facility lookup
- GitHub raw content:
  - Used by `api/load-knowledge.js`
  - Used by `api/load-fb-card-knowledge.js`
  - Used by `api/load-public-knowledge.js`
  - Used by `api/knowledge-module.js`
  - Purpose: remote knowledge text loading

No Supabase usage was found in the current `api/` files. No Google API usage was found in the current `api/` files.

## Environment Variables Referenced

- `PUBLIC_ALLOWED_STORE_IDS`
  - Used by `api/verify-store-access.js`
  - Public store id allowlist; comma-separated
- `ALLOWED_STORE_IDS`
  - Used by `api/verify-store-access.js`
  - Fallback store id allowlist; comma-separated
- `STORE_ACCESS_CONFIG`
  - Used by `api/verify-store-access.js`
  - Used by `api/debug-store-config.js`
  - JSON object keyed by store id
- `DEBUG_TOKEN`
  - Used by `api/debug-store-config.js`
  - Optional guard for debug endpoint

## Main Risks And Findings

1. `api/load-knowledge.js` catch block can throw again.
   - The catch block references `stage`, `fileName`, and `text` from inside the try block. Those bindings are not available in catch scope, so error handling can fail instead of returning a stable error response.

2. `api/debug-store-config.js` may expose sensitive config previews if `DEBUG_TOKEN` is unset.
   - The token check only blocks when `DEBUG_TOKEN` has a value. In an environment where it is absent, the endpoint can return store summaries and disclosure previews without authentication.

3. Several files contain mojibake/encoding-corrupted strings.
   - This affects client-facing messages, labels, comments, store names, and possibly category summaries. It may reduce trust and can make downstream automated parsing harder.

4. `api/nearby-facilities.js` summary strings appear to use literal placeholders.
   - Visible strings include `{radius}` and `{item.name}` where template interpolation likely intended `${radius}` and `${item.name}`.

5. HTTP status semantics are inconsistent across endpoints.
   - Some endpoints return `400`, `405`, or `500` for errors.
   - Others return HTTP `200` with `success: false`.
   - This may be intentional for GPT/action compatibility, but should be standardized or documented per endpoint.

6. Knowledge loader endpoints are duplicated.
   - `/api/load-knowledge`, `/api/load-fb-card-knowledge`, and `/api/load-public-knowledge` overlap significantly.
   - Differences include source folder, response field names, stage list, truncation length, CORS, and error handling.

7. `api/knowledge-module.js` does not explicitly reject unsupported HTTP methods.
   - Any non-POST method other than `OPTIONS` is treated as query-only. If only `GET` and `POST` are intended, this should be tightened.

8. Remote content loading has no caching layer.
   - GitHub raw and Overpass calls are made live. API availability and latency depend on third-party services.

## Suggested Cleanup Priority

1. Fix runtime-breaking or error-path issues first:
   - `api/load-knowledge.js` catch block scope issue
   - `api/nearby-facilities.js` summary interpolation

2. Secure debug access:
   - Require `DEBUG_TOKEN` in production
   - Avoid returning disclosure previews unless explicitly needed

3. Normalize endpoint contracts:
   - Decide whether action endpoints should always return HTTP `200`
   - Document or standardize `ok`, `success`, `error`, `message`, `content`, and `knowledgeText`

4. Repair encoding/mojibake:
   - Restore intended Traditional Chinese text in messages, comments, labels, and expected store names

5. Consolidate knowledge loaders:
   - Prefer a single canonical loader, likely `api/knowledge-module.js` for general modules and one explicit public loader if needed

6. Add lightweight operational protection:
   - Cache remote knowledge files where appropriate
   - Add clearer fetch timeout handling for GitHub raw loaders
   - Keep Overpass fallback behavior documented

## 下一階段 V0.2 建議執行內容

V0.2 建議只做 Supabase Schema 規劃文件，不建表。

建議新增文件：

- `docs/supabase-nearby-schema-plan.md`

V0.2 文件可先規劃：

- `stores` 表用途與欄位
- `nearby_store_settings` 表用途與欄位
- nearby cache 表用途與欄位
- usage logs 表用途與欄位
- Google API usage logs 表用途與欄位
- 分店每日 / 每月 quota 統計方式
- 同地址、同半徑、同分類 cache key 設計
- 不建表、不部署、不接 Supabase 的執行邊界

## Non-Actions Confirmed

- Did not modify `api/*.js`.
- Did not modify `package.json`.
- Did not modify `README.md`.
- Did not delete files.
- Did not connect to Google API.
- Did not connect to Supabase.
- Did not modify Vercel environment variables.
- Did not create database tables.
- Did not deploy.

## V0.1 執行結果確認

- 實際新增檔案：
  - `docs/api-inventory-review.md`
- 是否修改既有檔案：否
- 是否刪除檔案：否
- 是否接觸 Google API：否
- 是否接觸 Supabase：否
- 是否修改 Vercel 環境變數：否
- 是否建立資料表：否
- 是否修改現有 API 行為：否

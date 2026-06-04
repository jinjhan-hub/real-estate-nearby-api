# V1.1 Google API 後端使用控管與 cache 流程規劃文件

建立日期：2026-06-04

## 1. 任務範圍

V1.1 僅新增 Google API 後端使用控管與 cache 流程規劃文件。

本次任務不做以下事項：

- 不呼叫 Google API。
- 不連線 Supabase。
- 不執行 migration。
- 不新增或修改 migration / SQL 檔案。
- 不修改 `api/*.js`。
- 不修改 `package.json`。
- 不修改 `README.md`。
- 不修改既有 docs 文件。
- 不修改 Vercel 環境變數。
- 不寫入 API Key。
- 不部署。
- 不 commit。
- 不 push。

## 2. 為什麼要做後端 Google API 使用控管

Google Maps Platform 不應由 GPTs、前端或公開使用者直接呼叫。所有 Google Maps / Places / Geocoding request 都應經過後端 API，由後端統一處理權限、cache、quota、錯誤訊息與用量紀錄。

後端控管的目的：

- 避免 Google API Key 外洩。
- 避免使用者或 GPTs 任意消耗 Google API 額度。
- 讓同一地址、同一半徑、同一分類條件可以優先使用 cache。
- 讓系統能記錄每次查詢、cache hit、Google API 呼叫、錯誤與成本控管判斷。
- 讓 Admin Dashboard 可以檢視每日 / 每月用量與剩餘額度。

Google Console quota 與 Billing budget 仍然必要，但它們屬於最後防線。系統內部仍需要自己的後端控管機制。

## 3. API Key 安全規劃

Google API Key 僅能放在 server-side 環境變數，不得出現在 repo、README、`.env.example` 真實值、Codex 對話內容、GPTs 設定、前端 bundle 或公開 API response。

建議環境變數名稱：

```txt
GOOGLE_MAPS_SERVER_KEY
```

安全原則：

- API Key 只存放於 Vercel Environment Variables。
- API Key 不回傳給 GPTs / 前端。
- API Key 不寫入任何文件、log、migration、SQL、測試資料或 commit。
- Google Cloud Console 需限制 API Key 可用 API 類型。
- 第一版僅允許後端 Vercel API 使用。

Google Cloud Console 建議啟用並限制：

- Places API
- Places API (New)
- Geocoding API

## 4. 後端系統 Google API 呼叫上限

後端需要建立系統級 Google API 呼叫上限，避免即使店家額度尚未用完，整體系統仍因異常流量快速消耗 Google 費用。

建議第一版環境變數：

```txt
GOOGLE_SYSTEM_DAILY_QUOTA=50 或 100
GOOGLE_SYSTEM_MONTHLY_QUOTA=1000 或 3000
```

處理原則：

1. 每次可能呼叫 Google API 前，先檢查系統今日 / 本月 Google API 使用量。
2. 若系統額度已達上限，不呼叫 Google API。
3. 額度封鎖時仍應寫入查詢紀錄或錯誤紀錄，讓 Admin Dashboard 可追蹤。
4. 對 GPTs / 前端回傳友善錯誤，例如：

```txt
今日 Google API 查詢額度已達上限，請稍後再試或聯繫管理員。
```

cache hit 不應計入 Google API 實際呼叫次數。

## 5. Cache-first 查詢流程

建議後端查詢流程：

```txt
使用者輸入地址
-> 後端驗證店家 access code / token
-> 檢查店家 nearby 是否啟用
-> 檢查店家每日 / 每月查詢額度
-> 標準化地址、半徑、分類與語系參數
-> 產生 request_hash 或 cache_key
-> 先查 Supabase cache
-> cache hit：讀取 cache 結果並寫入 usage log
-> cache miss：檢查系統與店家 Google API 額度
-> 額度允許才呼叫 Google Geocoding / Places API
-> 寫入 cache、usage log、Google API usage log
-> 回傳整理後結果
```

cache hit 規則：

- 不呼叫 Google API。
- 不增加 Google API 實際呼叫次數。
- 仍需寫入 `nearby_usage_logs`，記錄本次使用者查詢。
- 回傳內容應標示 `cache_hit = true`。

cache miss 規則：

- 需先檢查店家與系統 quota。
- 只有 quota 通過才可呼叫 Google API。
- Google API 成功或失敗都應寫入 Google API usage log。
- 成功結果寫入 `nearby_cache`。

## 6. Request Hash 規劃

`request_hash` 用來避免同一條件重複呼叫 Google API。

建議 hash 組成：

```txt
normalized_address
lat
lng
search_radius_m
place_types
language
region
version
```

設計原則：

- `normalized_address` 需先標準化，避免同一地址因空白、全半形或格式差異導致 cache miss。
- `lat` / `lng` 建議 round 到固定精度，避免微小座標差異造成 cache miss。
- `place_types` 應排序後再進入 hash，避免順序不同造成不同 hash。
- `version` 可用於未來 Google type mapping 或資料格式調整後主動切換 cache。
- 不應直接使用完整地址作為公開 cache key。

目前 V1.0 migration 使用 `cache_key`，尚未獨立規劃 `request_hash` 欄位。V1.1.1 可評估是否將 `cache_key` 視為 request hash，或新增更明確的 `request_hash` 欄位。

## 7. 24 小時同條件重複查詢

第一版建議以 24 小時為 cache TTL 起點。

同一 `request_hash` 或 `cache_key` 在 24 小時內命中時：

- 不重新呼叫 Google API。
- 直接讀取 Supabase cache。
- 仍記錄 usage log。
- 回傳 cache 結果。

未來可增加以下例外：

- admin refresh
- forced refresh
- cache TTL 調整
- 特定錯誤狀態重新查詢

第一版不建議開放使用者自行 forced refresh，避免繞過成本控管。

## 8. Supabase Usage Log 欄位對照

V1.1 需檢查 V1.0 migration 是否足以支援後端控管。

| 欄位需求 | 目前 migration 是否支援 | 目前欄位 / 對應方式 | 是否建議補強 |
|---|---|---|---|
| `request_hash` | 部分支援 | 目前有 `cache_key` | 建議 V1.1.1 評估是否新增 `request_hash` |
| `cache_hit` | 支援 | `nearby_usage_logs.cache_hit` | 暫可使用 |
| `api_called` | 未直接支援 | 可由 `nearby_google_api_usage_logs.status` 與是否有紀錄推斷 | 建議 V1.1.1 新增 |
| `api_name` | 支援 | `nearby_google_api_usage_logs.google_api` | 暫可使用 |
| `created_at` | 支援 | 多數 log table 皆有 `created_at` | 暫可使用 |
| `estimated_cost_tier` | 未支援 | 無 | 建議 V1.1.1 新增 |
| `note` | 未支援 | 無 | 可選補強 |
| `error_message` | 未支援 | `nearby_usage_logs.error_code` 可部分替代 | 建議 V1.1.1 新增 |

V1.1 不修改 migration，只記錄差距與下一步建議。

## 9. Google API Usage Logs 規劃

每一次 Google API 實際呼叫或被控管機制擋下的情境，都應能留下紀錄。

建議紀錄內容：

```txt
store_id
request_id
request_hash 或 cache_key
google_api
category
radius
status
api_called
estimated_cost_tier
error_message
created_at
```

狀態判斷建議：

- cache hit：不呼叫 Google API，可記錄 `status = skipped_cache` 或僅在 usage log 記錄。
- Google API 成功：`api_called = true`，`status = success`。
- Google API 失敗：`api_called = true`，`status = failed`，並記錄錯誤。
- quota 擋下：`api_called = false`，`status = blocked_quota`。
- API key 未設定或 API disabled：`api_called = false`，`status = blocked_config`。
- timeout：`api_called = true`，`status = timeout`。
- rate limit：`api_called = true`，`status = rate_limited`。

目前 migration 已有 `nearby_google_api_usage_logs`，但尚未直接包含 `api_called`、`estimated_cost_tier`、`error_message`。

## 10. 環境變數規劃

V1.1 僅規劃，不新增或修改 Vercel env。

| 環境變數 | 用途 | 建議預設 | 是否本次建立 |
|---|---|---|---|
| `GOOGLE_MAPS_SERVER_KEY` | server-side Google API Key | 不可寫入文件真實值 | 否 |
| `GOOGLE_API_ENABLED` | Google API 總開關 | `false` | 否 |
| `GOOGLE_MOCK_MODE` | mock / 測試模式 | `true` 或依環境設定 | 否 |
| `GOOGLE_SYSTEM_DAILY_QUOTA` | 系統每日 Google API 呼叫上限 | `50` 或 `100` | 否 |
| `GOOGLE_SYSTEM_MONTHLY_QUOTA` | 系統每月 Google API 呼叫上限 | `1000` 或 `3000` | 否 |
| `GOOGLE_CACHE_TTL_HOURS` | cache TTL 小時數 | `24` | 否 |
| `GOOGLE_REQUEST_TIMEOUT_MS` | Google API request timeout | `8000` | 否 |
| `GOOGLE_MAX_RESULTS_PER_CATEGORY` | 每分類最多回傳筆數 | `10` | 否 |

`.env.example` 未來可放 placeholder，但不得放真實 key。V1.1 不修改 `.env.example`。

## 11. Google Console / Billing 設定檢查

Google Cloud Console 需人工確認：

- API Key 已限制可用 API。
- Places API 已啟用。
- Places API (New) 已啟用。
- Geocoding API 已啟用。
- Billing 已設定 budget。
- Monitoring / alert 已設定。
- API quota 已設定合理上限。

這些設定不取代後端控管。後端仍需有：

- 店家 quota。
- 系統 quota。
- cache-first 流程。
- Supabase usage log。
- Admin Dashboard 監控。

## 12. GPTs / 前端回傳規劃

GPTs / 前端不得取得 Google API Key，也不得直接呼叫 Google API。

後端回傳給 GPTs / 前端的內容應包含：

- 是否 cache hit。
- 是否實際呼叫 Google API。
- 今日店家剩餘查詢次數。
- 本月店家剩餘查詢次數。
- quota exceeded 時的友善錯誤訊息。
- 整理後的周邊機能結果。

後端不應回傳：

- Google API Key。
- Google 原始完整 response。
- Supabase service role key。
- 完整內部 log。
- 完整未遮罩查詢地址。

## 13. 與 V1.0 migration 的對照

目前 V1.0 migration 已支援：

- 店家 nearby 設定：`nearby_store_settings`
- 查詢紀錄：`nearby_usage_logs`
- cache 儲存：`nearby_cache`
- Google API 使用紀錄：`nearby_google_api_usage_logs`
- GPTs 生成輸出紀錄：`nearby_generated_outputs`
- Admin Dashboard 用量 view：
  - `nearby_store_usage_summary`
  - `nearby_store_quota_status`
  - `nearby_system_usage_summary`

目前可能需要補強：

- `request_hash` 欄位或明確定義 `cache_key` 即 request hash。
- `api_called` 欄位。
- `estimated_cost_tier` 欄位。
- `error_message` 欄位。
- `nearby_google_api_usage_logs` 是否需要記錄 quota blocked 但未呼叫 API 的事件。
- cache TTL 是否只靠 `nearby_cache.expires_at`，或需要後端額外策略。

本文件只做規劃，不修改 migration。

## 14. 下一步判斷

依目前 V1.0 migration 對照結果，建議下一步為：

```txt
V1.1.1 Migration SQL 補強 usage limit / request_hash / api_called 欄位
```

原因：

- 目前 migration 已有 cache 與 usage log 基礎。
- 但後端成本控管若要精準區分 cache hit、Google API 實際呼叫、quota blocked、成本級別與錯誤訊息，仍建議補強 log 欄位。
- V1.1.1 應只規劃或草擬 SQL 補強，不應直接執行 migration。

若 V1.1.1 補強完成並通過預檢，後續可進入：

```txt
V1.2 店家認證與查詢 API
```

## V1.1 執行結果確認

- 實際新增檔案：
  - `docs/google-api-backend-usage-control-plan.md`
- 實際修改檔案：無
- 是否修改 migration SQL：否
- 是否呼叫 Google API：否
- 是否連線 Supabase：否
- 是否修改現有 API：否
- 是否修改 Vercel 環境變數：否
- 是否寫入 API Key：否
- 是否新增 migration / SQL 檔案：否
- 是否部署：否
- 是否 commit：否

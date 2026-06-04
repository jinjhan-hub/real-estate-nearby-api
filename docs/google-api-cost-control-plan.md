# V0.4 Google API 成本與安全規劃文件

建立日期：2026-06-04

## 1. 本階段規劃範圍

V0.4 只規劃 Google API 使用方式、成本控管、安全邊界、cache / quota / logs 策略，以及後續 V1.x 實作切分。

本階段只新增本 Markdown 文件：

```txt
docs/google-api-cost-control-plan.md
```

本階段不做以下事項：

- 不連接 Google API。
- 不讀取或新增 Google API key。
- 不修改 Vercel env。
- 不修改 API 行為。
- 不連接 Supabase。
- 不建立 Supabase table / view / policy / trigger。
- 不新增 migration。
- 不新增 SQL 檔。
- 不部署。
- 不 commit。
- 不 push。

## 2. Google API 使用目標

新版周邊機能查詢第一版只規劃使用：

```txt
Google Geocoding API
Google Places API
```

用途：

- Geocoding API：將使用者輸入地址轉換成 `lat` / `lng`。
- Places API：依據 `lat` / `lng`、半徑與分類查詢周邊設施。

第一版不規劃使用：

- Overpass
- Directions API
- Distance Matrix API
- Street View API
- Maps JavaScript API
- Place Photos
- Place Reviews
- Place Details，除非後續 V1.x 明確需要

## 3. 周邊分類與 Google Places Type 對應規劃

第一版 GPTs 周邊分類：

```txt
park：公園
school：學校
shopping：購物 / 商圈
transport：交通
medical：醫療
```

| 系統分類 | 中文顯示 | Google Places type 候選 | 備註 |
|---|---|---|---|
| `park` | 公園 | `park` | 第一版可先使用單一 type |
| `school` | 學校 | `school` | 第一版可先使用單一 type |
| `shopping` | 購物 / 商圈 | `supermarket`, `convenience_store`, `shopping_mall`, `department_store` | 多 type 會增加 Places API 呼叫次數，需搭配 quota 與 cache |
| `transport` | 交通 | `train_station`, `bus_station`, `transit_station` | 可先限制為 1-2 個 type，避免成本膨脹 |
| `medical` | 醫療 | `hospital`, `doctor`, `pharmacy` | 多 type 會增加成本，建議第一版控制數量 |

設計原則：

- 第一版每個分類應盡量控制 Google type 數量。
- `shopping` 與 `medical` 類別最容易擴張呼叫量，需特別控管。
- 若一個分類對應多個 Google type，應明確記錄每個 type 的呼叫次數。
- Places API type 最終清單應在 V1.2 實作前再次確認。

## 4. API 呼叫流程規劃

建議第一版流程：

1. 使用者向 GPTs 輸入地址。
2. GPTs 呼叫店家認證 API。
3. API 標準化地址。
4. API 檢查店家功能與查詢 quota。
5. API 檢查 cache。
6. cache hit：回傳 cache 結果，不呼叫 Google API。
7. cache miss：
   - 呼叫 Geocoding API 取得 `lat` / `lng`。
   - 依分類呼叫 Places API。
   - 寫入 `nearby_cache`。
   - 寫入 `nearby_google_api_usage_logs`。
   - 寫入 `nearby_usage_logs`。
8. 回傳結果給 GPTs。

補充原則：

- Geocoding 結果也應盡量 cache，避免同地址重複 geocoding。
- 第一版可先將 geocoding cache 併入 `nearby_cache` 設計；若後續需求變複雜，再獨立規劃 `nearby_geocode_cache`。
- 每次實際呼叫 Google API 都應寫入 `nearby_google_api_usage_logs`。
- cache hit 仍應寫入 `nearby_usage_logs`，但不應增加 Google API 實際呼叫次數。

## 5. Field Mask / 回傳欄位控管

Places API 回傳欄位應盡量精簡，只取 GPTs 產出周邊摘要需要的資訊。

第一版建議保留欄位：

```txt
place id
display name
formatted address 或 vicinity
location
primary type / types
rating（可選）
user rating count（可選）
business status（可選）
```

第一版不建議取得：

- photos
- reviews
- opening hours
- phone number
- website
- full Place Details
- 過多與輸出無關的商業資訊

設計原則：

- 不取得不必要欄位。
- 不保存 Google 原始完整 response。
- cache 中保存整理後的必要結果。
- V1.2 實作前需確認 Places API New 的 field mask 與 SKU 對應。

## 6. 成本風險來源

主要成本風險：

1. 同地址重複查詢但沒有 cache。
2. 每個分類對應太多 Google type。
3. 每次查詢都重新 geocoding。
4. 取得過多 Places 欄位。
5. 使用 Place Details。
6. 使用 Photos / Reviews。
7. 沒有每日 / 每月 Google API quota。
8. 沒有店家層級 quota。
9. debug / test 期間誤打真實 Google API。
10. GPTs 錯誤重試造成重複請求。
11. 地址標準化不穩定導致 cache miss。

## 7. 成本控管策略

### 系統層級

- 設定系統每日 Google API 呼叫上限。
- 設定系統每月 Google API 呼叫上限。
- Admin Dashboard 顯示今日 / 本月 Google API 呼叫次數與剩餘額度。
- 達到系統上限時，阻擋外部 Google API 呼叫並回傳明確錯誤。

### 店家層級

- 使用 `nearby_store_settings.google_daily_quota`。
- 使用 `nearby_store_settings.google_monthly_quota`。
- 每間店限制每日 / 每月 Google API 使用量。
- 每間店也保留一般查詢 quota：
  - `daily_quota`
  - `monthly_quota`

### cache 層級

- 同地址、同半徑、同分類優先讀 cache。
- cache hit 不呼叫 Google API。
- cache TTL 第一版建議 30 天。
- cache key 建議包含：
  - normalized address
  - lat/lng rounded
  - radius
  - category
  - Google type 或 type group

### 測試 / 開發層級

- 可規劃 `GOOGLE_API_ENABLED=false`。
- 可規劃 mock mode。
- 測試模式不應誤打真實 Google API。
- 測試 logs 可用 `mode = test` 標示，避免與正式用量混淆。

## 8. 建議環境變數規劃

以下僅為規劃，不新增、不修改任何 Vercel env。

| 環境變數 | 用途 | 是否敏感 | 第一版建議 |
|---|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Google API key | 是 | 只存在 Vercel server-side env，不回傳前端或 GPTs |
| `GOOGLE_API_ENABLED` | 總開關 | 否 | 預設可規劃為 `false`，實作前再啟用 |
| `GOOGLE_GEOCODING_ENABLED` | Geocoding API 開關 | 否 | 可獨立控制 |
| `GOOGLE_PLACES_ENABLED` | Places API 開關 | 否 | 可獨立控制 |
| `GOOGLE_SYSTEM_DAILY_QUOTA` | 系統每日 Google API 上限 | 否 | Admin Dashboard 顯示剩餘額度 |
| `GOOGLE_SYSTEM_MONTHLY_QUOTA` | 系統每月 Google API 上限 | 否 | Admin Dashboard 顯示剩餘額度 |
| `GOOGLE_CACHE_TTL_DAYS` | cache 保存天數 | 否 | 第一版建議 30 |
| `GOOGLE_REQUEST_TIMEOUT_MS` | Google API timeout | 否 | 避免請求卡住 |
| `GOOGLE_MAX_RESULTS_PER_CATEGORY` | 每分類最多回傳結果 | 否 | 控制輸出與成本 |
| `GOOGLE_MOCK_MODE` | mock 模式 | 否 | 測試時避免真實 API 呼叫 |

安全原則：

- API key 只能存在 Vercel server-side env。
- API key 不可回傳 GPTs。
- API key 不可輸出到前端。
- API key 不可 commit 到 repo。
- `GOOGLE_API_ENABLED=false` 時，API 不應發出任何 Google API 呼叫。

## 9. Google API usage log 規劃

V0.2 已規劃 `nearby_google_api_usage_logs`，建議欄位：

```txt
store_id
request_id
google_api
category
radius
cache_key
status
cost_unit
created_at
```

紀錄原則：

- Geocoding API 呼叫需記錄。
- Places API 呼叫需記錄。
- cache hit 不應被計為實際 Google API 呼叫。
- 若 Google API 呼叫失敗，仍應記錄 `status` 與 error code。
- 第一版 `cost_unit` 可先規劃為 `1`，後續再依 SKU 精算。

未來可擴充欄位：

- `sku_name`
- `estimated_cost`
- `response_status`
- `mode`

## 10. 地址與 cache key 規劃

地址處理原則：

- 使用者輸入地址後，API 應先標準化。
- Admin UI 第一版不顯示完整地址。
- usage logs 可分為：
  - `query_address_normalized`
  - `query_address_masked`
- cache key 不應直接使用未處理的完整地址。
- lat/lng 建議 round 到固定精度，避免微小差異造成 cache miss。

cache key 建議組成：

```txt
normalized address
lat/lng rounded
radius
category
Google type 或 type group
```

V1.2 / V1.3 實作前需確認：

- 是否建立獨立 `nearby_geocode_cache`。
- 是否將 geocoding cache 併入 `nearby_cache`。
- lat/lng round 精度。
- cache key hash 方式。

## 11. 錯誤處理與 fallback

需規劃處理情境：

- Google API disabled
- API key missing
- system quota exceeded
- store quota exceeded
- Geocoding 找不到地址
- Places 查無結果
- Google API timeout
- Google API rate limit
- Google API billing / permission error
- cache read/write error

錯誤處理原則：

- 不回傳 API key。
- 不把內部錯誤完整暴露給 GPTs。
- 回傳 GPTs 可理解的錯誤代碼與簡短訊息。
- 錯誤應寫入 logs。
- 第一版不 fallback 到 Overpass。
- cache 錯誤時是否允許繼續呼叫 Google API，需在 V1.2 / V1.3 實作前決定。

建議錯誤代碼：

```txt
GOOGLE_API_DISABLED
GOOGLE_API_KEY_MISSING
GOOGLE_SYSTEM_QUOTA_EXCEEDED
STORE_GOOGLE_QUOTA_EXCEEDED
GEOCODING_NOT_FOUND
PLACES_NO_RESULTS
GOOGLE_API_TIMEOUT
GOOGLE_API_RATE_LIMIT
GOOGLE_API_BILLING_ERROR
CACHE_ERROR
```

## 12. GPTs 回傳格式與成本提示

GPTs 回傳原則：

- 每分類最多回傳 3-5 筆。
- 不回傳冗長 JSON。
- 不回傳 Google 原始 response。
- 可以告知 GPTs 結果來源是 `cache` 或 `google`。
- 可以告知 GPTs 本次是否使用 cache。
- 可以告知 GPTs 店家今日 / 本月剩餘查詢次數。

建議回傳摘要欄位：

```txt
success
requestId
storeId
addressMasked
radius
categories
resultSource
cacheHit
remainingDailyQuota
remainingMonthlyQuota
facilities
summaryText
```

不建議回傳：

- Google API key
- Google 原始 response
- 完整內部 logs
- 完整地址查詢歷史
- 未遮罩的敏感資訊

## 13. Admin Dashboard 成本顯示規劃

承接 V0.3，Admin Dashboard 應顯示 Google API 成本控管相關欄位：

- 今日 Google API 實際呼叫次數
- 本月 Google API 實際呼叫次數
- 今日系統 Google API 剩餘額度
- 本月系統 Google API 剩餘額度
- 每間店今日 Google API 呼叫次數
- 每間店本月 Google API 呼叫次數
- 每間店 cache hit 次數
- 每間店 Google quota 剩餘
- 最近 Google API 錯誤摘要

第一版 Admin Dashboard 不顯示完整查詢地址。

## 14. V1.x 實作切分

- V1.1：店家認證 API 開始查 Supabase `stores` 與 `nearby_store_settings`。
- V1.2：周邊查詢 API 開始接 Google Geocoding / Places。
- V1.3：加入 Supabase cache。
- V1.4：加入 Google API 額度控管。
- V1.6：Admin Dashboard API。
- V1.7：Admin UI。

V0.4 不實作任何功能，只提供後續實作規劃。

## 15. 不屬於 V0.4 範圍

- 不連接 Google API。
- 不新增 Google API key。
- 不修改 Vercel env。
- 不修改 API。
- 不新增 Supabase table。
- 不修改 Supabase table。
- 不新增 migration。
- 不新增 SQL 檔。
- 不部署。
- 不 commit。
- 不 push。

## 16. 進入 V1.0 前檢查清單

V0.x 文件階段結束後，進入 V1.0 前應確認：

- V0.1 API 盤點文件已完成。
- V0.2 Supabase schema 規劃已完成。
- V0.3 Admin Dashboard 規劃已完成。
- V0.4 Google API 成本控管規劃已完成。
- 已確認 Google API 成本風險。
- 已確認 Supabase schema 仍可建立於既有 project。
- 已確認是否需要 staging / test table。
- 已確認 Vercel env 管理方式。

## V0.4 執行結果確認

- 實際新增檔案：
  - `docs/google-api-cost-control-plan.md`
- 是否修改既有檔案：否
- 是否刪除檔案：否
- 是否接觸 Google API：否
- 是否接觸 Supabase：否
- 是否修改 Vercel 環境變數：否
- 是否建立資料表 / view / policy / trigger：否
- 是否新增 migration / SQL 檔：否
- 是否修改現有 API 行為：否
- 是否部署：否
- 是否 commit：否
- 是否 push：否

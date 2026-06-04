# V0.2 Supabase Schema 規劃文件

規劃日期：2026-06-04

## 1. 本階段規劃範圍

- 本階段只規劃 schema，不建立任何資料表。
- 本階段不連線 Supabase。
- 本階段不修改任何 API。
- 本階段不修改任何既有 Supabase table。
- 本階段只新增 Markdown 規劃文件。

本文件用來規劃「房地產周邊機能查詢 GPTs / real-estate-nearby-api」後續需要的 Supabase table、view、index、policy、quota 與資料流。所有內容皆為設計草案，不是可執行 migration。

## 2. 既有資料表與保留原則

目前 public schema 已知包含：

- `stores`
- `store_users`
- `land_tax_error_logs`
- `land_tax_temp_pdf_files`
- `land_tax_usage_logs`
- `session_copy_results`
- `session_image_packages`
- `session_logs`
- `session_material_status`
- `session_property_data`
- `sessions`
- `tax_price_index_import_logs`
- `tax_price_indexes`
- `tax_price_indexes_staging`

以下既有稅務相關資料表應維持不動：

- `land_tax_error_logs`
- `land_tax_temp_pdf_files`
- `land_tax_usage_logs`
- `tax_price_index_import_logs`
- `tax_price_indexes`
- `tax_price_indexes_staging`

`stores` 可作為店家主檔來源，但 V0.2 不建議修改 `stores`。若未來要強化 `stores.access_code` 安全性，可另外規劃 `access_code_hash`，但不在 V0.2 實作。

目前已知 `stores` 欄位：

- `id`
- `store_id`
- `store_name`
- `access_code`
- `active`
- `start_at`
- `expires_at`
- `features`
- `brokerage_name`
- `broker_name`
- `broker_license_no`
- `created_at`
- `updated_at`

## 3. 新增資料表規劃總覽

所有新版周邊機能相關 table / view 建議使用 `nearby_` 前綴，避免與既有稅務、session、店家主檔資料混淆。

| 資料表 | 用途 | 寫入時機 | 主要查詢場景 | 是否直接關聯 `stores` |
|---|---|---|---|---|
| `nearby_store_settings` | 每間店的周邊機能功能開關、額度、半徑與分類設定 | Admin 設定或初始化店家 nearby 功能時 | 認證後檢查功能啟用、quota、允許半徑與分類 | 是，透過 `store_id` 對應 `stores.store_id` |
| `nearby_usage_logs` | 每次 GPTs 查詢請求紀錄 | 每次查詢流程結束時 | 店家每日 / 每月用量、cache hit、失敗原因、quota blocking | 是，透過 `store_id` 對應 `stores.store_id` |
| `nearby_cache` | 同地址、同座標、同半徑、同分類的周邊查詢快取 | cache miss 且成功取得外部結果後 | 避免重複呼叫 Google API、讀取未過期快取 | 否，cache 可跨店共用 |
| `nearby_google_api_usage_logs` | Google API 呼叫次數與用途紀錄 | 每次實際呼叫或因 cache 略過 Google API 時 | Google API 成本、每日 / 每月用量、系統監控 | 是，透過 `store_id` 對應 `stores.store_id` |
| `nearby_generated_outputs` | GPTs 產出的周邊結果或文案紀錄 | GPTs 產生可回放輸出時 | 歷史查詢、Admin 檢視、內容稽核 | 是，透過 `store_id` 對應 `stores.store_id` |

## 4. `nearby_store_settings` 規劃

用途：管理每間店是否啟用周邊機能查詢，以及每日 / 每月查詢額度、Google API 額度、允許半徑與允許分類。

建議欄位：

| 欄位 | 用途 |
|---|---|
| `id` | 主鍵 |
| `store_id` | 對應 `stores.store_id` |
| `nearby_enabled` | 是否啟用周邊機能查詢 |
| `daily_quota` | 每日一般查詢額度 |
| `monthly_quota` | 每月一般查詢額度 |
| `allowed_radii` | 允許使用的半徑清單 |
| `default_radius` | 預設半徑 |
| `allowed_categories` | 允許查詢的分類清單 |
| `google_daily_quota` | 每日 Google API 呼叫額度 |
| `google_monthly_quota` | 每月 Google API 呼叫額度 |
| `created_at` | 建立時間 |
| `updated_at` | 更新時間 |

設計備註：

- `store_id` 建議對應 `stores.store_id`。
- `default_radius` 第一版建議固定為 `1000`。
- `allowed_radii` 建議預留 `500`、`1000`、`1500`。
- `allowed_categories` 建議預留：
  - `park`
  - `school`
  - `shopping`
  - `transport`
  - `medical`
- `daily_quota` / `monthly_quota` 用來控管一般查詢次數。
- `google_daily_quota` / `google_monthly_quota` 用來控管實際 Google API 消耗。
- Admin UI 不應直接改 Supabase，建議透過 Vercel Admin API 進行設定。

Markdown 草案，不建立 SQL：

```md
nearby_store_settings
- id
- store_id
- nearby_enabled
- daily_quota
- monthly_quota
- allowed_radii
- default_radius
- allowed_categories
- google_daily_quota
- google_monthly_quota
- created_at
- updated_at
```

## 5. `nearby_usage_logs` 規劃

用途：記錄每次周邊機能查詢請求，用於 quota、稽核、店家用量統計與錯誤追蹤。

建議欄位：

| 欄位 | 用途 |
|---|---|
| `id` | 主鍵 |
| `store_id` | 對應店家 |
| `request_id` | 單次請求識別碼 |
| `query_address_normalized` | 標準化後地址，用於 cache key 與比對 |
| `query_address_masked` | 遮罩後地址，用於 Admin UI 顯示 |
| `lat` | geocoding 後緯度 |
| `lng` | geocoding 後經度 |
| `radius` | 查詢半徑 |
| `categories` | 查詢分類清單 |
| `result_source` | 結果來源 |
| `cache_hit` | 是否命中 cache |
| `cache_key` | 對應 cache key |
| `facility_count_total` | 回傳設施總數 |
| `status` | 查詢狀態 |
| `error_code` | 錯誤代碼 |
| `created_at` | 建立時間 |

設計備註：

- 每次查詢都應寫入一筆 usage log。
- `query_address_normalized` 可用於 cache key 組成。
- `query_address_masked` 可提供 Admin UI 顯示，避免直接暴露完整地址。
- `result_source` 建議值：
  - `cache`
  - `google`
  - `mixed`
  - `error`
- `status` 建議值：
  - `success`
  - `failed`
  - `blocked_quota`
  - `blocked_auth`
- 可用於統計每日 / 每月店家查詢次數。

Markdown 草案，不建立 SQL：

```md
nearby_usage_logs
- id
- store_id
- request_id
- query_address_normalized
- query_address_masked
- lat
- lng
- radius
- categories
- result_source
- cache_hit
- cache_key
- facility_count_total
- status
- error_code
- created_at
```

## 6. `nearby_cache` 規劃

用途：快取同地址、同座標、同半徑、同分類的周邊查詢結果，降低重複呼叫 Google API 的成本。

建議欄位：

| 欄位 | 用途 |
|---|---|
| `id` | 主鍵 |
| `cache_key` | 快取唯一 key |
| `query_address_normalized` | 標準化後地址 |
| `lat` | 緯度 |
| `lng` | 經度 |
| `radius` | 查詢半徑 |
| `category` | 單一分類 |
| `google_place_type` | 對應 Google Places type |
| `result_json` | 快取結果內容 |
| `result_count` | 結果數量 |
| `source` | 結果來源 |
| `expires_at` | 快取到期時間 |
| `created_at` | 建立時間 |
| `updated_at` | 更新時間 |

設計備註：

- `cache_key` 建議由以下內容組成：
  - normalized address
  - lat/lng rounded
  - radius
  - category
- `category` 建議對應：
  - `park`
  - `school`
  - `shopping`
  - `transport`
  - `medical`
- `result_json` 建議保存整理後的 Google Places 結果，不直接保存完整原始 response。
- 第一版 cache TTL 可先規劃為 30 天。
- `expires_at` 用於判斷 cache 是否仍有效。
- cache hit 時不應增加實際 Google API 呼叫次數，但仍應寫入 `nearby_usage_logs`。

Markdown 草案，不建立 SQL：

```md
nearby_cache
- id
- cache_key
- query_address_normalized
- lat
- lng
- radius
- category
- google_place_type
- result_json
- result_count
- source
- expires_at
- created_at
- updated_at
```

## 7. `nearby_google_api_usage_logs` 規劃

用途：記錄 Google API 使用狀況，用於成本估算、額度控管與 Admin UI 監控。

建議欄位：

| 欄位 | 用途 |
|---|---|
| `id` | 主鍵 |
| `store_id` | 對應店家 |
| `request_id` | 單次請求識別碼 |
| `google_api` | 使用的 Google API 類型 |
| `category` | 查詢分類 |
| `radius` | 查詢半徑 |
| `cache_key` | 對應 cache key |
| `status` | 呼叫狀態 |
| `cost_unit` | 成本計算單位 |
| `created_at` | 建立時間 |

設計備註：

- 每次實際呼叫 Google API 都應寫入。
- cache hit 可不寫入，或以 `status = skipped_cache` 寫入，用來清楚區分節省下來的 API 呼叫。
- `google_api` 建議值：
  - `geocoding`
  - `places_nearby_search`
  - `places_text_search`
  - `places_details`
- 第一版建議只啟用：
  - `geocoding`
  - `places_nearby_search`
- `cost_unit` 第一版可先規劃為 `1`，後續再依 Google 計費級距調整。

Markdown 草案，不建立 SQL：

```md
nearby_google_api_usage_logs
- id
- store_id
- request_id
- google_api
- category
- radius
- cache_key
- status
- cost_unit
- created_at
```

## 8. `nearby_generated_outputs` 規劃

用途：記錄 GPTs 產出的周邊機能結果、貼文草稿、圖片卡文字或短影音腳本，方便回放、稽核與 Admin UI 查詢。

建議欄位：

| 欄位 | 用途 |
|---|---|
| `id` | 主鍵 |
| `store_id` | 對應店家 |
| `request_id` | 單次請求識別碼 |
| `output_type` | 輸出類型 |
| `style_key` | 風格識別 |
| `content_json` | 結構化內容 |
| `content_text` | 純文字內容 |
| `created_at` | 建立時間 |

設計備註：

- `output_type` 建議值：
  - `facility_list`
  - `fb_post`
  - `image_card_copy`
  - `short_video_script`
- 第一版 API 不一定要立即寫入這張表，可先保留作為後續內容回放與 Admin UI 查詢基礎。

Markdown 草案，不建立 SQL：

```md
nearby_generated_outputs
- id
- store_id
- request_id
- output_type
- style_key
- content_json
- content_text
- created_at
```

## 9. 規劃 Views

以下 views 僅為規劃，不建立 view。

### `nearby_store_usage_summary`

用途：彙整每間店的查詢用量、cache 命中與 Google API 使用量。

規劃欄位：

- `store_id`
- `store_name`
- `today_usage_count`
- `month_usage_count`
- `total_usage_count`
- `today_cache_count`
- `month_cache_count`
- `total_cache_count`
- `today_google_api_count`
- `month_google_api_count`
- `total_google_api_count`
- `last_used_at`

### `nearby_store_quota_status`

用途：提供每間店目前 quota 狀態，供認證 API 或 Admin UI 顯示。

規劃欄位：

- `store_id`
- `store_name`
- `nearby_enabled`
- `daily_quota`
- `monthly_quota`
- `today_usage_count`
- `month_usage_count`
- `today_remaining`
- `month_remaining`
- `google_daily_quota`
- `google_monthly_quota`
- `today_google_api_count`
- `month_google_api_count`
- `today_google_remaining`
- `month_google_remaining`

### `nearby_system_usage_summary`

用途：提供系統層級用量總覽，供 Admin UI dashboard 使用。

規劃欄位：

- `today_total_queries`
- `month_total_queries`
- `today_google_api_calls`
- `month_google_api_calls`
- `today_cache_hits`
- `month_cache_hits`
- `system_google_daily_quota`
- `system_google_monthly_quota`
- `system_google_daily_remaining`
- `system_google_monthly_remaining`

## 10. Index 規劃

以下 index 僅為規劃，不建立 index。

- `nearby_store_settings(store_id)`
- `nearby_usage_logs(store_id, created_at)`
- `nearby_usage_logs(request_id)`
- `nearby_usage_logs(cache_key)`
- `nearby_cache(cache_key)`
- `nearby_cache(query_address_normalized, radius, category)`
- `nearby_cache(expires_at)`
- `nearby_google_api_usage_logs(store_id, created_at)`
- `nearby_google_api_usage_logs(request_id)`
- `nearby_generated_outputs(store_id, created_at)`
- `nearby_generated_outputs(request_id)`

## 11. RLS / 權限規劃

本階段不建立任何 policy。

規劃原則：

- Vercel API 使用 Supabase service role key，且只在 server-side 保存。
- Admin UI 不應直接連 Supabase，應透過 Vercel Admin API。
- GPTs 不應直接連 Supabase。
- 不應向 GPTs 或前端暴露 Supabase service role key。
- 未來若需要 client-side direct read，必須另行規劃 RLS policy。
- 目前 V0.2 只規劃權限方向，不建立 policy、不修改 Supabase。

## 12. Admin UI 可讀取指標規劃

Admin UI 建議不要直接讀 Supabase，而是透過 Vercel Admin API 取得彙整後資料。

建議 Admin UI 顯示：

- 今日查詢次數
- 本月查詢次數
- 今日 Google API 呼叫次數
- 本月 Google API 呼叫次數
- 今日剩餘 Google API 額度
- 本月剩餘 Google API 額度
- 每間店今日查詢次數
- 每間店本月查詢次數
- 每間店今日剩餘查詢次數
- 每間店本月剩餘查詢次數
- 每間店 cache 命中次數
- 每間店 Google API 使用次數
- 每間店最後查詢時間

## 13. 周邊查詢資料流規劃

建議新版查詢流程：

1. GPTs 呼叫店家認證 API。
2. API 查詢 `stores`。
3. API 查詢 `nearby_store_settings`。
4. API 計算今日 / 本月剩餘查詢次數。
5. 使用者輸入地址。
6. API 檢查店家 nearby 是否啟用與 quota 是否足夠。
7. API 標準化地址。
8. API 檢查 cache。
9. cache hit：讀取 `nearby_cache`，寫入 `nearby_usage_logs`。
10. cache miss：呼叫 Google Geocoding / Places。
11. 寫入 `nearby_cache`。
12. 寫入 `nearby_google_api_usage_logs`。
13. 寫入 `nearby_usage_logs`。
14. 回傳結果給 GPTs。

## 14. 不屬於 V0.2 範圍

- 不新增資料表。
- 不新增 view。
- 不新增 index。
- 不新增 policy。
- 不新增 trigger。
- 不連 Supabase。
- 不連 Google API。
- 不修改 API。
- 不修改 Vercel env。
- 不部署。
- 不修改任何既有 Supabase table。

## 15. 下一階段 V0.3 規劃

V0.3 建議任務：

```txt
V0.3 Admin Dashboard 規劃文件
```

建議新增文件：

```txt
docs/admin-dashboard-plan.md
```

V0.3 建議仍先做文件規劃，不做 UI、不改 API。

## V0.2 執行結果確認

- 實際新增檔案：
  - `docs/supabase-nearby-schema-plan.md`
- 是否修改既有檔案：否
- 是否刪除檔案：否
- 是否接觸 Google API：否
- 是否接觸 Supabase：否
- 是否修改 Vercel 環境變數：否
- 是否建立資料表：否
- 是否修改現有 API 行為：否
- 是否新增 migration / SQL 檔：否

# V1.1.2 Migration SQL usage control 補強預檢

建立日期：2026-06-04

## 1. 檢查範圍

本次僅針對以下 migration SQL 草稿做靜態預檢：

```txt
supabase/migrations/001_create_nearby_schema.sql
```

本次未修改 migration SQL、未新增 migration / SQL 檔案、未連線 Supabase、未使用 Supabase CLI、未執行 migration、未呼叫 Google API。

## 2. V1.1.1 補強欄位檢查

### `nearby_usage_logs`

已確認包含：

```txt
request_hash
api_called
api_name
estimated_cost_tier
note
error_message
```

判斷：通過。

### `nearby_cache`

已確認包含：

```txt
request_hash
last_hit_at
hit_count
```

判斷：通過。

### `nearby_google_api_usage_logs`

已確認包含：

```txt
request_hash
api_called
estimated_cost_tier
error_message
note
```

`nearby_google_api_usage_logs` 未新增 `api_name`，並保留既有 `google_api` 作為 canonical API name。SQL 註解已標示：

```txt
nearby_google_api_usage_logs.google_api is the canonical API name field.
```

判斷：通過。

## 3. Index 檢查

### 24 小時同條件 / cache-first

已確認包含：

```txt
nearby_usage_logs(request_hash)
nearby_usage_logs(request_hash, created_at)
nearby_cache(request_hash)
nearby_cache(request_hash, expires_at)
```

判斷：通過。

### Google API hard limit

已確認包含：

```txt
nearby_google_api_usage_logs(api_called, created_at)
nearby_google_api_usage_logs(store_id, created_at)
nearby_google_api_usage_logs(status, created_at)
nearby_google_api_usage_logs(google_api, created_at)
```

判斷：通過。

### usage log 狀態查詢

已確認包含：

```txt
nearby_usage_logs(api_called, created_at)
nearby_usage_logs(status, created_at)
```

判斷：通過。

## 4. Allowed Values / Constraint 檢查

### `estimated_cost_tier`

已確認 `nearby_usage_logs` 與 `nearby_google_api_usage_logs` 皆允許：

```txt
free_cache
basic
standard
advanced
unknown
```

判斷：通過。

### `nearby_usage_logs.status`

已確認允許：

```txt
success
failed
blocked_quota
blocked_auth
blocked_config
```

判斷：通過。

### `nearby_google_api_usage_logs.status`

已確認允許：

```txt
success
failed
blocked_quota
blocked_config
timeout
rate_limited
skipped_cache
```

判斷：通過。

### `result_source`

已確認允許：

```txt
cache
google
mixed
error
```

判斷：通過。

### `category`

已確認允許：

```txt
park
school
shopping
transport
medical
```

判斷：通過。

## 5. View 補強檢查

### `nearby_store_usage_summary`

已確認可支援：

```txt
today_api_called_count
month_api_called_count
total_api_called_count
today_google_blocked_count
month_google_blocked_count
last_error_at
```

此 view 使用 `usage_agg` 與 `google_agg` 先彙總，再 join `stores`，未發現直接 join 明細 log 造成 fanout 的寫法。

判斷：通過。

### `nearby_store_quota_status`

已確認可支援：

```txt
today_google_api_count
month_google_api_count
today_google_remaining
month_google_remaining
```

此 view 使用 CTE 先彙總 usage 與 Google usage，再 join `stores` / `nearby_store_settings`，未發現 fanout 風險。

判斷：通過。

### `nearby_system_usage_summary`

已確認可支援：

```txt
today_api_called_count
month_api_called_count
today_blocked_quota_count
month_blocked_quota_count
today_cache_hit_count
month_cache_hit_count
```

此 view 使用 scalar aggregate CTE 與 `cross join`，未使用 `full join`，未發現 fanout 風險。

判斷：通過。

## 6. Google API Hard Limit 支援判斷

目前 SQL 可支援 API 實作查詢：

- 今日系統 Google API 實際呼叫次數。
- 本月系統 Google API 實際呼叫次數。
- 今日單店 Google API 實際呼叫次數。
- 本月單店 Google API 實際呼叫次數。
- `blocked_quota` 次數。
- `blocked_config` 次數。
- `timeout` / `rate_limited` 次數。

說明：

- 實際呼叫次數可透過 `nearby_google_api_usage_logs.api_called = true` 與 `created_at` 查詢。
- 店家維度可透過 `store_id, created_at` index 查詢。
- 系統維度可透過 `api_called, created_at` index 查詢。
- `blocked_config`、`timeout`、`rate_limited` 可透過 `status, created_at` index 查詢。
- 目前 view 已直接提供主要 dashboard 欄位；若未來 Admin Dashboard 要獨立顯示 `blocked_config`、`timeout`、`rate_limited` 欄位，可在下一版再補充 view 欄位。

判斷：可支援 V1.2 / V1.3 API 實作。

## 7. 24 小時同條件不重打支援判斷

目前 SQL 可支援 API 實作：

```txt
同一 request_hash 在 24 小時內若 cache 有效，優先使用 cache，不重新呼叫 Google API。
```

已確認相關欄位：

```txt
nearby_cache.request_hash
nearby_cache.expires_at
nearby_cache.last_hit_at
nearby_cache.hit_count
nearby_usage_logs.request_hash
nearby_usage_logs.created_at
```

已確認相關 index：

```txt
nearby_cache(request_hash)
nearby_cache(request_hash, expires_at)
nearby_usage_logs(request_hash)
nearby_usage_logs(request_hash, created_at)
```

說明：24 小時 TTL 判斷仍應由 API 層實作；目前 SQL 不需要 trigger 或 function 強制套用 TTL。

判斷：通過。

## 8. Table / View 名稱安全檢查

SQL 中僅建立以下 5 張 table：

```txt
nearby_store_settings
nearby_usage_logs
nearby_cache
nearby_google_api_usage_logs
nearby_generated_outputs
```

SQL 中僅建立以下 3 個 view：

```txt
nearby_store_usage_summary
nearby_store_quota_status
nearby_system_usage_summary
```

未發現以下禁止的舊版 table 名稱：

```txt
nearby_searches
nearby_places
nearby_search_results
nearby_cache_logs
```

判斷：通過。

## 9. 既有資料表安全檢查

未發現 SQL 對以下既有資料表執行 `alter`、`drop`、`truncate`、`delete`、`update` 或 `insert`：

```txt
land_tax_error_logs
land_tax_temp_pdf_files
land_tax_usage_logs
tax_price_index_import_logs
tax_price_indexes
tax_price_indexes_staging
stores
```

SQL 中的 view 會讀取 `stores`，但未修改 `stores`。

判斷：通過。

## 10. 敏感資料檢查

未發現 SQL 寫入：

- 真實 Google API Key。
- Supabase service role key。
- 真實地址。
- seed data。
- 客戶資料。

判斷：通過。

## 11. 風險等級

檢查結果：A

原因：

- V1.1.1 補強欄位、index、constraint 與 view 欄位已到位。
- table / view 名稱未偏離規劃。
- 未發現舊版禁止 table 名稱。
- 未發現直接 join 明細 log 造成 view fanout 的高風險寫法。
- 未發現敏感資料或 API Key。
- 未發現對既有非 nearby 資料表的寫入或破壞性操作。

注意：A 僅代表 SQL 草稿通過靜態預檢，可進入下一階段人工 review / 執行前確認，不代表已經或可以直接執行 Supabase migration。

## 12. 下一步建議

若維持 A，建議下一步：

```txt
V1.1.3 Supabase migration 執行前確認
```

若後續希望 Admin Dashboard 直接顯示 `blocked_config`、`timeout`、`rate_limited` 的獨立統計欄位，可另開補強任務調整 view，但目前不阻擋 V1.2 / V1.3 API 實作規劃。

## V1.1.2 執行結果確認

- 實際新增檔案：
  - `docs/migration-usage-control-precheck-v1.1.2.md`
- 實際修改檔案：無
- 是否修改 migration SQL：否
- 是否接觸 Supabase：否
- 是否執行 migration：否
- 是否修改現有 API：否
- 是否修改 Vercel 環境變數：否
- 是否接觸 Google API：否
- 是否寫入 API Key：否
- 是否新增 migration / SQL 檔案：否
- 是否部署：否
- 是否 commit：否
- 是否 push：否

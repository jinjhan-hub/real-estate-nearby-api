# V1.0.1 migration SQL 預檢報告

建立日期：2026-06-04

## 1. 檢查範圍

本次只檢查以下 migration SQL：

```txt
supabase/migrations/001_create_nearby_schema.sql
```

本次未連線 Supabase，未執行 Supabase CLI，未執行 migration，未建立任何真實資料表、view、policy 或 trigger。

## 2. Table 名稱檢查

SQL 目前建立的 table 名稱符合 V0.2 規劃：

```txt
nearby_store_settings
nearby_usage_logs
nearby_cache
nearby_google_api_usage_logs
nearby_generated_outputs
```

未發現以下舊版 / 不應使用的 table 名稱：

```txt
nearby_searches
nearby_places
nearby_search_results
nearby_cache_logs
```

檢查結果：通過。

## 3. View 名稱檢查

SQL 目前建立的 view 名稱符合 V0.2 規劃：

```txt
nearby_store_usage_summary
nearby_store_quota_status
nearby_system_usage_summary
```

檢查結果：通過。

## 4. 既有資料表安全檢查

未發現 SQL 對以下既有稅務資料表進行 `drop`、`alter`、`truncate`、`delete`、`insert` 或 `update`：

```txt
land_tax_error_logs
land_tax_temp_pdf_files
land_tax_usage_logs
tax_price_index_import_logs
tax_price_indexes
tax_price_indexes_staging
```

SQL view 有讀取 `stores`：

```txt
from stores s
```

這符合規劃中「view 可讀取 stores」的方向。未發現 `alter`、`drop`、`update`、`insert`、`delete` `stores`。

檢查結果：通過。

## 5. Extension 檢查

SQL 包含：

```sql
create extension if not exists "pgcrypto";
```

用途：提供 `gen_random_uuid()`。

注意事項：

- Supabase 通常支援 `pgcrypto`。
- 實際執行前仍建議人工確認目標 Supabase project 是否允許啟用 extension。
- 若 production project 已啟用，這行通常不會造成問題。

檢查結果：通過，實際執行前需人工確認環境。

## 6. 欄位與 V0.2 規劃對照

### `nearby_store_settings`

V0.2 必要欄位皆已包含：

```txt
store_id
nearby_enabled
daily_quota
monthly_quota
allowed_radii
default_radius
allowed_categories
google_daily_quota
google_monthly_quota
created_at
updated_at
```

另有 `id` 主鍵與必要 constraints。

### `nearby_usage_logs`

V0.2 必要欄位皆已包含：

```txt
store_id
request_id
query_address_normalized
query_address_masked
lat
lng
radius
categories
result_source
cache_hit
cache_key
facility_count_total
status
error_code
created_at
```

另有 `id` 主鍵與必要 constraints。

### `nearby_cache`

V0.2 必要欄位皆已包含：

```txt
cache_key
query_address_normalized
lat
lng
radius
category
google_place_type
result_json
result_count
source
expires_at
created_at
updated_at
```

另有 `id` 主鍵與必要 constraints。

### `nearby_google_api_usage_logs`

V0.2 必要欄位皆已包含：

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

另有 `id` 主鍵與必要 constraints。

### `nearby_generated_outputs`

V0.2 必要欄位皆已包含：

```txt
store_id
request_id
output_type
style_key
content_json
content_text
created_at
```

另有 `id` 主鍵與必要 constraints。

檢查結果：通過。

## 7. Index 檢查

SQL 目前包含 V0.2 規劃中的主要 index：

```txt
nearby_store_settings(store_id)
nearby_usage_logs(store_id, created_at)
nearby_usage_logs(request_id)
nearby_usage_logs(cache_key)
nearby_cache(cache_key)
nearby_cache(query_address_normalized, radius, category)
nearby_cache(expires_at)
nearby_google_api_usage_logs(store_id, created_at)
nearby_google_api_usage_logs(request_id)
nearby_generated_outputs(store_id, created_at)
nearby_generated_outputs(request_id)
```

檢查結果：通過。

## 8. Constraint 檢查

SQL 已包含以下 constraint 類型：

- quota 不可為負數。
- radius 必須為正數。
- `default_radius` 必須存在於 `allowed_radii`。
- `category` 限制為：
  - `park`
  - `school`
  - `shopping`
  - `transport`
  - `medical`
- `result_source` 限制為：
  - `cache`
  - `google`
  - `mixed`
  - `error`
  - `unknown`
- status 欄位有 allowed values。
- `nearby_usage_logs.request_id` 為 unique。
- `nearby_cache.cache_key` 為 unique。
- `nearby_store_settings.store_id` 為 unique。

注意事項：

- `result_source` 多了 `unknown`，不在 V0.2 原始列出的 `cache`、`google`、`mixed`、`error` 四個值內。這不是立即阻斷項，但建議人工確認是否保留。
- `nearby_google_api_usage_logs.status` 包含 `skipped_cache`、`disabled`，符合成本控管文件方向，但也建議人工確認是否納入最終 enum。

檢查結果：可接受，建議人工確認 enum 值。

## 9. Trigger 檢查

SQL 包含共用 updated_at trigger function：

```txt
set_nearby_updated_at()
```

SQL 目前套用 trigger 到：

```txt
nearby_store_settings
nearby_cache
```

這兩張表有 `updated_at` 欄位，因此套用合理。

SQL 中出現 `drop trigger if exists`，但只作用於 nearby table 的 trigger：

```txt
set_nearby_store_settings_updated_at on nearby_store_settings
set_nearby_cache_updated_at on nearby_cache
```

未發現 drop table、drop view、truncate、delete、insert seed data 等危險操作。

檢查結果：通過。

## 10. RLS / 權限檢查

未發現：

```txt
enable row level security
create policy
```

SQL 註解明確說明：

```txt
RLS is intentionally not enabled in V1.0.
RLS should be planned after the API permission model is confirmed.
```

這符合目前規劃：

- V1.0 migration 不啟用 RLS。
- Vercel API server-side 使用 service role key 的權限模型待後續確認。
- Admin UI 不直接連 Supabase。
- GPTs 不直接連 Supabase。

檢查結果：通過。

## 11. View 設計風險檢查

SQL view 有讀取 `stores`，這符合 Admin Dashboard 規劃方向。

需要人工確認的風險：

- `nearby_store_usage_summary` 同時 join `nearby_usage_logs` 與 `nearby_google_api_usage_logs`，若同一 store 有多筆 usage log 與多筆 Google API log，可能產生 join fanout，導致 count 被放大。
- `nearby_store_quota_status` 同樣同時 join usage logs 與 Google API logs，也可能有 count 放大風險。
- `nearby_system_usage_summary` 使用 `full join` 並以 `request_id` 關聯；若同一 request 有多筆 Google API log，usage count 可能重複。

建議：

- 實際執行前，先人工審核 view 聚合邏輯。
- 可考慮先用 subquery / CTE 各自彙總 usage 與 Google API logs，再 join store。

檢查結果：B，建議修正或人工確認後再執行。

## 12. 敏感資料檢查

未發現：

- 真實店家地址。
- 真實 API key。
- Supabase service role key。
- Google API key。
- seed data。

SQL 註解也明確寫出：

```txt
No seed data is included.
No real API keys or real addresses are included.
```

檢查結果：通過。

## 13. 預檢總結

結論：

```txt
B：建議修正 / 人工確認後再執行
```

理由：

- table 名稱符合 V0.2 規劃。
- view 名稱符合 V0.2 規劃。
- 未發現禁用舊表名。
- 未發現真實 API key、地址或 seed data。
- 未發現修改既有稅務資料表或 `stores` 的危險操作。
- RLS / policy 未啟用，符合目前權限規劃。
- 主要需人工確認的是 view 聚合邏輯可能有 join fanout，可能導致 dashboard count 放大。
- `result_source = unknown` 與 Google API status 額外 enum 值建議人工確認。

## 14. 建議下一步

若接受本次預檢結果，下一步建議：

```txt
V1.0.2：修正 migration SQL
```

建議修正重點：

- 調整 view 聚合邏輯，避免 join fanout。
- 確認 `result_source` 是否保留 `unknown`。
- 確認 Google API usage log status enum 是否保留 `skipped_cache`、`disabled`。
- 再次確認實際 Supabase project 是否已支援 `pgcrypto`。

## V1.0.1 執行結果確認

- 實際新增檔案：
  - `docs/migration-precheck-v1.0.1.md`
- 實際修改檔案：
  - 無
- 是否修改 migration SQL：否
- 是否接觸 Supabase：否
- 是否執行 migration：否
- 是否修改既有 API：否
- 是否修改 Vercel 環境變數：否
- 是否接觸 Google API：否
- 是否新增 migration / SQL 檔：否
- 是否部署：否
- 是否 commit：否
- 是否 push：否

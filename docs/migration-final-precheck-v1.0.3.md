# V1.0.3 migration SQL 最終預檢

檢查日期：2026-06-04

## 1. 檢查範圍

本次僅針對以下 SQL migration 草稿做靜態檢查：

```txt
supabase/migrations/001_create_nearby_schema.sql
```

本次未連線 Supabase、未執行 migration、未使用 Supabase CLI、未建立任何真實資料表或 view，也未修改 SQL migration。

## 2. V1.0.2 修正確認

V1.0.2 針對 view fanout 與 enum 風險的修正已完成靜態確認：

- `nearby_store_usage_summary` 已改用 `usage_agg` 與 `google_agg` 先彙總，再 join `stores`。
- `nearby_store_quota_status` 已改用 `usage_agg` 與 `google_agg` 先彙總，再 join `stores` 與 `nearby_store_settings`。
- `nearby_system_usage_summary` 已改用純量彙總 CTE，並以 `cross join` 合併結果。
- 三個 view 未再直接 join 原始 usage log 與 Google usage log，已降低多對多 fanout 造成數字膨脹的風險。
- `nearby_system_usage_summary` 未使用 `full join`。
- `last_used_at` 來源為 `max(nearby_usage_logs.created_at)`，符合 Admin Dashboard 第一版顯示最後使用時間需求。

## 3. Table 名稱檢查

SQL 中建立的 table 名稱符合 V0.2 規劃：

```txt
nearby_store_settings
nearby_usage_logs
nearby_cache
nearby_google_api_usage_logs
nearby_generated_outputs
```

未發現以下禁止使用的舊版 table 名稱：

```txt
nearby_searches
nearby_places
nearby_search_results
nearby_cache_logs
```

## 4. View 名稱檢查

SQL 中建立的 view 名稱符合 V0.2 / Admin Dashboard 規劃：

```txt
nearby_store_usage_summary
nearby_store_quota_status
nearby_system_usage_summary
```

## 5. 既有資料表安全性檢查

本次檢查未發現 SQL 對以下既有資料表執行 `alter`、`drop`、`truncate`、`delete`、`update` 或 `insert`：

```txt
land_tax_error_logs
land_tax_temp_pdf_files
land_tax_usage_logs
tax_price_index_import_logs
tax_price_indexes
tax_price_indexes_staging
stores
```

SQL 中的 view 會讀取 `stores` 作為店家清單來源，但未修改 `stores`。

## 6. Constraints / Enum 檢查

已確認 SQL 中的 enum / check constraint 值符合目前規劃。

`nearby_cache.category`：

```txt
park
school
shopping
transport
medical
```

`nearby_usage_logs.result_source`：

```txt
cache
google
mixed
error
```

`nearby_usage_logs.status`：

```txt
success
failed
blocked_quota
blocked_auth
blocked_config
```

`nearby_google_api_usage_logs.google_api`：

```txt
geocoding
places_nearby_search
places_text_search
places_details
```

`nearby_google_api_usage_logs.status`：

```txt
success
failed
blocked_quota
blocked_config
timeout
rate_limited
skipped_cache
```

`nearby_generated_outputs.output_type`：

```txt
facility_list
fb_post
image_card_copy
short_video_script
```

## 7. View Fanout 風險複檢

檢查結果：A

原因：

- usage log 與 Google usage log 已先於 CTE 中依 `store_id` 彙總。
- view 的主查詢只 join 彙總後結果，不直接 join 明細 log。
- `nearby_system_usage_summary` 以單列 aggregate CTE 搭配 `cross join` 組合系統總覽。
- 未發現 `full join`。

## 8. Admin Dashboard 使用性檢查

現有三個 view 可支援 Admin Dashboard 第一版主要欄位：

- 今日總查詢次數
- 本月總查詢次數
- 今日 Google API 實際呼叫次數
- 本月 Google API 實際呼叫次數
- 每間店今日使用次數
- 每間店本月使用次數
- 每間店今日剩餘次數
- 每間店本月剩餘次數
- 每間店 cache 次數
- 每間店 Google API 呼叫次數
- 每間店最後使用時間

SQL view 未輸出完整查詢地址；查詢地址保留在 log/cache table 欄位中，Admin Dashboard 第一版應避免直接顯示完整地址。

## 9. 敏感資料檢查

本次靜態檢查未發現：

- 真實客戶地址
- Google API Key
- Supabase service role key
- 其他 API Key
- seed data

SQL 註解也明確標示不包含 seed data、API keys 或真實地址。

## 10. 最終結果

檢查結果：A

判斷：V1.0.2 修正後，SQL migration 草稿已通過 V1.0.3 最終靜態預檢，可進入執行前確認階段。

建議下一步：

```txt
V1.0.4 Supabase migration 執行前確認
```

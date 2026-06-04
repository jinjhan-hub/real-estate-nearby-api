# V1.4.6.3-UPDATE｜enabled 測試店家資料建立結果紀錄更新

## 目的

記錄使用者已人工建立 `TEST_NEARBY_ENABLED` enabled 測試店家的結果，作為後續 V1.4.7 NOT_IMPLEMENTED 人工測試的前置依據。

本階段只記錄結果，不修改 API、不修改 Supabase、不執行 SQL、不部署。

## 前置背景

目前進度：

- V1.4.6 已確認 CH001 到 CH006 皆為 `nearby_enabled = false`
- V1.4.6.2-SQL 已建立 SQL 草稿文件
- V1.4.6.2-SQL-FIX 已依實際欄位修正 SQL 草稿
- 使用者已在 Supabase 後台人工建立 `TEST_NEARBY_ENABLED`
- 使用者未貼出 access_code

## enabled 測試店家建立結果

使用者回報的查詢結果如下：

- store_id：TEST_NEARBY_ENABLED
- store_name：周邊機能測試店
- nearby_enabled：true
- daily_quota：3
- monthly_quota：30
- today_usage_count：0
- month_usage_count：0
- today_remaining：3
- month_remaining：30
- google_daily_quota：0
- google_monthly_quota：0
- today_google_api_count：0
- month_google_api_count：0
- today_google_remaining：0
- month_google_remaining：0

## 判定

`TEST_NEARBY_ENABLED` 已符合 enabled / NOT_IMPLEMENTED 測試前置條件：

- enabled 測試店家已存在
- `nearby_enabled = true`
- quota 狀態可查
- daily quota 為低額測試值 3
- monthly quota 為低額測試值 30
- Google quota 為 0
- 尚未接 Google API
- 尚未產生 Google API 費用風險
- access_code 未寫入文件

可進入下一階段：

```txt
V1.4.7｜enabled 店家 nearby-facilities NOT_IMPLEMENTED 人工測試
```

## 安全確認

本階段確認：

- 未修改 api/nearby-facilities.js
- 未修改 api/verify-store-access.js
- 未執行 SQL
- 未修改 Supabase schema
- 未由 Codex 修改 Supabase 資料
- 未修改 CH001 到 CH006
- 未接 Google API
- 未呼叫 Google Geocoding API
- 未呼叫 Google Places API
- 未呼叫 Overpass
- 未寫 nearby_cache
- 未寫 usage logs
- 未修改 Vercel env
- 未寫入 API Key
- 未寫入 access_code
- 未新增 dependency
- 未部署

## 下一步建議

```txt
V1.4.7｜enabled 店家 nearby-facilities NOT_IMPLEMENTED 人工測試
```

下一階段測試重點：

- 使用 `TEST_NEARBY_ENABLED` 與有效 access_code 呼叫 `/api/nearby-facilities`
- 不貼出 access_code
- 確認 API 通過 disabled guard
- 確認在 provider 尚未實作時回傳 NOT_IMPLEMENTED 或等價保守結果
- 確認未呼叫 Google API
- 確認未呼叫 Overpass
- 確認未寫 nearby_cache
- 確認未寫 usage logs
- 確認 facilities = {}
- 確認 summary = []

## V1.4.6.3-UPDATE 執行結果確認

- 實際新增檔案：
  - `docs/nearby-facilities-enabled-store-setup-result-update-v1.4.6.3.md`
- 實際修改檔案：無
- 是否只新增 V1.4.6.3-UPDATE 結果紀錄文件：是
- 是否寫入 access_code：否
- 是否執行 SQL：否
- 是否修改 API 檔案：否
- 是否修改 Supabase schema 或資料：否
- 是否修改 CH001 到 CH006：否
- 是否接 Google API / Overpass：否
- 是否寫 cache / usage logs：否
- 是否部署：否
- 是否可進入 V1.4.7：是

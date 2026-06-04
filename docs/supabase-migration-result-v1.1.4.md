# V1.1.4 Supabase migration 人工執行結果紀錄

建立日期：2026-06-04

## 1. 本次執行範圍

- 本次由使用者人工在 Supabase SQL Editor 執行 migration。
- Codex 未連線 Supabase。
- Codex 未執行 migration。
- 本次未接 Google API。
- 本次未修改 API。
- 本次未修改 Vercel env。
- 本次未修改 migration SQL。
- 本次未新增 migration / SQL 檔。

## 2. 執行的 migration 檔案

使用者人工執行的 migration 檔案：

```txt
supabase/migrations/001_create_nearby_schema.sql
```

目前沒有回報錯誤訊息。

## 3. Table 建立結果

使用者回報已驗證成功建立以下 5 張 nearby table：

- `nearby_cache`
- `nearby_generated_outputs`
- `nearby_google_api_usage_logs`
- `nearby_store_settings`
- `nearby_usage_logs`

判斷：table 建立結果通過。

## 4. View 建立結果

使用者回報已驗證成功建立以下 3 個 nearby view：

- `nearby_store_quota_status`
- `nearby_store_usage_summary`
- `nearby_system_usage_summary`

判斷：view 建立結果通過。

## 5. 既有 stores 表確認

使用者回報已確認：

- `stores` 表仍存在。

判斷：既有 `stores` 表未因本次 migration 消失。

## 6. 已完成能力

Migration 完成後，DB schema 已具備以下基礎：

- 店家周邊機能設定。
- 每日 / 每月查詢 quota 記錄基礎。
- Google API usage log。
- `request_hash`。
- `api_called`。
- cache-first 支援。
- 24 小時內同 request 不重打的欄位基礎。
- Admin Dashboard 所需的初版統計 views。

這代表資料庫結構已可支援後續 API 進行店家設定、用量紀錄、cache 命中判斷與 Google API 成本控管實作。

## 7. 尚未完成事項

目前尚未完成：

- 尚未重構店家認證 API。
- 尚未重寫 nearby-facilities API。
- 尚未接 Google Geocoding API。
- 尚未接 Google Places API。
- 尚未設定 Vercel `GOOGLE_MAPS_SERVER_KEY`。
- 尚未建立 Admin Dashboard API。
- 尚未建立 Admin UI。
- 尚未建立 GPTs Actions schema。
- 尚未寫入任何 seed data。
- 尚未設定每間店的 `nearby_store_settings` 初始資料。

## 8. 風險與注意事項

- DB schema 已建立不代表功能已完成。
- API 尚未開始寫入 usage logs。
- Google API 尚未被呼叫。
- Google API hard limit 還需要在後端 API 實作。
- `nearby_store_settings` 目前可能尚無店家設定資料，後續需規劃 seed 或人工新增方式。
- Supabase service role key 不得出現在前端。
- Google API key 不得出現在 repo。
- 後續 API 實作前，需確認每間店的 nearby 設定、quota 與是否啟用 nearby 功能。

## 9. 下一步建議

下一步建議先做：

```txt
V1.1.5｜nearby_store_settings 初始資料規劃
```

原因：

- V1.2 若要重構店家認證 API，需要回傳今日 / 本月剩餘額度。
- 今日 / 本月剩餘額度需要依據每間店的 `nearby_store_settings.daily_quota`、`monthly_quota`、`google_daily_quota`、`google_monthly_quota` 計算。
- 若尚未規劃每間店的 `nearby_store_settings` 初始資料建立方式，店家認證 API 的回傳內容會缺少基準值。

備選下一步：

```txt
V1.2｜重構店家認證 API
```

但建議在 V1.1.5 完成後再進入 V1.2。

## V1.1.4 執行結果確認

- 實際新增檔案：
  - `docs/supabase-migration-result-v1.1.4.md`
- 實際修改檔案：無
- 是否修改 migration SQL：否
- 是否接觸 Google API：否
- 是否修改既有 API：否
- 是否修改 Vercel 環境變數：否
- 是否寫入 API Key：否
- 是否新增 migration / SQL 檔：否
- 是否部署：否
- migration 是否由使用者人工執行：是
- 是否建立 5 張 nearby table：是
- 是否建立 3 個 nearby view：是
- stores 表是否仍存在：是

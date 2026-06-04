# V1.1.6 nearby_store_settings 初始資料人工執行結果紀錄

建立日期：2026-06-04

## 1. 本次執行範圍

- 本次由使用者人工在 Supabase SQL Editor 建立 `nearby_store_settings` 初始資料。
- Codex 未連線 Supabase。
- Codex 未執行 SQL。
- 本次未修改 API。
- 本次未接 Google API。
- 本次未修改 Vercel env。
- 本次未寫入 API Key。
- 本次未寫入 access_code。
- 本次未新增 seed SQL 檔。
- 本次未修改 migration SQL。

## 2. 初始資料策略

本次初始資料策略如下：

- `nearby_enabled = false`
- 第一版先建立設定資料，不直接開通周邊機能。
- 不在前端或文件中暴露 access_code。
- 由後續人工確認後，再啟用指定店家的 nearby 功能。
- Google API 每日 quota 初始設定為 `50`。
- Google API 每月 quota 初始設定為 `1000`。

此策略符合 V1.1.5 規劃：先安全建立設定基礎，再進入 API 重構。

## 3. 建立結果

使用者回報已成功建立 6 筆 `nearby_store_settings` 設定。

| store_id | nearby_enabled | daily_quota | monthly_quota | google_daily_quota | google_monthly_quota | default_radius | allowed_radii | allowed_categories |
|---|---:|---:|---:|---:|---:|---:|---|---|
| `CH001` | `false` | 30 | 600 | 50 | 1000 | 1000 | `[500, 1000, 1500]` | `["park", "school", "shopping", "transport", "medical"]` |
| `CH002` | `false` | 30 | 600 | 50 | 1000 | 1000 | `[500, 1000, 1500]` | `["park", "school", "shopping", "transport", "medical"]` |
| `CH003` | `false` | 30 | 600 | 50 | 1000 | 1000 | `[500, 1000, 1500]` | `["park", "school", "shopping", "transport", "medical"]` |
| `CH004` | `false` | 30 | 600 | 50 | 1000 | 1000 | `[500, 1000, 1500]` | `["park", "school", "shopping", "transport", "medical"]` |
| `CH005` | `false` | 30 | 600 | 50 | 1000 | 1000 | `[500, 1000, 1500]` | `["park", "school", "shopping", "transport", "medical"]` |
| `CH006` | `false` | 30 | 600 | 50 | 1000 | 1000 | `[500, 1000, 1500]` | `["park", "school", "shopping", "transport", "medical"]` |

備註：

- 店家名稱本文件不重列，避免因編碼或顯示差異造成誤讀。
- 店家身份以 `store_id` 作為記錄基準。
- 本文件未包含 access_code。

## 4. Active Store 缺漏檢查

使用者回報 active store 缺漏檢查結果：

```txt
Success. No rows returned.
```

判斷：

```txt
active stores 目前沒有缺少 nearby_store_settings。
```

## 5. 安全確認

本次結果紀錄確認：

- 未寫入真實 access_code。
- 未寫入 Google API key。
- 未寫入 Supabase service role key。
- 未寫入真實地址。
- 未修改 `stores` 表結構。
- 未修改既有 land tax / tax price 相關資料表。
- 未啟用任何店家的附近機能功能。

## 6. 對後續 API 的影響

後續 `verify-store-access` API 可開始規劃改為：

- 查 `stores`。
- 驗證 `access_code`。
- 查 `nearby_store_settings`。
- 判斷 `nearby_enabled`。
- 回傳每日 / 每月剩餘查詢次數。
- 回傳 Google API 每日 / 每月剩餘次數。
- 若 `nearby_enabled = false`，回傳可辨識的 disabled 狀態，不允許執行周邊機能查詢。

目前所有店家的 `nearby_enabled` 皆為 `false`，因此 API 實作時應能正確處理「已設定但尚未啟用」的狀態。

## 7. 尚未完成事項

目前尚未完成：

- 尚未重構 `api/verify-store-access.js`。
- 尚未重寫 `api/nearby-facilities.js`。
- 尚未接 Google Geocoding API。
- 尚未接 Google Places API。
- 尚未設定 Vercel `GOOGLE_MAPS_SERVER_KEY`。
- 尚未設定 Supabase server-side env。
- 尚未建立 Admin Dashboard API。
- 尚未建立 Admin UI。
- 尚未建立 GPTs Actions schema。
- 尚未啟用任何店家的周邊機能功能。

## 8. 下一步建議

下一步建議：

```txt
V1.2｜重構店家認證 API
```

原因：

- DB schema 已建立。
- `nearby_store_settings` 初始資料已建立。
- active stores 已確認沒有缺漏設定。
- 下一步可以開始讓 `verify-store-access` 從 Vercel env 設定改為查 Supabase `stores` + `nearby_store_settings`。
- V1.2 應只處理店家認證與 quota 回傳，不接 Google API，不修改 `nearby-facilities.js`。

## V1.1.6 執行結果確認

- 實際新增檔案：
  - `docs/nearby-store-settings-initial-data-result-v1.1.6.md`
- 實際修改檔案：無
- 是否修改 migration SQL：否
- 是否接觸 Google API：否
- 是否修改既有 API：否
- 是否修改 Vercel 環境變數：否
- 是否寫入 API Key：否
- 是否寫入 access_code：否
- 是否新增 seed SQL 檔：否
- 是否部署：否
- 是否 commit：否
- 是否 push：否
- initial data 是否由使用者人工建立：是
- 是否建立 6 筆 `nearby_store_settings`：是
- active stores 是否仍有缺漏：否
- `nearby_enabled` 是否全部預設為 `false`：是

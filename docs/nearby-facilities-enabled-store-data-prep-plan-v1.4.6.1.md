# V1.4.6.1｜enabled 測試店家資料準備規劃

## 目的

規劃後續如何準備一筆可用於 nearby-facilities enabled / NOT_IMPLEMENTED 測試的店家資料。

本階段只做規劃，不直接修改 Supabase，不建立店家，不啟用任何店家設定。

## 背景

目前進度：

- V1.2 已完成 verify-store-access Supabase 認證
- V1.4.1 已完成 nearby-facilities 安全 skeleton
- V1.4.3 已完成 request_hash / cache lookup skeleton
- V1.4.4 已記錄 CH006 disabled 測試通過
- V1.4.5 已完成 enabled 店家 / NOT_IMPLEMENTED 測試規劃
- V1.4.6 已確認依既有文件 CH001 到 CH006 皆為 nearby_enabled = false
- V1.4.6 未直接連線 Supabase 查詢，因此仍需後續人工確認實際 DB 現況

## 問題

目前缺少一筆可安全用於 enabled 測試的店家資料。

若沒有 enabled 測試店家，就無法驗證：

- nearby.enabled = true 時 API 是否能通過 disabled guard
- Google API 尚未接入時是否回傳 NOT_IMPLEMENTED 或等價保守結果
- enabled 店家的 quota / settings 是否能正常出現在 response
- API 是否仍保持不呼叫 Google API、不呼叫 Overpass、不寫 cache、不寫 usage logs

## 建議資料準備方向

建議不要直接修改正式店家。

優先方案：

建立或指定一筆測試用途店家，例如：

- storeId：TEST_NEARBY_ENABLED
- storeName：周邊機能測試店
- active：true
- access_code：由使用者人工設定，不寫入文件
- nearby_store_settings.enabled：true
- nearby_store_settings.can_search_address：true
- nearby_store_settings.status：ENABLED
- dailyQuota：低額測試值，例如 3 或 5
- monthlyQuota：低額測試值，例如 30 或 50
- googleDailyQuota：0 或保守測試值
- googleMonthlyQuota：0 或保守測試值

備用方案：

若不建立新測試店家，也可由使用者人工指定一間非正式使用中的店家暫時作為測試，但必須符合：

- 不影響正式使用者
- 不會啟用實際 Google 查詢
- 不會產生費用
- 可隨時關閉 enabled
- 有明確紀錄誰啟用、何時啟用、測試目的

## 建議資料表檢查項目

後續若要進入資料準備，應先人工確認以下表與欄位：

### stores

需要確認：

- storeId / store_id 實際欄位名稱
- storeName / store_name 實際欄位名稱
- access_code 欄位名稱
- active 欄位名稱
- 是否有 expires_at / start_at / features 等欄位

### nearby_store_settings

需要確認：

- storeId / store_id 實際欄位名稱
- enabled 欄位名稱
- can_search_address 欄位名稱
- status 欄位名稱
- quota 相關欄位是否在此表或其他表

### nearby_store_quota_status

需要確認：

- storeId / store_id 實際欄位名稱
- todayUsed / today_used
- monthUsed / month_used
- todayRemaining / today_remaining
- monthRemaining / month_remaining
- googleTodayUsed / google_today_used
- googleMonthUsed / google_month_used
- quota 是否由 view 計算

## 建議測試資料原則

測試資料必須符合：

- 可被 verify-store-access 正常認證
- nearby.enabled = true
- nearby.canSearchAddress = true
- quota 可正常回傳
- 不包含真實 API Key
- 不觸發 Google API
- 不觸發 Overpass
- 不產生費用
- 可清楚辨識為測試資料
- 可在測試後停用或保留為測試店家

## 不建議做法

- 不建議直接啟用 CH001 到 CH006 的正式店家
- 不建議在沒有紀錄的情況下修改 Supabase
- 不建議直接把 Google quota 設為可用並接 API
- 不建議在 API 邏輯尚未明確前寫入 cache 或 usage logs
- 不建議把 access_code 寫進文件或 commit

## 後續可選路線

### 路線 A：只人工建立測試資料

由使用者在 Supabase 後台人工建立或啟用一筆測試店家。

下一步：

```txt
V1.4.6.2｜enabled 測試店家人工建立指引
```

### 路線 B：先做 SQL 草稿，不執行

建立一份 SQL 草稿文件，供使用者人工檢查後再決定是否執行。

下一步：

```txt
V1.4.6.2｜enabled 測試店家 SQL 草稿文件
```

### 路線 C：暫停 enabled 測試

若目前不想碰 Supabase 資料，先暫停 enabled 測試，轉向補文件或 GPTs Action schema。

下一步：

```txt
V1.4.7｜nearby-facilities GPTs Action schema 保守版檢查
```

## 本階段安全限制確認

本階段確認：

- 未修改 api/nearby-facilities.js
- 未修改 api/verify-store-access.js
- 未修改 Supabase schema
- 未修改 Supabase 資料
- 未建立測試店家
- 未啟用任何正式店家
- 未接 Google API
- 未呼叫 Google Geocoding API
- 未呼叫 Google Places API
- 未呼叫 Overpass
- 未寫 nearby_cache
- 未寫 usage logs
- 未修改 Vercel env
- 未寫入 API Key
- 未新增 dependency
- 未部署

## 建議下一步

建議走路線 A 或 B。

較安全順序：

1. V1.4.6.2｜enabled 測試店家人工建立指引
2. 由使用者人工確認是否要建立測試店家
3. V1.4.6.3｜enabled 測試店家資料建立結果紀錄
4. V1.4.7｜enabled 店家 nearby-facilities NOT_IMPLEMENTED 人工測試

## V1.4.6.1 執行結果確認

- 實際新增檔案：
  - `docs/nearby-facilities-enabled-store-data-prep-plan-v1.4.6.1.md`
- 實際修改檔案：無
- 是否只新增 V1.4.6.1 規劃文件：是
- 是否修改 API 檔案：否
- 是否修改 Supabase schema 或資料：否
- 是否建立或啟用測試店家：否
- 是否接 Google API / Overpass：否
- 是否寫 cache / usage logs：否
- 是否部署：否

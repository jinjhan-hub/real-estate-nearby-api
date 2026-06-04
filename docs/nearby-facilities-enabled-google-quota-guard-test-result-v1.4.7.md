# V1.4.7｜enabled 店家 nearby-facilities GOOGLE_QUOTA_EXCEEDED 安全測試結果

## 目的

記錄 enabled 測試店家 `TEST_NEARBY_ENABLED` 呼叫 `/api/nearby-facilities` 的人工測試結果，確認 enabled guard 已通過，且 Google quota = 0 時會被 quota guard 擋下，未產生 Google API 使用量。

## 測試前置條件

* 測試店家：TEST_NEARBY_ENABLED
* storeName：周邊機能測試店
* nearby_enabled：true
* daily_quota：3
* monthly_quota：30
* google_daily_quota：0
* google_monthly_quota：0
* access_code：未記錄明文
* Google API 尚未接入
* Overpass 已停用

## 測試一：精簡 body

### 請求摘要

* endpoint：`/api/nearby-facilities`
* method：POST
* storeId：TEST_NEARBY_ENABLED
* accessCode：未記錄明文
* address：未提供

### 回傳結果

* success：false
* reason：MISSING_ADDRESS
* message：Address is required.
* source：nearby-facilities-api
* runtimeVersion：nearby-facilities-v1.4.3-cache-lookup-skeleton
* storeId：TEST_NEARBY_ENABLED

### 判定

此結果表示：

* API 已讀到 storeId
* API 已驗證 accessCode
* API 已查到 TEST_NEARBY_ENABLED
* 已排除 STORE_NOT_FOUND
* 已通過店家 lookup 與 accessCode 驗證
* 因未提供 address，停在 MISSING_ADDRESS guard

## 測試二：完整 body

### 請求摘要

* endpoint：`/api/nearby-facilities`
* method：POST
* storeId：TEST_NEARBY_ENABLED
* accessCode：未記錄明文
* address：彰化縣員林市中山路一段
* radius：1000
* categories：park、school、shopping、transport、medical

### 回傳結果

* success：false
* reason：GOOGLE_QUOTA_EXCEEDED
* message：Store Google API quota has been exhausted.
* source：nearby-facilities-api
* runtimeVersion：nearby-facilities-v1.4.3-cache-lookup-skeleton

### 判定

此結果表示：

* enabled 店家已通過 lookup
* accessCode 已通過
* address 已通過
* nearby_enabled = true 已通過
* API 進入 Google quota guard
* 因 google_daily_quota / google_monthly_quota 皆為 0，回傳 GOOGLE_QUOTA_EXCEEDED
* 此結果符合安全預期
* 未證明 provider lookup 已實作
* 未進入 Google API 呼叫階段

## quota status 驗證

使用者查詢 `nearby_store_quota_status` 後確認：

* store_id：TEST_NEARBY_ENABLED
* store_name：周邊機能測試店
* nearby_enabled：true
* daily_quota：3
* monthly_quota：30
* today_usage_count：0
* month_usage_count：0
* today_remaining：3
* month_remaining：30
* google_daily_quota：0
* google_monthly_quota：0
* today_google_api_count：0
* month_google_api_count：0
* today_google_remaining：0
* month_google_remaining：0

## 最終判定

V1.4.7 測試結論：

* STORE_NOT_FOUND 已排除
* NEARBY_DISABLED 已排除
* STORE_ACCESS_CONFIG 衝突已排除
* enabled 店家流程已通過至 Google quota guard
* Google quota = 0 的防護有效
* Google API 使用量維持 0
* usage count 維持 0
* 本階段安全測試通過

## 本階段安全確認

本階段確認：

* 未修改 `api/nearby-facilities.js`
* 未修改 `api/verify-store-access.js`
* 未修改 Supabase schema
* 未修改 Supabase 資料
* 未修改 CH001 到 CH006
* 未修改 Vercel env
* 未刪除或修改 `STORE_ACCESS_CONFIG`
* 未接 Google API
* 未呼叫 Google Geocoding API
* 未呼叫 Google Places API
* 未呼叫 Overpass
* 未寫 `nearby_cache`
* 未寫 usage logs
* 未寫入 access_code
* 未新增 dependency
* 未部署

## 下一步建議

V1.4.8｜Google quota 正數但 provider 尚未實作之安全測試規劃

下一階段不得直接修改 quota 或接 Google API，需先規劃：

* 是否暫時將 TEST_NEARBY_ENABLED google_daily_quota / google_monthly_quota 設為 1
* 如何確認 provider lookup 不會實際呼叫 Google API
* 如何確保仍不寫 `nearby_cache`
* 如何確保仍不寫 usage logs
* 如何在測試後恢復 google quota = 0

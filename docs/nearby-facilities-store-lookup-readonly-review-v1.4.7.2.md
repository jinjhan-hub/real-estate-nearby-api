# V1.4.7.2｜nearby-facilities store lookup 邏輯只讀排查

## 目的

只讀排查 `api/nearby-facilities.js` 與 `api/verify-store-access.js` 的店家查詢邏輯，釐清為什麼 enabled 測試店家 `TEST_NEARBY_ENABLED` 在 `/api/verify-store-access` 可通過驗證，但在 `/api/nearby-facilities` 回傳 `STORE_NOT_FOUND`。

本階段只做程式碼閱讀與文件紀錄，不修改 API、不修改 Supabase、不執行 SQL、不接 Google API、不部署。

## 背景測試結果

### verify-store-access

使用者人工測試結果：

* endpoint：`/api/verify-store-access`
* storeId：TEST_NEARBY_ENABLED
* accessCode：未記錄明文
* runtimeVersion：verify-store-access-v1.2-supabase
* verified：true
* success：true
* reason：OK
* storeName：周邊機能測試店
* active：true
* nearby.enabled：true
* nearby.canSearchAddress：true
* nearby.status：ENABLED
* dailyQuota：3
* monthlyQuota：30
* googleDailyQuota：0
* googleMonthlyQuota：0

### nearby-facilities

使用者人工測試結果：

* endpoint：`/api/nearby-facilities`
* storeId：TEST_NEARBY_ENABLED
* accessCode：未記錄明文
* runtimeVersion：nearby-facilities-v1.4.3-cache-lookup-skeleton
* success：false
* reason：STORE_NOT_FOUND
* message：Store was not found.
* facilities：{}
* summary：[]

## STORE_ACCESS_CONFIG 檢查

只讀檢查結果：

* `api/nearby-facilities.js` 未讀取 `STORE_ACCESS_CONFIG`
* `api/verify-store-access.js` 未讀取 `STORE_ACCESS_CONFIG`
* `STORE_ACCESS_CONFIG` 僅出現在 legacy / debug 用途的 `api/debug-store-config.js`

判定：

目前 `nearby-facilities` 回傳 `STORE_NOT_FOUND` 的問題，不是 `STORE_ACCESS_CONFIG` legacy env 造成。

## request body 欄位比對

`api/nearby-facilities.js` 與 `api/verify-store-access.js` 目前支援相同的 store id aliases：

* `storeId`
* `storeCode`
* `store`
* `storeNo`
* `id`

兩者也支援相同的 access code aliases：

* `accessCode`
* `verifyCode`
* `verificationCode`
* `authCode`
* `password`
* `code`

兩者皆未支援 snake_case 欄位：

* `store_id`
* `access_code`

判定：

若 `/api/nearby-facilities` 測試請求只送 `store_id` 而未送 `storeId` 等支援欄位，理論上應先回傳 `MISSING_INPUT`，而不是 `STORE_NOT_FOUND`。

因此依目前回傳 `STORE_NOT_FOUND` 判斷，`nearby-facilities` 很可能已成功解析到某個 store id，並進入 Supabase `stores` 查詢階段。

## Supabase lookup 比對

### nearby-facilities

`api/nearby-facilities.js` 使用 server-side env：

* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`

店家查詢邏輯：

* table：`stores`
* filter：`store_id=eq.${storeId}`
* limit：`1`
* select 欄位：
  * `store_id`
  * `store_name`
  * `access_code`
  * `active`
  * `start_at`
  * `expires_at`

查詢 helper 以 Supabase REST API 回傳陣列為基礎，若陣列有資料則取第一筆，若沒有資料則視為 `null`。

### verify-store-access

`api/verify-store-access.js` 同樣使用 server-side env：

* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`

店家查詢邏輯：

* table：`stores`
* filter：`store_id=eq.${storeId}`
* limit：`1`
* select 欄位：
  * `store_id`
  * `store_name`
  * `access_code`
  * `active`
  * `start_at`
  * `expires_at`
  * `features`
  * `brokerage_name`
  * `broker_name`
  * `broker_license_no`

查詢 helper 同樣以 Supabase REST API 回傳陣列為基礎，若陣列有資料則取第一筆，若沒有資料則視為 `null`。

## STORE_NOT_FOUND 回傳位置

`api/nearby-facilities.js` 的 `STORE_NOT_FOUND` 發生在以下流程：

1. method 檢查通過
2. body 解析完成
3. store id / access code 輸入檢查通過
4. Supabase env 檢查通過
5. 查詢 `stores`
6. `stores` 查詢結果為空
7. 回傳 `STORE_NOT_FOUND`

因此目前錯誤發生在：

* access code 比對之前
* `active` / `start_at` / `expires_at` 檢查之前
* `nearby_store_settings` 查詢之前
* `nearby_store_quota_status` 查詢之前
* cache lookup 之前
* Google / Overpass provider 之前

## 初步判定

依本機 `main` 目前程式碼只讀比對，`nearby-facilities` 與 `verify-store-access` 的 `stores` lookup 條件大致一致：

* 同樣正規化 store id 為 uppercase
* 同樣查 `stores`
* 同樣使用 `store_id=eq.${storeId}`
* 同樣使用 `SUPABASE_URL`
* 同樣使用 `SUPABASE_SERVICE_ROLE_KEY`
* 同樣透過 Supabase REST API 讀取資料

因此，單看目前本機程式碼，尚未看到足以解釋「`verify-store-access` 查得到，但 `nearby-facilities` 查不到」的明顯 lookup 條件差異。

較可能的方向：

* 兩次人工測試的 request body 欄位或值仍有差異
* Vercel production 上的 `nearby-facilities` 實際部署內容與目前本機 `main` 仍有差異，即使 runtimeVersion 看起來相同
* production route / function bundle 有快取或部署來源差異
* 需要在後續版本以安全方式規劃更明確的診斷欄位，但本階段不修改程式

目前可排除的方向：

* 不是 Google API 問題
* 不是 Google Geocoding API 問題
* 不是 Google Places API 問題
* 不是 Overpass 問題
* 不是 cache 寫入問題
* 不是 usage logs 寫入問題
* 不是 `STORE_ACCESS_CONFIG` 問題

## 下一步建議

建議下一階段：

V1.4.7.3｜nearby-facilities request body / deployment source 安全複測規劃

建議只做規劃或只讀確認，重點包含：

* 重新確認 `/api/nearby-facilities` 實際送出的 request body 欄位名稱
* 確認 store id 是否確實以 `storeId: "TEST_NEARBY_ENABLED"` 傳入
* 確認 access code 未被寫入文件、commit、log 或回報
* 確認 Vercel production 使用的部署 commit 是否包含目前 `main` 的 `api/nearby-facilities.js`
* 規劃是否需要在後續版本新增不含敏感資料的診斷欄位

若要修改程式，應另開版本，且只做最小範圍修正，例如讓 `nearby-facilities` 與 `verify-store-access` 共用一致的店家查詢邏輯，或新增不洩漏密鑰與 access code 的 request lookup diagnostic。

## 本階段安全確認

本階段確認：

* 未修改 `api/nearby-facilities.js`
* 未修改 `api/verify-store-access.js`
* 未修改 Supabase schema
* 未修改 Supabase 資料
* 未執行 SQL
* 未修改 CH001 到 CH006
* 未接 Google API
* 未呼叫 Google Geocoding API
* 未呼叫 Google Places API
* 未呼叫 Overpass
* 未寫 `nearby_cache`
* 未寫 usage logs
* 未修改 Vercel env
* 未寫入 API Key
* 未寫入 access_code
* 未新增 dependency
* 未部署

## V1.4.7.2 執行結果確認

* 實際新增檔案：
  * `docs/nearby-facilities-store-lookup-readonly-review-v1.4.7.2.md`
* 是否修改 API 檔案：否
* 是否修改 Supabase schema 或資料：否
* 是否執行 SQL：否
* 是否接 Google API / Overpass：否
* 是否寫 cache / usage logs：否
* 是否寫入 access_code：否
* 是否修改 Vercel env：否
* 是否新增 dependency：否
* 是否部署：否

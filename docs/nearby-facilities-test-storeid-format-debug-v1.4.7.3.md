# V1.4.7.3｜nearby-facilities TEST storeId 格式排查

## 目的

比對 CH006 與 `TEST_NEARBY_ENABLED` 的測試結果差異，檢查 `api/nearby-facilities.js` 是否存在 storeId 格式限制、CH 前綴限制、regex 判斷、或與 `api/verify-store-access.js` 不一致的 store lookup 行為。

本階段只做只讀檢查與文件紀錄，不修改 API、不修改 Supabase、不接 Google API、不部署。

## 測試結果背景

### TEST_NEARBY_ENABLED

使用者人工測試結果：

* `verify-store-access`：OK
* `nearby-facilities`：STORE_NOT_FOUND
* access_code：未記錄明文
* `nearby.enabled`：true

### CH006 + Supabase code

使用者人工測試結果：

* `nearby-facilities`：NEARBY_DISABLED
* 顯示 `nearby-facilities` 可查到 Supabase 中的 CH006
* 顯示 CH006 的 Supabase access_code 比對成功

### CH006 + STORE_ACCESS_CONFIG 舊 code

使用者人工測試結果：

* `nearby-facilities`：INVALID_CODE
* 顯示 `nearby-facilities` 沒有使用 `STORE_ACCESS_CONFIG` 中的舊 code 作為認證來源

## 已可排除方向

依 CH006 測試結果與本機只讀檢查，目前可排除：

* `nearby-facilities` 不是使用 `STORE_ACCESS_CONFIG` 認證
* Supabase production env 大方向可用
* `nearby-facilities` 可查到 Supabase 中既有 CH006 店家
* `nearby-facilities` 可使用 Supabase access_code 完成 CH006 驗證
* CH006 disabled guard 可正常回傳 `NEARBY_DISABLED`

## 仍需釐清方向

目前仍需釐清：

* `nearby-facilities` 是否對 `TEST_NEARBY_ENABLED` 的 storeId 格式有隱性限制
* `nearby-facilities` 是否只支援 CH 前綴或特定格式
* `nearby-facilities` 的 store lookup 是否與 `verify-store-access` 在 production 上存在差異
* production `nearby-facilities` 是否與本機 `main` 程式碼一致

## 只讀檢查結果

### 是否限制 CH storeId 格式

只讀檢查 `api/nearby-facilities.js` 後，未發現針對 CH storeId 的明確格式限制。

檢查結果：

* 未發現以 `CH` 作為必要前綴的條件判斷
* 未發現針對 `TEST` storeId 的排除條件
* 未發現使用 `startsWith("CH")` 的 storeId 限制
* 未發現使用 `match` 或 regex 限制 storeId 必須為 CH 編號

### storeId normalization

`nearby-facilities` 使用：

```js
function normalizeStoreId(value) {
  return safeString(value).toUpperCase();
}
```

因此：

* `TEST_NEARBY_ENABLED` 會維持為 `TEST_NEARBY_ENABLED`
* 小寫或混合大小寫輸入會被轉成 uppercase
* 目前未看到 normalization 會破壞底線 `_`
* 目前未看到 normalization 會移除 `TEST` 字樣

### request body 欄位

`nearby-facilities` 讀取的 store id aliases：

* `storeId`
* `storeCode`
* `store`
* `storeNo`
* `id`

`nearby-facilities` 讀取的 access code aliases：

* `accessCode`
* `verifyCode`
* `verificationCode`
* `authCode`
* `password`
* `code`

注意：

* 目前不支援 `store_id`
* 目前不支援 `access_code`

若測試請求使用 `store_id` 而沒有使用 `storeId` 等支援欄位，理論上會先進入 `MISSING_INPUT`，不是 `STORE_NOT_FOUND`。

### STORE_NOT_FOUND 位置

`nearby-facilities` 的 `STORE_NOT_FOUND` 發生在查詢 `stores` 後：

* table：`stores`
* filter：`store_id=eq.${storeId}`
* limit：`1`
* 查詢結果沒有資料時回傳 `STORE_NOT_FOUND`

這表示錯誤發生於：

* access_code 比對之前
* `nearby_store_settings` 查詢之前
* `nearby_store_quota_status` 查詢之前
* cache lookup 之前
* Google / Overpass provider 之前

### 與 verify-store-access lookup 比對

依本機程式碼只讀比對：

* `nearby-facilities` 與 `verify-store-access` 皆使用 `SUPABASE_URL`
* `nearby-facilities` 與 `verify-store-access` 皆使用 `SUPABASE_SERVICE_ROLE_KEY`
* 兩者皆查詢 `stores`
* 兩者皆使用 `store_id=eq.${storeId}`
* 兩者皆使用 `limit=1`
* 兩者皆未使用 `.single()` 或 `.maybeSingle()`
* 兩者皆以 Supabase REST API 回傳陣列的第一筆作為結果

主要差異是 select 欄位：

* `nearby-facilities` 選取 `store_id`、`store_name`、`access_code`、`active`、`start_at`、`expires_at`
* `verify-store-access` 額外選取 `features`、`brokerage_name`、`broker_name`、`broker_license_no`

此 select 差異理論上不應造成同一個 `store_id` 在一支 API 查得到、另一支 API 查不到。

## STORE_NOT_FOUND 初步判定

依目前只讀檢查，本機 `api/nearby-facilities.js` 未發現只接受 CH storeId 的程式邏輯，也未發現 regex、match、startsWith 等格式限制。

因此 `TEST_NEARBY_ENABLED` 在 production `/api/nearby-facilities` 回傳 `STORE_NOT_FOUND`，較可能原因為：

* 人工測試時 `/api/nearby-facilities` request body 與 `/api/verify-store-access` request body 實際欄位或值仍有差異
* production `nearby-facilities` 實際部署內容與本機 `main` 仍可能有差異
* production route / function bundle 可能存在部署來源或快取差異
* 需要後續以不洩漏 access_code 的方式增加安全複測或診斷欄位

目前不像是：

* `STORE_ACCESS_CONFIG` 問題
* Google API 問題
* Overpass 問題
* cache 問題
* usage logs 問題
* CH-only storeId 格式限制問題

## CH006 測試的意義

CH006 + Supabase code 回傳 `NEARBY_DISABLED` 表示：

* `nearby-facilities` 可查到 `stores` 中的 CH006
* `nearby-facilities` 可完成 Supabase access_code 比對
* `nearby-facilities` 可查到 nearby 設定與 quota 狀態
* disabled guard 正常運作

CH006 + `STORE_ACCESS_CONFIG` 舊 code 回傳 `INVALID_CODE` 表示：

* `nearby-facilities` 並未使用 `STORE_ACCESS_CONFIG` 舊 code 作為認證來源
* `nearby-facilities` 認證來源已指向 Supabase

因此目前問題更集中在 `TEST_NEARBY_ENABLED` 的查詢條件、production request body、或 production 部署內容差異。

## 下一步建議

若要繼續排查，建議下一階段：

V1.4.7.4｜nearby-facilities request body / deployment source 安全複測規劃

建議只做規劃或安全複測，不直接修改 API，重點包含：

* 用完全相同的 `storeId` / `accessCode` 欄位格式分別呼叫兩支 API
* 不在文件、log、commit、回報中記錄 access_code
* 確認 Vercel production 最新部署 commit
* 確認 `/api/nearby-facilities` 實際 runtimeVersion 與部署來源
* 若仍回 `STORE_NOT_FOUND`，再規劃後續最小安全診斷欄位

若確認不是 request body 或 deployment source 問題，再進入：

V1.4.7.4｜nearby-facilities lookup 診斷欄位規劃

該階段可規劃是否新增不含敏感資訊的診斷欄位，例如：

* parsedStoreId 是否存在
* storeLookupTable
* storeLookupField
* storeLookupResult 是否命中

但不得回傳 access_code、Supabase key、完整 request body 或任何敏感資料。

## 本階段安全限制確認

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

## V1.4.7.3 執行結果確認

* 實際新增檔案：
  * `docs/nearby-facilities-test-storeid-format-debug-v1.4.7.3.md`
* 是否只新增 V1.4.7.3 排查紀錄：是
* 是否發現 storeId 格式限制：否
* 是否發現 CH-only 限制：否
* 是否發現 `match` / regex / `startsWith` storeId 限制：否
* 是否發現 `nearby-facilities` 與 `verify-store-access` lookup 重大差異：否
* 是否修改 API 檔案：否
* 是否修改 Supabase schema 或資料：否
* 是否接 Google API / Overpass：否
* 是否寫 cache / usage logs：否
* 是否寫入 access_code：否
* 是否部署：否

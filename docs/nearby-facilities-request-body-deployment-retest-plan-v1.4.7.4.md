# V1.4.7.4｜nearby-facilities request body / deployment source 安全複測規劃

## 目的

整理 V1.4.7 系列目前的人工測試結果，規劃下一輪不修改 API、不修改 Supabase、不接外部服務的安全複測方式，用來釐清 `/api/nearby-facilities` 對 `TEST_NEARBY_ENABLED` 回傳 `STORE_NOT_FOUND` 的原因。

本階段只新增測試規劃文件，不實際執行測試、不修改 API、不修改 Supabase、不修改 Vercel env、不部署。

## 已完成測試結果整理

### TEST_NEARBY_ENABLED + camelCase body

* endpoint：`/api/nearby-facilities`
* body：`storeId` / `accessCode`
* result：STORE_NOT_FOUND
* runtimeVersion：nearby-facilities-v1.4.3-cache-lookup-skeleton
* interpretation：API 已能解析 camelCase body，但查不到 `TEST_NEARBY_ENABLED`

### TEST_NEARBY_ENABLED + snake_case body

* endpoint：`/api/nearby-facilities`
* body：`store_id` / `access_code`
* result：MISSING_INPUT
* message：Store id and access code are required.
* storeId：null
* runtimeVersion：nearby-facilities-v1.4.3-cache-lookup-skeleton
* interpretation：`nearby-facilities` 目前不支援 snake_case body，測試時應使用 camelCase

### TEST_NEARBY_ENABLED + verify-store-access

* endpoint：`/api/verify-store-access`
* result：OK
* verified：true
* nearby.enabled：true
* nearby.status：ENABLED
* dailyQuota：3
* monthlyQuota：30
* googleDailyQuota：0
* googleMonthlyQuota：0
* interpretation：`TEST_NEARBY_ENABLED` 存在於 production API 使用的 Supabase，且 access_code 可驗證

### CH006 + Supabase code + nearby-facilities

* endpoint：`/api/nearby-facilities`
* result：NEARBY_DISABLED
* storeId：CH006
* nearby.enabled：false
* runtimeVersion：nearby-facilities-v1.4.3-cache-lookup-skeleton
* interpretation：`nearby-facilities` 可查到 Supabase 中的 CH006，並可讀取 nearby settings / quota

### CH006 + STORE_ACCESS_CONFIG 舊 code + nearby-facilities

* endpoint：`/api/nearby-facilities`
* result：INVALID_CODE
* storeId：CH006
* runtimeVersion：nearby-facilities-v1.4.3-cache-lookup-skeleton
* interpretation：`nearby-facilities` 沒有使用 `STORE_ACCESS_CONFIG` 舊 code 作為認證來源

## 目前可確認事項

目前已可確認：

* Supabase production env 大方向可用
* `access_code` 比對邏輯可運作
* `nearby-facilities` production 可查詢 Supabase `stores`
* `nearby-facilities` 可查到 CH006
* `nearby-facilities` 沒有使用 `STORE_ACCESS_CONFIG` 舊 code
* snake_case body 不是目前支援格式
* CH-only storeId 格式限制尚未在本機程式碼中發現
* Google API / Overpass 不是本次問題來源

## 仍未確認事項

目前仍需確認：

* production deployment source 是否真的與目前 `main` 一致
* production `nearby-facilities` 實際執行的 lookup 程式是否與本機只讀檢查一致
* `TEST_NEARBY_ENABLED` 在 production `nearby-facilities` lookup 中是否有隱性差異
* request body 是否有不可見字元、空白、全形字元或變數內容差異
* Vercel serverless function 是否存在舊部署、快取或路由來源差異

## 建議安全複測方式

### 複測 A：TEST_NEARBY_ENABLED 最小 body

目的：

確認只傳必要欄位時，`nearby-facilities` 是否仍回 `STORE_NOT_FOUND`。

建議由使用者在本機 PowerShell 執行，且不得回報 access_code 明文：

```powershell
$base = "https://real-estate-nearby-api.vercel.app"
$storeId = "TEST_NEARBY_ENABLED"
$accessCode = "使用者自行填入，不要回報"

$body = @{
  storeId = $storeId
  accessCode = $accessCode
} | ConvertTo-Json -Depth 5

$response = Invoke-RestMethod `
  -Uri "$base/api/nearby-facilities" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

$response | ConvertTo-Json -Depth 10
```

觀察重點：

* 是否仍回 `STORE_NOT_FOUND`
* 是否出現 `MISSING_ADDRESS`
* 是否進一步進入 `NEARBY_DISABLED` / `GOOGLE_QUOTA_EXCEEDED` / `NOT_IMPLEMENTED`
* runtimeVersion 是否仍為 `nearby-facilities-v1.4.3-cache-lookup-skeleton`
* response 是否未洩漏 access_code

### 複測 B：storeId trim / literal check

目的：

確認 PowerShell 變數中的 storeId 沒有不可見字元。

建議由使用者在本機 PowerShell 執行：

```powershell
$storeId = "TEST_NEARBY_ENABLED"
$storeId.Length
$storeId.ToCharArray() | ForEach-Object { [int][char]$_ }
```

觀察重點：

* 長度是否符合 `TEST_NEARBY_ENABLED`
* 是否只有一般 ASCII 字元
* 是否沒有前後空白、不可見字元或全形底線

### 複測 C：CH 格式 enabled 測試店家規劃

若複測 A / B 後仍回 `STORE_NOT_FOUND`，可考慮由使用者人工建立一筆 CH 格式的 enabled 測試店家，例如：

* CH999
* 明確標示為測試店家
* nearby_enabled = true
* google quota = 0

注意：

本階段不建立店家、不修改 Supabase、不提供可直接執行的 SQL。此複測只作為後續規劃方向，用來判斷問題是否與 `TEST_NEARBY_ENABLED` 格式或 production lookup 有關。

### 複測 D：deployment source 確認

目的：

確認 production deployment source 是否與目前 `main` 一致。

建議由使用者人工確認：

* Vercel production deployment commit 是否包含目前 GitHub main 最新 commit
* GitHub main 最新 commit 是否已部署到 production
* Vercel deployment details 中的 commit hash 是否對應目前 V1.4.3 skeleton
* runtimeVersion 是否只能作為輔助訊號，不能完全證明 production source 與本機一致

## 不建議複測方式

本階段不建議：

* 不要使用 `STORE_ACCESS_CONFIG`
* 不要修改 Vercel env
* 不要修改 `api/nearby-facilities.js`
* 不要接 Google API
* 不要新增 debug 欄位到 production response
* 不要把 access_code 貼到 response、文件、commit、log 或回報
* 不要寫 cache / usage logs

## 後續判斷路線

### 若複測 A 仍回 STORE_NOT_FOUND

建議下一步：

V1.4.7.5｜production deployment source / safe diagnostics 規劃

### 若複測 A 回 NOT_IMPLEMENTED 或等價保守結果

建議記錄測試結果，代表 `nearby-facilities` 已通過 store lookup 與 disabled guard，可回到 enabled 店家 NOT_IMPLEMENTED 測試紀錄路線。

### 若 CH 格式 enabled 測試店家可通過 lookup

建議下一步：

V1.4.7.5｜TEST storeId 格式差異測試結果紀錄

### 若確認 production deployment 未同步 main

建議下一步：

V1.4.7.5｜production deployment 同步狀態檢查與重部署規劃

## 本階段安全限制確認

本階段確認：

* 未修改 `api/nearby-facilities.js`
* 未修改 `api/verify-store-access.js`
* 未修改 Supabase schema
* 未修改 Supabase 資料
* 未修改 Vercel env
* 未讀取 `STORE_ACCESS_CONFIG`
* 未寫入 access_code
* 未接 Google API
* 未呼叫 Google Geocoding API
* 未呼叫 Google Places API
* 未呼叫 Overpass
* 未寫 `nearby_cache`
* 未寫 usage logs
* 未新增 dependency
* 未部署

## V1.4.7.4 執行結果確認

* 實際新增檔案：
  * `docs/nearby-facilities-request-body-deployment-retest-plan-v1.4.7.4.md`
* 是否只新增 V1.4.7.4 安全複測規劃文件：是
* 是否修改 API 檔案：否
* 是否修改 Supabase schema 或資料：否
* 是否修改 Vercel env：否
* 是否讀取或使用 `STORE_ACCESS_CONFIG`：否
* 是否接 Google API / Overpass：否
* 是否寫 cache / usage logs：否
* 是否寫入 access_code：否
* 是否部署：否

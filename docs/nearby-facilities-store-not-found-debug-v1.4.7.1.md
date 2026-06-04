# V1.4.7.1｜enabled 店家 STORE_NOT_FOUND 排查紀錄

## 目的

記錄 V1.4.7 enabled 店家測試時，`/api/nearby-facilities` 回傳 `STORE_NOT_FOUND`，但 `/api/verify-store-access` 可正常驗證通過的結果。

## 測試結果摘要

### nearby-facilities

- endpoint：`/api/nearby-facilities`
- storeId：TEST_NEARBY_ENABLED
- accessCode：未記錄明文
- runtimeVersion：nearby-facilities-v1.4.3-cache-lookup-skeleton
- success：false
- reason：STORE_NOT_FOUND
- message：Store was not found.
- facilities：{}
- summary：[]

### verify-store-access

- endpoint：`/api/verify-store-access`
- storeId：TEST_NEARBY_ENABLED
- accessCode：未記錄明文
- runtimeVersion：verify-store-access-v1.2-supabase
- verified：true
- success：true
- reason：OK
- storeName：周邊機能測試店
- active：true
- nearby.enabled：true
- nearby.canSearchAddress：true
- nearby.status：ENABLED
- dailyQuota：3
- monthlyQuota：30
- googleDailyQuota：0
- googleMonthlyQuota：0

## 判定

`verify-store-access` 能正常查到 `TEST_NEARBY_ENABLED`，表示：

- Vercel production API 可以連到包含測試店家的 Supabase
- SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 大方向可用
- 測試店家資料存在
- access_code 有效
- nearby 設定可正常回傳

但 `nearby-facilities` 回傳 `STORE_NOT_FOUND`，表示問題較可能在：

- `api/nearby-facilities.js` 的 store lookup 條件
- request body 欄位命名差異
- storeId normalization 差異
- Supabase select / join / maybeSingle 條件差異
- nearby-facilities 與 verify-store-access 未共用相同查詢邏輯

目前不是 Google API 問題，也不是 Overpass 問題。

## 下一步建議

```txt
V1.4.7.2｜nearby-facilities store lookup 邏輯只讀排查
```

下一階段只讀檢查：

- `api/nearby-facilities.js`
- `api/verify-store-access.js`

比對兩者：

- request body 讀取欄位
- storeId / accessCode 變數命名
- Supabase 查詢 table
- Supabase 查詢欄位
- `.eq()` 條件
- `.single()` / `.maybeSingle()`
- 錯誤 reason 回傳路徑

不得修改任何程式。

## 本階段安全確認

本階段確認：

- 未修改 api/nearby-facilities.js
- 未修改 api/verify-store-access.js
- 未修改 Supabase schema
- 未修改 Supabase 資料
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

## V1.4.7.1 執行結果確認

- 實際新增檔案：
  - `docs/nearby-facilities-store-not-found-debug-v1.4.7.1.md`
- 實際修改檔案：無
- 是否只新增 V1.4.7.1 排查紀錄文件：是
- 是否寫入 access_code：否
- 是否修改 API 檔案：否
- 是否修改 Supabase schema 或資料：否
- 是否接 Google API / Overpass：否
- 是否寫 cache / usage logs：否
- 是否部署：否

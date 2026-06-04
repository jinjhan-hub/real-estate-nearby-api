# V1.4.6.3｜enabled 測試店家資料建立結果紀錄

## 目的

記錄使用者依 V1.4.6.2 指引，在 Supabase 後台人工建立或啟用 enabled 測試店家的結果。

本階段只做結果紀錄，不直接修改 Supabase，不直接建立測試店家，不寫入 access_code。

## 背景

目前進度：

- V1.2 已完成 verify-store-access Supabase 認證
- V1.4.1 已完成 nearby-facilities 安全 skeleton
- V1.4.3 已完成 request_hash / cache lookup skeleton
- V1.4.4 已記錄 CH006 disabled 測試通過
- V1.4.5 已完成 enabled 店家 / NOT_IMPLEMENTED 測試規劃
- V1.4.6 已確認依既有文件 CH001 到 CH006 皆為 nearby_enabled = false
- V1.4.6.1 已完成 enabled 測試店家資料準備規劃
- V1.4.6.2 已完成 enabled 測試店家人工建立指引

## 使用者人工操作結果

請依使用者實際回報填寫。

### 是否已建立或啟用測試店家

- 結論：無法確認

說明：

- 本階段收到的任務內容未提供實際 storeId / storeName / enabled 狀態等人工設定結果。
- Codex 未直接連線 Supabase 查詢。
- Codex 未修改 Supabase 資料。
- 因此目前僅能記錄「尚未取得可確認的 enabled 測試店家結果」。

### 測試店家資訊

目前未取得可記錄的 enabled 測試店家資訊。

- storeId：無法確認
- storeName：無法確認
- stores.active：無法確認
- nearby.enabled：無法確認
- nearby.canSearchAddress：無法確認
- nearby.status：無法確認
- dailyQuota：無法確認
- monthlyQuota：無法確認
- googleDailyQuota：無法確認
- googleMonthlyQuota：無法確認
- quota status 是否可查：無法確認
- 是否適合下一階段 NOT_IMPLEMENTED 測試：否

注意：

- 未記錄 access_code 明文
- 未記錄任何 API Key
- 未記錄 Supabase service role key

若使用者尚未建立測試店家，請記錄：

- 尚未建立 enabled 測試店家
- 下一階段不應進入 NOT_IMPLEMENTED 實測
- 建議先由使用者完成 Supabase 後台人工設定，或改走 SQL 草稿文件路線

## 安全確認

依本階段實際執行狀態：

- 是否修改 CH001 到 CH006 正式店家：否
- 是否輸入或修改 Google API Key：否
- 是否修改 Vercel env：否
- 是否部署：否
- access_code 是否未貼出 / 未寫入文件：是
- 是否修改 Supabase schema：否
- 是否寫入 nearby_cache：否
- 是否寫入 usage logs：否

## 後續測試判斷

### 若已建立 enabled 測試店家

可進入：

```txt
V1.4.7｜enabled 店家 nearby-facilities NOT_IMPLEMENTED 人工測試
```

測試重點：

- verify-store-access 可通過
- nearby.enabled = true
- nearby.canSearchAddress = true
- /api/nearby-facilities 不呼叫 Google API
- 不呼叫 Overpass
- 不寫 cache
- 不寫 usage logs
- 回傳 NOT_IMPLEMENTED 或等價保守結果
- facilities = {}
- summary = []

### 若尚未建立 enabled 測試店家

不可進入 V1.4.7 實測。

建議下一步：

V1.4.6.2 補人工設定，或另開：

```txt
V1.4.6.2-SQL｜enabled 測試店家 SQL 草稿文件
```

該階段只建立 SQL 草稿，不執行 SQL，不 commit access_code。

## 本階段安全限制確認

本階段確認：

- 未修改 api/nearby-facilities.js
- 未修改 api/verify-store-access.js
- 未修改 Supabase schema
- 未修改 Supabase 資料
- 未建立測試店家
- 未啟用任何店家
- 未修改 CH001 到 CH006
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
- 未把 access_code 寫入文件

## 下一步建議

若測試店家已準備完成：

```txt
V1.4.7｜enabled 店家 nearby-facilities NOT_IMPLEMENTED 人工測試
```

若尚未準備完成：

```txt
V1.4.6.2-SQL｜enabled 測試店家 SQL 草稿文件
```

或回到：

```txt
V1.4.6.2｜enabled 測試店家人工建立指引
```

本階段因未取得可確認的人工建立結果，建議下一步先走：

```txt
V1.4.6.2-SQL｜enabled 測試店家 SQL 草稿文件
```

## V1.4.6.3 執行結果確認

- 實際新增檔案：
  - `docs/nearby-facilities-enabled-store-setup-result-v1.4.6.3.md`
- 實際修改檔案：無
- 是否只新增 V1.4.6.3 結果紀錄文件：是
- 是否記錄 access_code 明文：否
- 是否修改 API 檔案：否
- 是否修改 Supabase schema 或資料：否
- 是否建立或啟用測試店家：否
- 是否修改 CH001 到 CH006：否
- 是否接 Google API / Overpass：否
- 是否寫 cache / usage logs：否
- 是否部署：否
- 是否可進入 V1.4.7：否，尚未取得 enabled 測試店家確認結果

# V1.4.6｜enabled 測試店家資料確認

## 目的

確認目前 Supabase 是否已有可用於 nearby-facilities enabled / NOT_IMPLEMENTED 測試的店家資料。

## 前置狀態

- V1.4.3 已完成 request_hash / cache lookup skeleton
- V1.4.4 已完成 CH006 disabled 店家人工測試紀錄
- V1.4.5 已完成 enabled 店家 / NOT_IMPLEMENTED 測試規劃
- 本階段不修改 API、不修改 Supabase、不接 Google API、不部署

## 檢查目標

需要確認是否存在一筆測試店家符合：

- stores.active = true
- access_code 有效
- nearby_store_settings.enabled = true
- nearby_store_settings.can_search_address = true，或至少 enabled = true
- nearby_store_quota_status 狀態可正常回傳
- 可用於呼叫 /api/nearby-facilities 測試 NOT_IMPLEMENTED 或等價保守結果

## 檢查方式

本階段採用既有文件與既有測試紀錄確認資料狀態，未直接修改或查寫 Supabase。

檢查依據：

- `docs/nearby-store-settings-initial-data-result-v1.1.6.md`
- `docs/nearby-facilities-cache-skeleton-test-result-v1.4.4.md`
- `docs/nearby-facilities-enabled-not-implemented-test-plan-v1.4.5.md`

V1.1.6 紀錄顯示 CH001 到 CH006 的 `nearby_enabled` 均為 `false`。V1.4.4 已確認 CH006 呼叫 `/api/nearby-facilities` 時回傳 `NEARBY_DISABLED`。

本階段沒有可安全使用的 access_code，也沒有由 Codex 直接連線 Supabase 查詢，因此不執行 API 實測或 Supabase 直連查詢。

## 檢查結果

### 是否找到 enabled 測試店家

- 結論：未找到

說明：

- 依目前既有文件紀錄，CH001 到 CH006 的 `nearby_enabled` 均為 `false`。
- 目前沒有符合 enabled 條件的測試店家紀錄。
- 線上 Supabase 是否已有使用者後續人工開啟的 enabled 店家，本階段未直接查詢，因此不宣稱已完成線上資料驗證。

### 候選店家

未找到可用候選店家。

- 目前沒有符合 enabled 條件的測試店家。
- 下一階段需先由使用者人工決定是否建立或啟用測試店家。
- 不得由本階段自行修改 Supabase。

候選欄位紀錄：

- storeId：無
- storeName：無
- stores.active：未確認
- nearby.enabled：未找到 true
- nearby.canSearchAddress：未確認
- nearby.status：未確認
- quota 是否正常：未確認
- 是否適合下一階段 NOT_IMPLEMENTED 測試：否

## 安全限制確認

本階段確認：

- 未修改 `api/nearby-facilities.js`
- 未修改 `api/verify-store-access.js`
- 未修改 Supabase schema
- 未修改 Supabase 資料
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

## 下一步建議

如果找到 enabled 測試店家：

```txt
V1.4.7｜enabled 店家 nearby-facilities NOT_IMPLEMENTED 人工測試
```

如果未找到 enabled 測試店家：

```txt
V1.4.6.1｜enabled 測試店家資料準備規劃
```

本階段檢查結果為未找到 enabled 測試店家，因此建議下一步先做：

```txt
V1.4.6.1｜enabled 測試店家資料準備規劃
```

該階段仍只規劃，不直接修改 Supabase。

## V1.4.6 執行結果確認

- 實際新增檔案：
  - `docs/nearby-facilities-enabled-store-data-check-v1.4.6.md`
- 實際修改檔案：無
- 是否只新增 V1.4.6 資料確認文件：是
- 是否找到 enabled 測試店家：否
- 候選 storeId / storeName：無
- 是否修改 API 檔案：否
- 是否修改 Supabase schema 或資料：否
- 是否接 Google API / Overpass：否
- 是否寫 cache / usage logs：否
- 是否部署：否

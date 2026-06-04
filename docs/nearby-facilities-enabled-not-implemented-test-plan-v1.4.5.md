# V1.4.5｜nearby-facilities enabled 店家 / NOT_IMPLEMENTED 測試規劃

## 目的

規劃 enabled 店家在 nearby-facilities skeleton 階段的測試方式，確認當店家已啟用 nearby 查詢，但 Google API 尚未接入時，API 應回傳可預期的 NOT_IMPLEMENTED 或等價保守結果。

## 背景

目前 V1.4.3 已完成 request_hash / cache lookup skeleton。

V1.4.4 已記錄 CH006 測試結果：

- CH006 nearby.enabled = false
- nearby.canSearchAddress = false
- API 回傳 NEARBY_DISABLED
- 未呼叫 Google API
- 未呼叫 Overpass
- 未寫 cache
- 未寫 usage logs

下一步需要規劃 enabled 店家的測試，但仍不得接 Google API 或 Overpass。

## 測試範圍

本階段只規劃測試，不實作 Google API。

測試目標：

1. 找一個 nearby.enabled = true 的測試店家
2. 使用有效 access_code 呼叫 /api/nearby-facilities
3. 確認 API 不會呼叫 Google API
4. 確認 API 不會呼叫 Overpass
5. 確認 API 不寫 nearby_cache
6. 確認 API 不寫 usage logs
7. 確認 API 回傳 NOT_IMPLEMENTED 或等價保守結果
8. 確認 runtimeVersion 維持目前 skeleton 版本或後續明確版本

## 預期回傳方向

如果店家 enabled，但正式 Google 查詢尚未實作，建議回傳：

- success：false
- reason：NOT_IMPLEMENTED
- message：Nearby search is enabled, but provider lookup is not implemented yet.
- source：nearby-facilities-api
- runtimeVersion：nearby-facilities-v1.4.3-cache-lookup-skeleton 或後續明確版本
- facilities：{}
- summary：[]
- nearby.enabled：true
- nearby.canSearchAddress：依資料庫設定回傳
- nearby.status：ENABLED 或資料庫實際狀態
- cache.hit：false 或不回傳 cache 命中
- provider.called：false，如目前沒有 provider 欄位則不強制新增

## 測試前資料需求

需要先確認 Supabase 是否已有一個測試店家符合：

- stores.active = true
- access_code 有效
- nearby_store_settings.enabled = true
- nearby_store_settings.can_search_address = true 或至少 enabled = true
- quota 狀態正常

若沒有 enabled 測試店家，本階段只記錄「尚缺 enabled 測試資料」，不要自行修改資料庫。

## 不可做事項

- 不要修改 api/nearby-facilities.js
- 不要修改 api/verify-store-access.js
- 不要接 Google API
- 不要呼叫 Google Geocoding API
- 不要呼叫 Google Places API
- 不要呼叫 Overpass
- 不要寫 nearby_cache
- 不要寫 usage logs
- 不要修改 Supabase schema
- 不要修改 Supabase 資料
- 不要修改 Vercel env
- 不要寫入 API Key
- 不要新增 dependency
- 不要部署

## 下一步建議

V1.4.6｜enabled 測試店家資料確認

該階段只確認是否存在 enabled 測試店家與必要欄位，不修改 API、不接外部服務。

## V1.4.5 執行結果確認

- 實際新增檔案：
  - `docs/nearby-facilities-enabled-not-implemented-test-plan-v1.4.5.md`
- 實際修改檔案：無
- 是否修改 API 檔案：否
- 是否接 Google API：否
- 是否接 Overpass：否
- 是否寫 nearby_cache：否
- 是否寫 usage logs：否
- 是否修改 Supabase 資料或 schema：否
- 是否修改 Vercel env：否
- 是否部署：否

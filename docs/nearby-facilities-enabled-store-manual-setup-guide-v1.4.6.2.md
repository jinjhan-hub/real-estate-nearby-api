# V1.4.6.2｜enabled 測試店家人工建立指引

## 目的

建立一份給使用者人工操作用的 Supabase 測試店家建立 / 啟用指引。

本階段只提供人工操作步驟與檢查清單，不直接修改 Supabase，不提供可直接執行的 SQL，不寫入 access_code，不建立任何測試店家。

## 背景

目前進度：

- V1.2 已完成 verify-store-access Supabase 認證
- V1.4.1 已完成 nearby-facilities 安全 skeleton
- V1.4.3 已完成 request_hash / cache lookup skeleton
- V1.4.4 已記錄 CH006 disabled 測試通過
- V1.4.5 已完成 enabled 店家 / NOT_IMPLEMENTED 測試規劃
- V1.4.6 已確認依既有文件 CH001 到 CH006 皆為 nearby_enabled = false
- V1.4.6.1 已完成 enabled 測試店家資料準備規劃

目前缺少一筆可安全用於 enabled 測試的店家資料。

## 建議方式

建議使用者人工在 Supabase 後台準備一筆「專用測試店家」，不要直接啟用正式店家。

建議測試店家：

- storeId：TEST_NEARBY_ENABLED
- storeName：周邊機能測試店
- active：true
- access_code：由使用者人工設定，不寫入文件、不 commit
- nearby.enabled：true
- nearby.canSearchAddress：true
- nearby.status：ENABLED
- dailyQuota：3 或 5
- monthlyQuota：30 或 50
- googleDailyQuota：0
- googleMonthlyQuota：0

注意：googleDailyQuota / googleMonthlyQuota 建議先設為 0，是為了明確避免任何 Google API 費用風險。若後續要接 Google API，必須另開版本規劃。

## 人工操作前檢查

使用者進 Supabase 後台前，請先確認：

- 目前不是正式營運測試
- 不會啟用 CH001 到 CH006 正式店家
- 不會輸入 Google API Key
- 不會修改 Vercel env
- 不會部署
- 不會執行任何未知 SQL
- 不會把 access_code 貼到 GitHub 或 Markdown 文件

## Supabase 後台人工確認項目

### 1. stores

請確認是否已有測試店家。

若已有測試店家，確認：

- store_id / storeId：
- store_name / storeName：
- active：
- access_code 是否存在：
- 是否明確標示為測試用途：

若沒有測試店家，使用者可人工建立一筆測試用途店家，但本文件不提供 SQL，避免誤執行。

### 2. nearby_store_settings

請確認測試店家是否有 nearby 設定。

需要確認：

- store_id / storeId：
- enabled：true
- can_search_address：true
- status：ENABLED
- daily_quota / dailyQuota：低額測試值
- monthly_quota / monthlyQuota：低額測試值
- google_daily_quota / googleDailyQuota：0
- google_monthly_quota / googleMonthlyQuota：0

### 3. nearby_store_quota_status

請確認測試店家的 quota 狀態是否能正常被查詢。

需要確認：

- today_used / todayUsed：
- month_used / monthUsed：
- today_remaining / todayRemaining：
- month_remaining / monthRemaining：
- google_today_used / googleTodayUsed：
- google_month_used / googleMonthUsed：
- google_today_remaining / googleTodayRemaining：
- google_month_remaining / googleMonthRemaining：

若此表是 view 或計算結果，不要直接手動寫入，僅確認能否查到。

## 建議人工操作結果紀錄格式

使用者完成 Supabase 人工設定後，請回報以下內容，不要貼 access_code 明文：

```txt
V1.4.6.2 人工建立 / 啟用結果

1. 是否建立測試店家：是 / 否
2. storeId：
3. storeName：
4. stores.active：
5. nearby.enabled：
6. nearby.canSearchAddress：
7. nearby.status：
8. dailyQuota：
9. monthlyQuota：
10. googleDailyQuota：
11. googleMonthlyQuota：
12. quota status 是否可查：
13. 是否有修改 CH001 到 CH006 正式店家：否
14. 是否有輸入或修改 Google API Key：否
15. 是否有修改 Vercel env：否
16. 是否有部署：否
17. access_code 是否未貼出 / 未寫入文件：是
```

## 安全注意事項

### access_code

- 不要把 access_code 寫入 Markdown
- 不要把 access_code commit 到 GitHub
- 不要在對話中完整貼出 access_code
- 若需要測試，可在本機 PowerShell 使用環境變數或臨時變數

### Google API

本階段不接 Google API。

不得：

- 新增 GOOGLE_MAPS_API_KEY
- 新增 Places API Key
- 呼叫 Geocoding
- 呼叫 Places
- 設定正式 Google quota
- 部署任何 Google API 相關改動

### 正式店家

不建議修改：

- CH001
- CH002
- CH003
- CH004
- CH005
- CH006

若真的要使用既有店家測試，必須由使用者明確指定，並另開文件紀錄原因。

## 完成後驗證方向

完成人工資料準備後，下一階段應先做：

```txt
V1.4.6.3｜enabled 測試店家資料建立結果紀錄
```

該階段只記錄使用者回報的人工設定結果，不直接連線修改 Supabase。

再下一階段才進：

```txt
V1.4.7｜enabled 店家 nearby-facilities NOT_IMPLEMENTED 人工測試
```

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

```txt
V1.4.6.3｜enabled 測試店家資料建立結果紀錄
```

此階段要等使用者人工在 Supabase 後台完成設定後，再將結果記錄成文件。

## V1.4.6.2 執行結果確認

- 實際新增檔案：
  - `docs/nearby-facilities-enabled-store-manual-setup-guide-v1.4.6.2.md`
- 實際修改檔案：無
- 是否只新增 V1.4.6.2 人工建立指引文件：是
- 是否修改 API 檔案：否
- 是否修改 Supabase schema 或資料：否
- 是否建立或啟用測試店家：否
- 是否修改 CH001 到 CH006：否
- 是否接 Google API / Overpass：否
- 是否寫 cache / usage logs：否
- 是否寫入 access_code：否
- 是否部署：否

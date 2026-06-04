# V1.4.6.2-SQL｜enabled 測試店家 SQL 草稿文件

## 目的

建立一份保守的 SQL 草稿文件，供使用者人工檢查 Supabase 資料表結構後，再判斷是否適合準備 enabled 測試店家。

本文件只提供草稿與檢查方向，不由 Codex 執行 SQL，不直接修改 Supabase，不建立測試店家，不啟用任何店家，不寫入 access_code。

## 背景

目前進度：

- V1.2 已完成 verify-store-access Supabase 認證
- V1.4.1 已完成 nearby-facilities 安全 skeleton
- V1.4.3 已完成 request_hash / cache lookup skeleton
- V1.4.4 已記錄 CH006 disabled 測試通過
- V1.4.5 已完成 enabled 店家 / NOT_IMPLEMENTED 測試規劃
- V1.4.6 已依既有文件確認 CH001 到 CH006 皆為 nearby_enabled = false
- V1.4.6.1 已完成 enabled 測試店家資料準備規劃
- V1.4.6.2 已完成 enabled 測試店家人工建立指引
- V1.4.6.3 尚未取得可確認的 enabled 測試店家人工建立結果

目前仍缺少一筆可安全用於 enabled / NOT_IMPLEMENTED 測試的店家資料。

## 重要限制

本文件中的 SQL 只作為人工審核草稿。

在執行任何 SQL 前，使用者必須先確認：

- table 名稱正確
- 欄位名稱正確
- `stores` 主鍵或 unique key 設定正確
- `nearby_store_settings` 欄位名稱正確
- `nearby_store_quota_status` 是 table 或 view
- access_code 由使用者在 Supabase 後台人工處理，不寫入文件
- 不影響 CH001 到 CH006 正式店家
- 不接 Google API
- 不產生費用

## 建議測試店家設定

建議測試店家：

- storeId：TEST_NEARBY_ENABLED
- storeName：周邊機能測試店
- active：true
- access_code：由使用者人工設定，不寫入文件
- nearby.enabled：true
- nearby.canSearchAddress：true
- nearby.status：ENABLED
- dailyQuota：3
- monthlyQuota：30
- googleDailyQuota：0
- googleMonthlyQuota：0

`googleDailyQuota` 與 `googleMonthlyQuota` 建議先設為 0，以避免任何 Google API 費用風險。

## SQL 草稿前檢查

### stores 欄位檢查草稿

```sql
-- 草稿：僅供人工檢查欄位，不由 Codex 執行
select *
from stores
limit 5;
```

需要確認：

- `store_id` 或 `storeId`
- `store_name` 或 `storeName`
- `access_code`
- `active`
- `start_at`
- `expires_at`
- `features`

### nearby_store_settings 欄位檢查草稿

```sql
-- 草稿：僅供人工檢查欄位，不由 Codex 執行
select *
from nearby_store_settings
limit 5;
```

需要確認：

- `store_id` 或 `storeId`
- `nearby_enabled` 或 `enabled`
- `can_search_address`
- `status`
- `daily_quota`
- `monthly_quota`
- `google_daily_quota`
- `google_monthly_quota`
- `allowed_radii`
- `default_radius`
- `allowed_categories`

### nearby_store_quota_status 檢查草稿

```sql
-- 草稿：僅供人工檢查欄位，不由 Codex 執行
select *
from nearby_store_quota_status
limit 5;
```

需要確認：

- 此物件是 table 或 view
- 是否可依 `store_id` 查詢
- 是否由 settings / logs 計算 quota
- 是否不應直接 insert / update

## 建立測試店家 SQL 草稿

注意：以下 SQL 是草稿，不可直接複製執行。使用者必須先依實際欄位名稱與約束條件人工調整。

### Step 1：stores 測試店家草稿

```sql
-- 草稿：請先確認欄位、約束與 access_code 處理方式
-- 不要把 access_code 寫入文件或 commit
insert into stores (
  store_id,
  store_name,
  active
)
values (
  'TEST_NEARBY_ENABLED',
  '周邊機能測試店',
  true
)
on conflict (store_id) do update
set
  store_name = excluded.store_name,
  active = excluded.active;
```

注意：

- 此草稿刻意不包含 access_code。
- 若 `stores.access_code` 是 NOT NULL，請不要直接執行此草稿。
- access_code 應由使用者在 Supabase 後台人工設定，且不得寫入文件或 GitHub。

### Step 2：nearby_store_settings 草稿

請先確認實際欄位名稱。若實際欄位使用 `nearby_enabled`，請將 `enabled` 改為 `nearby_enabled`。

```sql
-- 草稿：請先確認欄位名稱，不由 Codex 執行
insert into nearby_store_settings (
  store_id,
  enabled,
  can_search_address,
  status,
  daily_quota,
  monthly_quota,
  google_daily_quota,
  google_monthly_quota
)
values (
  'TEST_NEARBY_ENABLED',
  true,
  true,
  'ENABLED',
  3,
  30,
  0,
  0
)
on conflict (store_id) do update
set
  enabled = excluded.enabled,
  can_search_address = excluded.can_search_address,
  status = excluded.status,
  daily_quota = excluded.daily_quota,
  monthly_quota = excluded.monthly_quota,
  google_daily_quota = excluded.google_daily_quota,
  google_monthly_quota = excluded.google_monthly_quota;
```

### Step 3：quota status 檢查草稿

若 `nearby_store_quota_status` 是 view，不要 insert / update。

```sql
-- 草稿：只查詢確認，不寫入
select *
from nearby_store_quota_status
where store_id = 'TEST_NEARBY_ENABLED';
```

若查不到 quota status，應先確認 view 計算邏輯，而不是直接寫入 quota status。

## 建立後確認 SQL 草稿

```sql
-- 草稿：僅供人工確認，不由 Codex 執行
select *
from stores
where store_id = 'TEST_NEARBY_ENABLED';

select *
from nearby_store_settings
where store_id = 'TEST_NEARBY_ENABLED';

select *
from nearby_store_quota_status
where store_id = 'TEST_NEARBY_ENABLED';
```

確認重點：

- 測試店家存在
- active = true
- nearby enabled = true
- can_search_address = true
- status = ENABLED
- daily quota 與 monthly quota 為低額測試值
- Google quota 為 0
- quota status 可查詢

## 停用草稿

若需要停用測試店家，建議只停用，不建議 delete。

```sql
-- 草稿：停用測試店家，不由 Codex 執行
update nearby_store_settings
set
  enabled = false,
  can_search_address = false,
  status = 'DISABLED'
where store_id = 'TEST_NEARBY_ENABLED';

update stores
set active = false
where store_id = 'TEST_NEARBY_ENABLED';
```

注意：若實際欄位是 `nearby_enabled`，請先人工調整欄位名稱。

## 人工執行後回報格式

使用者若人工檢查或執行 SQL，請回報以下內容，不要貼 access_code：

```txt
V1.4.6.2-SQL 人工結果

1. 是否執行 SQL：是 / 否
2. 是否建立或啟用測試店家：是 / 否
3. storeId：
4. storeName：
5. stores.active：
6. nearby.enabled：
7. nearby.canSearchAddress：
8. nearby.status：
9. dailyQuota：
10. monthlyQuota：
11. googleDailyQuota：
12. googleMonthlyQuota：
13. quota status 是否可查：
14. 是否未把 access_code 貼出或寫入 GitHub：是
15. 是否未修改 CH001 到 CH006：是
16. 是否未輸入或修改 Google API Key：是
17. 是否未修改 Vercel env：是
18. 是否未部署：是
```

## 安全限制確認

本階段確認：

- 未執行 SQL
- 未修改 api/nearby-facilities.js
- 未修改 api/verify-store-access.js
- 未修改 Supabase schema
- 未修改 Supabase 資料
- 未建立 enabled 測試店家
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
- 未寫入 access_code
- 未新增 dependency
- 未部署

## 下一步建議

若使用者人工執行並成功建立 enabled 測試店家：

```txt
V1.4.6.3｜enabled 測試店家資料建立結果紀錄（更新版）
```

若仍未建立 enabled 測試店家：

```txt
暫停 V1.4.7 實測，直到 enabled 測試資料準備完成
```

目前尚不可進入 V1.4.7。

## V1.4.6.2-SQL 執行結果確認

- 實際新增檔案：
  - `docs/nearby-facilities-enabled-store-sql-draft-v1.4.6.2.md`
- 實際修改檔案：無
- 是否只新增 V1.4.6.2-SQL 草稿文件：是
- 是否執行 SQL：否
- 是否修改 API 檔案：否
- 是否修改 Supabase schema 或資料：否
- 是否建立或啟用測試店家：否
- 是否修改 CH001 到 CH006：否
- 是否接 Google API / Overpass：否
- 是否寫 cache / usage logs：否
- 是否寫入 access_code：否
- 是否部署：否
- 是否可進入 V1.4.7：否

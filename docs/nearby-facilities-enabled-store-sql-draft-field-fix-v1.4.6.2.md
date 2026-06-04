# V1.4.6.2-SQL-FIX｜enabled 測試店家 SQL 草稿欄位修正文件

## 目的

依使用者在 Supabase 後台確認的實際欄位，修正 V1.4.6.2-SQL enabled 測試店家 SQL 草稿。

本文件只提供欄位修正後的草稿與人工檢查方向，不由 Codex 執行 SQL，不直接修改 Supabase，不建立測試店家，不啟用任何店家，不寫入 access_code。

## 實際欄位確認

### stores

實際欄位：

- id
- store_id
- store_name
- access_code
- active
- start_at
- expires_at
- features
- brokerage_name
- broker_name
- broker_license_no
- created_at
- updated_at

### nearby_store_settings

實際欄位：

- id
- store_id
- nearby_enabled
- daily_quota
- monthly_quota
- allowed_radii
- default_radius
- allowed_categories
- google_daily_quota
- google_monthly_quota
- created_at
- updated_at

## 舊草稿欄位問題

舊草稿曾使用：

- enabled
- can_search_address
- status

實際欄位使用：

- nearby_enabled

實際不存在的欄位：

- can_search_address
- status

因此舊草稿不可直接執行。

## 目前資料狀態

依使用者回報：

- CH001 nearby_enabled = false
- CH002 nearby_enabled = false
- CH003 nearby_enabled = false
- CH004 nearby_enabled = false
- CH005 nearby_enabled = false
- CH006 nearby_enabled = false

目前沒有 enabled 測試店家，因此尚不可進入 V1.4.7 實測。

## 修正版 SQL 草稿前檢查

以下 SQL 仍是草稿，必須由使用者人工檢查與調整，不由 Codex 執行。

執行前請確認：

- 是否允許建立 `TEST_NEARBY_ENABLED`
- `stores.access_code` 是否需要人工補入
- `stores.access_code` 是否為 NOT NULL
- `stores.features` 是否接受 `jsonb`
- `brokerage_name` / `broker_name` / `broker_license_no` 是否必填
- `id` 是否由資料庫自動產生
- `created_at` / `updated_at` 是否由資料庫自動處理
- `nearby_store_settings.id` 是否由資料庫自動產生

## 建議測試資料

測試店家建議：

- store_id：TEST_NEARBY_ENABLED
- store_name：周邊機能測試店
- active：true
- start_at：目前日期
- expires_at：目前日期後 30 天
- features：包含 nearby_facilities
- brokerage_name：測試用公司名稱
- broker_name：測試用經紀人
- broker_license_no：測試用證號
- access_code：由使用者人工設定，不寫入文件

nearby 設定建議：

- nearby_enabled：true
- daily_quota：3
- monthly_quota：30
- allowed_radii：[500, 1000, 1500]
- default_radius：1000
- allowed_categories：["park", "school", "shopping", "transport", "medical"]
- google_daily_quota：0
- google_monthly_quota：0

## Step 1：stores SQL 草稿

```sql
-- 草稿：僅供人工檢查，不由 Codex 執行
-- 注意：access_code 不寫入本文件，請由使用者在 Supabase 後台人工設定
-- 若 access_code 為 NOT NULL，請勿直接執行此草稿

insert into stores (
  store_id,
  store_name,
  active,
  start_at,
  expires_at,
  features,
  brokerage_name,
  broker_name,
  broker_license_no
)
values (
  'TEST_NEARBY_ENABLED',
  '周邊機能測試店',
  true,
  current_date,
  current_date + interval '30 days',
  '["nearby_facilities"]'::jsonb,
  '測試用公司名稱',
  '測試用經紀人',
  '測試用證號'
)
on conflict (store_id) do update
set
  store_name = excluded.store_name,
  active = excluded.active,
  start_at = excluded.start_at,
  expires_at = excluded.expires_at,
  features = excluded.features,
  brokerage_name = excluded.brokerage_name,
  broker_name = excluded.broker_name,
  broker_license_no = excluded.broker_license_no,
  updated_at = now();
```

## Step 2：nearby_store_settings SQL 草稿

```sql
-- 草稿：僅供人工檢查，不由 Codex 執行

insert into nearby_store_settings (
  store_id,
  nearby_enabled,
  daily_quota,
  monthly_quota,
  allowed_radii,
  default_radius,
  allowed_categories,
  google_daily_quota,
  google_monthly_quota
)
values (
  'TEST_NEARBY_ENABLED',
  true,
  3,
  30,
  '[500,1000,1500]'::jsonb,
  1000,
  '["park","school","shopping","transport","medical"]'::jsonb,
  0,
  0
)
on conflict (store_id) do update
set
  nearby_enabled = excluded.nearby_enabled,
  daily_quota = excluded.daily_quota,
  monthly_quota = excluded.monthly_quota,
  allowed_radii = excluded.allowed_radii,
  default_radius = excluded.default_radius,
  allowed_categories = excluded.allowed_categories,
  google_daily_quota = excluded.google_daily_quota,
  google_monthly_quota = excluded.google_monthly_quota,
  updated_at = now();
```

## Step 3：人工驗證查詢

```sql
-- 草稿：僅供人工確認，不由 Codex 執行
select
  store_id,
  store_name,
  active,
  start_at,
  expires_at,
  features,
  brokerage_name,
  broker_name,
  broker_license_no
from stores
where store_id = 'TEST_NEARBY_ENABLED';

select
  store_id,
  nearby_enabled,
  daily_quota,
  monthly_quota,
  allowed_radii,
  default_radius,
  allowed_categories,
  google_daily_quota,
  google_monthly_quota
from nearby_store_settings
where store_id = 'TEST_NEARBY_ENABLED';

select *
from nearby_store_quota_status
where store_id = 'TEST_NEARBY_ENABLED';
```

## 注意：access_code 處理

本文件不提供 access_code 寫入 SQL。

原因：

- 避免 access_code 被 commit
- 避免 access_code 出現在文件或對話
- 避免測試資料誤用為正式憑證

若 `stores.access_code` 必填，請使用者在 Supabase 後台人工輸入，或在 SQL Editor 由使用者自行補入，不要將值貼到文件、對話或 GitHub。

## 停用草稿

```sql
-- 草稿：僅供人工檢查，不由 Codex 執行
update nearby_store_settings
set
  nearby_enabled = false,
  google_daily_quota = 0,
  google_monthly_quota = 0,
  updated_at = now()
where store_id = 'TEST_NEARBY_ENABLED';

update stores
set
  active = false,
  updated_at = now()
where store_id = 'TEST_NEARBY_ENABLED';
```

## 人工執行後回報格式

使用者若人工執行，請回報：

```txt
V1.4.6.2-SQL-FIX 人工結果

1. 是否執行 SQL：是 / 否
2. 是否建立或啟用測試店家：是 / 否
3. store_id：
4. store_name：
5. stores.active：
6. nearby_store_settings.nearby_enabled：
7. daily_quota：
8. monthly_quota：
9. google_daily_quota：
10. google_monthly_quota：
11. nearby_store_quota_status 是否可查：
12. 是否未把 access_code 貼出或寫入 GitHub：是
13. 是否未修改 CH001 到 CH006：是
14. 是否未輸入或修改 Google API Key：是
15. 是否未修改 Vercel env：是
16. 是否未部署：是
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

由使用者人工檢查並調整此 SQL 草稿。

如果人工確認 SQL 正確，且成功建立 `TEST_NEARBY_ENABLED`，下一步：

```txt
V1.4.6.3-UPDATE｜enabled 測試店家資料建立結果紀錄更新
```

如果尚未建立測試店家，仍不可進入 V1.4.7 實測。

## V1.4.6.2-SQL-FIX 執行結果確認

- 實際新增檔案：
  - `docs/nearby-facilities-enabled-store-sql-draft-field-fix-v1.4.6.2.md`
- 實際修改檔案：無
- 是否只新增 V1.4.6.2-SQL-FIX 草稿文件：是
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

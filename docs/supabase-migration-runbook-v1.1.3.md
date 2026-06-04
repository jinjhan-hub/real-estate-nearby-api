# V1.1.3 Supabase migration 執行前 runbook

建立日期：2026-06-04

## 1. 文件範圍

本文件只提供 Supabase migration 人工執行前確認、執行方式、驗證 SQL 與失敗處理流程。

本次任務不做以下事項：

- 不連線 Supabase。
- 不執行 Supabase CLI。
- 不執行 migration。
- 不建立 table。
- 不建立 view。
- 不修改 `supabase/migrations/001_create_nearby_schema.sql`。
- 不新增 migration / SQL 檔案。
- 不修改 `api/*.js`。
- 不修改 `package.json`。
- 不修改 `README.md`。
- 不修改 Vercel 環境變數。
- 不呼叫 Google API。
- 不寫入 API Key。
- 不部署。
- 不 commit。
- 不 push。

## 2. Migration 檔案位置

待人工 review 的 migration SQL：

```txt
supabase/migrations/001_create_nearby_schema.sql
```

目前 SQL 草稿包含：

- 5 張 `nearby_` table。
- 3 個 `nearby_` view。
- indexes。
- `updated_at` trigger function 與 triggers。
- usage control 補強欄位。
- `request_hash` / `api_called` / `estimated_cost_tier` / `error_message` / `note` 相關支援。

## 3. 執行前確認清單

人工執行 migration 前，請逐項確認：

1. GitHub main 已包含最新且經人工 review 的 migration SQL。
2. 本機 `git status` 已確認，了解哪些檔案尚未 commit。
3. Supabase project 已確認為正確目標 project。
4. 不在未確認的 production project 上直接嘗試。
5. SQL 中不包含真實 Google API Key。
6. SQL 中不包含 Supabase service role key。
7. SQL 中不包含真實地址或客戶資料。
8. SQL 中不包含 seed data。
9. SQL 未對既有非 nearby 資料表執行 `alter` / `drop` / `truncate` / `delete` / `update` / `insert`。
10. SQL 中的 view 只讀取 `stores`，不修改 `stores`。
11. 已準備好 rollback 或修正策略。
12. 已取得負責人確認可以進入人工執行階段。

## 4. 建議執行方式

### 方式 A：Supabase SQL Editor 人工執行

建議第一版使用 Supabase SQL Editor 由人工執行。

步驟：

1. 開啟 Supabase Dashboard。
2. 確認目前 project 正確。
3. 進入 SQL Editor。
4. 貼上 `supabase/migrations/001_create_nearby_schema.sql` 的完整內容。
5. 執行前再次搜尋以下高風險字串：

```txt
drop table
truncate
delete from
alter table stores
land_tax_
tax_price_
service_role
AIza
```

6. 確認無誤後再按 Run。
7. 執行後立即進行本文件第 5 到第 7 節的驗證 SQL。

### 方式 B：Supabase CLI migration

本文件不建議在第一版使用 Supabase CLI 直接執行。

原因：

- 目前專案尚未正式建立 CLI 執行流程。
- CLI 需要額外確認 login、project link、環境與權限。
- 第一版人工 SQL Editor 較容易逐步檢查與截圖留存。

若未來要改用 Supabase CLI，應另開任務建立 CLI runbook。

## 5. 執行後 table / view 驗證 SQL

確認 5 張 nearby table 是否存在：

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'nearby_store_settings',
    'nearby_usage_logs',
    'nearby_cache',
    'nearby_google_api_usage_logs',
    'nearby_generated_outputs'
  )
order by table_name;
```

確認 3 個 nearby view 是否存在：

```sql
select table_name
from information_schema.views
where table_schema = 'public'
  and table_name in (
    'nearby_store_usage_summary',
    'nearby_store_quota_status',
    'nearby_system_usage_summary'
  )
order by table_name;
```

確認既有 land tax / tax price table 仍存在：

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'land_tax_error_logs',
    'land_tax_temp_pdf_files',
    'land_tax_usage_logs',
    'tax_price_index_import_logs',
    'tax_price_indexes',
    'tax_price_indexes_staging'
  )
order by table_name;
```

確認 `stores` table 仍存在：

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'stores';
```

## 6. 欄位驗證 SQL

確認 `nearby_usage_logs` usage control 欄位：

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'nearby_usage_logs'
  and column_name in (
    'request_hash',
    'api_called',
    'api_name',
    'estimated_cost_tier',
    'note',
    'error_message'
  )
order by column_name;
```

確認 `nearby_cache` cache-first 欄位：

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'nearby_cache'
  and column_name in (
    'request_hash',
    'last_hit_at',
    'hit_count'
  )
order by column_name;
```

確認 `nearby_google_api_usage_logs` Google API usage 欄位：

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'nearby_google_api_usage_logs'
  and column_name in (
    'request_hash',
    'api_called',
    'estimated_cost_tier',
    'error_message',
    'note'
  )
order by column_name;
```

## 7. View 基本查詢驗證 SQL

執行後可用以下 SQL 檢查 view 是否可查詢：

```sql
select *
from nearby_store_usage_summary
limit 5;

select *
from nearby_store_quota_status
limit 5;

select *
from nearby_system_usage_summary
limit 5;
```

預期結果：

- 若尚未有 usage logs，數字可能為 0 或 null。
- view 應可正常查詢，不應報錯。
- view 不應顯示完整查詢地址。
- view 不應顯示 Google API Key 或任何 secret。

## 8. 執行後驗收條件

執行後需確認：

- 5 張 nearby table 全部存在。
- 3 個 nearby view 全部存在。
- V1.1.1 補強欄位全部存在。
- 既有 land tax / tax price table 仍存在。
- `stores` table 仍存在。
- 未新增 seed data。
- 未寫入 API Key。
- view 可正常查詢。
- view 未顯示完整地址或 secret。

## 9. 失敗處理原則

若 SQL Editor 執行失敗：

- 先停止，不要重複亂跑 SQL。
- 記錄錯誤訊息與發生位置。
- 不要把任何 API Key 或 secret 貼到錯誤回報。
- 不要執行 `drop` 既有資料表。
- 不要清空 production 資料。
- 回到 Codex / ChatGPT 進行 SQL 修正規劃。
- 需要 rollback 時，先人工確認 rollback SQL，不要臨時憑直覺操作。

## 10. 本文件不包含的工作

本文件不處理：

- 實際執行 migration。
- 設定 Vercel env。
- 呼叫 Google API。
- 修改 API。
- 建立 Admin UI。
- 建立 Admin API。
- 建立 GPTs Actions schema。
- 建立 seed data。
- 寫入 API Key。

## 11. 下一步建議

下一階段建議：

```txt
V1.1.4 Supabase migration 執行結果紀錄文件
```

說明：

- V1.1.4 應由人工執行 migration 後，回填執行結果、驗證 SQL 輸出、錯誤紀錄與是否可進入 V1.2。
- 若尚未實際執行 migration，可先暫停在 V1.1.3，不要跳到 V1.2 實作。

## V1.1.3 執行結果確認

- 實際新增檔案：
  - `docs/supabase-migration-runbook-v1.1.3.md`
- 實際修改檔案：無
- 是否修改 migration SQL：否
- 是否接觸 Supabase：否
- 是否執行 migration：否
- 是否修改現有 API：否
- 是否修改 Vercel 環境變數：否
- 是否接觸 Google API：否
- 是否寫入 API Key：否
- 是否新增 migration / SQL 檔案：否
- 是否部署：否
- 是否 commit：否
- 是否 push：否

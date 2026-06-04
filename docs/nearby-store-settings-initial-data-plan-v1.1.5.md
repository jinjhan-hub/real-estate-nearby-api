# V1.1.5 nearby_store_settings 初始資料規劃

建立日期：2026-06-04

## 1. 任務範圍

本文件僅規劃 `nearby_store_settings` 初始資料建立方式，供後續人工執行或 API 實作前確認。

本次任務不做以下事項：

- 不連線 Supabase。
- 不執行 SQL。
- 不新增 seed SQL 檔。
- 不新增 migration / SQL 檔。
- 不修改 `supabase/migrations/001_create_nearby_schema.sql`。
- 不修改 `api/*.js`。
- 不修改 `package.json`。
- 不修改 `README.md`。
- 不修改 Vercel 環境變數。
- 不呼叫 Google API。
- 不寫入 API Key。
- 不寫入真實 access_code。
- 不寫入真實地址。
- 不部署。
- 不 commit。
- 不 push。

## 2. 為什麼需要 nearby_store_settings 初始資料

後續 `verify-store-access` 若改為查 Supabase，不應只查 `stores`，也需要查 `nearby_store_settings`。

原因：

- `stores` 負責店家身份、啟用狀態與認證資料。
- `nearby_store_settings` 負責周邊機能功能設定與 quota。
- 店家認證 API 需要知道該店是否啟用 nearby 功能。
- 店家認證 API 需要回傳今日 / 本月剩餘查詢次數。
- Google API 成本控管需要每間店的 Google API daily / monthly quota。
- 若沒有 `nearby_store_settings`，API 無法判斷該店是否可使用周邊機能，也無法計算剩餘額度。

## 3. stores 與 nearby_store_settings 關係

關聯方式：

```txt
stores.store_id
-> nearby_store_settings.store_id
```

規劃原則：

- `stores` 是主店家表。
- `nearby_store_settings` 是每間店的周邊機能設定表。
- `nearby_store_settings.store_id` 應對應 `stores.store_id`。
- `nearby_store_settings.store_id` 應保持唯一。
- 不把 nearby 功能設定欄位塞回 `stores`。
- 初始資料建議只針對 active stores 建立。
- inactive 或 expired store 不應預設啟用 nearby。

## 4. 初始欄位建議

| 欄位 | 初始建議值 | 說明 |
|---|---|---|
| `store_id` | 來自 `stores.store_id` | 對應店家主資料，不使用 access_code |
| `nearby_enabled` | `false` | 第一版先安全關閉，人工確認後再開啟 |
| `daily_quota` | `30` | 每店每日查詢次數上限 |
| `monthly_quota` | `600` | 每店每月查詢次數上限 |
| `allowed_radii` | `[500, 1000, 1500]` | 預留半徑選項 |
| `default_radius` | `1000` | 第一版固定 1000 公尺 |
| `allowed_categories` | `['park', 'school', 'shopping', 'transport', 'medical']` | 第一版支援分類 |
| `google_daily_quota` | `50` | 每店每日 Google API 實際呼叫上限，建議保守起步 |
| `google_monthly_quota` | `1000` | 每店每月 Google API 實際呼叫上限，建議保守起步 |

補充：

- `nearby_enabled = false` 是安全預設，避免初始資料建立後所有 active stores 立刻可用。
- `google_daily_quota` 可視測試結果由 `50` 調整到 `100`。
- `google_monthly_quota` 可視正式用量由 `1000` 調整到 `3000`。
- 所有 quota 都應先保守設定，再由 Admin 流程或人工審核調整。

## 5. 初始資料建立方式選項

### 方式 A：人工 SQL Insert

優點：

- 第一版最快。
- 適合少量店家。
- 容易由人工在 Supabase SQL Editor 檢查後執行。

缺點：

- 需要人工操作。
- 若店家持續新增，需要重複執行或另做管理流程。

建議：第一版採用方式 A，但 V1.1.5 不實際執行。

### 方式 B：Admin API 建立 / 更新

優點：

- 未來可搭配 Admin UI。
- 可控管誰能新增或修改店家設定。
- 可留下管理操作紀錄。

缺點：

- 需要先建立 Admin API。
- 第一版實作成本較高。

建議：放到 Admin Dashboard API / Admin UI 階段處理。

### 方式 C：正式 seed SQL

優點：

- 可版本化。
- 適合固定測試資料或 demo 資料。

缺點：

- 不可放入真實 access_code。
- 不適合直接管理 production 店家資料。
- 容易誤把環境資料寫進 repo。

建議：目前不建立 seed SQL 檔。若未來需要，應另開任務專門規劃。

## 6. 建議人工 Insert SQL 範例

以下只是規劃範例，不是本次執行內容。

```sql
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
select
  s.store_id,
  false as nearby_enabled,
  30 as daily_quota,
  600 as monthly_quota,
  array[500, 1000, 1500] as allowed_radii,
  1000 as default_radius,
  array['park', 'school', 'shopping', 'transport', 'medical'] as allowed_categories,
  50 as google_daily_quota,
  1000 as google_monthly_quota
from stores s
where s.active = true
on conflict (store_id) do nothing;
```

注意事項：

- `nearby_enabled` 預設為 `false`，避免一次開通所有店家。
- 只針對 `stores.active = true` 的店家建立設定。
- 不使用 access_code。
- 不寫入 Google API Key。
- 不寫入 Supabase service role key。
- 不寫入真實地址。
- 實際執行前應先查詢會影響哪些 `store_id`。

## 7. 啟用單一店家 SQL 範例

以下只是 placeholder 範例，不是本次執行內容。

```sql
update nearby_store_settings
set nearby_enabled = true,
    updated_at = now()
where store_id = '<STORE_ID>';
```

注意事項：

- `<STORE_ID>` 必須由人工確認。
- 不使用 access_code。
- 不把 access_code 寫入文件。
- 不建議一次大量啟用。
- 正式啟用前應確認該店家有權使用周邊機能。

## 8. 驗證 SQL 範例

檢查 active stores 是否都有 nearby settings：

```sql
select s.store_id, s.store_name
from stores s
left join nearby_store_settings nss
  on nss.store_id = s.store_id
where s.active = true
  and nss.store_id is null
order by s.store_id;
```

檢查店家設定結果：

```sql
select
  s.store_id,
  s.store_name,
  nss.nearby_enabled,
  nss.daily_quota,
  nss.monthly_quota,
  nss.google_daily_quota,
  nss.google_monthly_quota,
  nss.default_radius,
  nss.allowed_radii,
  nss.allowed_categories
from stores s
left join nearby_store_settings nss
  on nss.store_id = s.store_id
order by s.store_id;
```

檢查 quota view：

```sql
select *
from nearby_store_quota_status
order by store_id;
```

## 9. 安全原則

- 不寫入真實 access_code。
- 不把 access_code 當作 setting 關聯 key。
- 不把 Google API key 寫入 SQL。
- 不把 Supabase service role key 寫入文件或前端。
- 不預設啟用所有店家的 nearby 功能。
- 不修改 `stores` 表結構。
- 不修改既有 land tax / tax price 相關資料表。
- 不在 repo 建立含 production 店家資料的 seed 檔。

## 10. 對後續 API 的影響

未來 `verify-store-access` API 建議流程：

1. 查 `stores`。
2. 驗證 `access_code`。
3. 確認 `stores.active = true`。
4. 確認店家尚未過期。
5. 查 `nearby_store_settings`。
6. 若沒有設定，回傳 nearby 功能未設定或 disabled。
7. 若 `nearby_enabled = false`，回傳附近機能功能未啟用。
8. 若 enabled，回傳：
   - 今日剩餘查詢次數。
   - 本月剩餘查詢次數。
   - 今日 Google API 剩餘次數。
   - 本月 Google API 剩餘次數。
   - 允許半徑。
   - 預設半徑。
   - 允許分類。

這表示 V1.2 重構店家認證 API 前，應先完成附近機能設定資料的建立策略。

## 11. 是否需要新增 migration

目前不需要新增 migration。

原因：

- `nearby_store_settings` table 已建立。
- 必要欄位已存在。
- 初始資料建立屬於 seed / admin 設定流程，不屬於 schema migration。
- 後續若需要正式 seed 或 admin 設定流程，應另開任務規劃，不要混入 schema migration。

## 12. 下一步建議

建議下一步：

```txt
V1.1.6｜nearby_store_settings 初始資料執行規劃與結果紀錄
```

原因：

- V1.2 API 需要依據 `nearby_store_settings` 計算 quota。
- 若沒有初始設定資料，API 無法正確回傳是否啟用 nearby 與剩餘額度。
- V1.1.6 可專門處理人工執行計畫、執行結果與驗證紀錄。

## V1.1.5 執行結果確認

- 實際新增檔案：
  - `docs/nearby-store-settings-initial-data-plan-v1.1.5.md`
- 實際修改檔案：無
- 是否修改 migration SQL：否
- 是否接觸 Supabase：否
- 是否執行 SQL：否
- 是否修改現有 API：否
- 是否修改 Vercel 環境變數：否
- 是否接觸 Google API：否
- 是否寫入 API Key：否
- 是否寫入 access_code：否
- 是否新增 seed SQL 檔：否
- 是否部署：否
- 是否 commit：否
- 是否 push：否

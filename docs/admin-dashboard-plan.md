# V0.3 Admin Dashboard 規劃文件

建立日期：2026-06-04

## 1. V0.3 任務範圍

V0.3 只規劃 Admin Dashboard 第一版需要顯示的資訊、資料來源、登入方式、Admin API 草案與安全邊界。

本階段只新增本 Markdown 文件：

```txt
docs/admin-dashboard-plan.md
```

本階段不做以下事項：

- 不修改 `api/*.js`
- 不修改 `package.json`
- 不修改 `README.md`
- 不接 Supabase
- 不接 Google API
- 不建立 Supabase table / view / policy / trigger
- 不新增 migration
- 不新增 SQL 檔
- 不部署
- 不 commit
- 不 push

## 2. Admin Dashboard 第一版定位

Admin Dashboard 第一版定位為「只讀監控頁」，主要用來讓管理者快速掌握周邊機能查詢系統的使用狀況、店家額度狀態、Google API 實際消耗與 cache 命中情況。

第一版目標：

- 看系統總使用量。
- 看每間店的今日 / 本月使用情況。
- 看 Google API 實際呼叫次數與剩餘額度。
- 看 cache 是否有效降低 Google API 呼叫。
- 看最後更新時間，避免誤判資料新舊。

第一版不是營運後台，也不是店家管理系統。因此不提供新增店家、修改額度、刪除資料、圖表、CSV 匯出或完整查詢紀錄列表。

## 3. 登入方式規劃

第一版先採用簡易保護，不使用 Supabase Auth。

可選環境變數：

```txt
ADMIN_DASHBOARD_PASSWORD
```

或：

```txt
ADMIN_DASHBOARD_TOKEN
```

建議方向：

- 第一版可以用 `ADMIN_DASHBOARD_TOKEN` 保護 Admin API。
- 若未來有簡易頁面，可由登入區輸入 password / token。
- 前端登入後只保存短期 session 狀態，不保存長期敏感 token。
- 不在 GPTs、前端公開頁面或 client-side bundle 暴露 Supabase service role key。
- 不使用 Supabase Auth，避免 V0.3 過早引入帳號、角色與 RLS 複雜度。

第一版登入流程草案：

1. 管理者打開 Admin Dashboard。
2. 頁面顯示登入區。
3. 管理者輸入 password 或 token。
4. 前端呼叫 Admin summary endpoint。
5. Vercel Admin API 驗證 `ADMIN_DASHBOARD_PASSWORD` 或 `ADMIN_DASHBOARD_TOKEN`。
6. 驗證成功後回傳 dashboard JSON。
7. 驗證失敗時回傳 `401` 或 `403`。

## 4. Admin UI 不直接連 Supabase 的原則

Admin UI 不應直接連 Supabase。

原因：

- 避免在瀏覽器暴露 Supabase service role key。
- 避免 Admin UI 直接繞過 API 層權限檢查。
- 避免將 quota、cache、usage logs 的商業規則分散在前端。
- 方便未來集中控管 admin 權限、查詢遮罩與審計紀錄。

建議架構：

```txt
Admin UI
-> Vercel Admin API
-> Supabase server-side query
-> 回傳整理後 JSON
-> Admin UI 顯示
```

第一版 Admin UI 只讀取 Vercel Admin API 回傳的彙整資料，不直接查詢 Supabase table 或 view。

## 5. Admin API 規劃

第一版可採兩種設計。

### 方案 A：拆成兩個 endpoint

```txt
/api/admin/nearby-dashboard-summary
/api/admin/nearby-store-usage
```

`/api/admin/nearby-dashboard-summary` 用途：

- 回傳系統總覽。
- 回傳 Google API 額度摘要。
- 回傳 cache 命中摘要。
- 回傳最後更新時間。

`/api/admin/nearby-store-usage` 用途：

- 回傳每間店的使用狀況。
- 回傳每間店今日 / 本月剩餘額度。
- 回傳每間店 cache 次數與 Google API 呼叫次數。

### 方案 B：合併成單一 admin summary endpoint

```txt
/api/admin/nearby-dashboard-summary
```

單一 endpoint 用途：

- 一次回傳系統總覽與店家使用表。
- 第一版前端較容易實作。
- 減少 admin token 驗證與 API 往返次數。

第一版建議採方案 B：合併為單一 admin summary endpoint。等資料量變大或 Dashboard 模組變多後，再拆成多個 endpoint。

## 6. 第一版 Dashboard 顯示欄位

系統總覽欄位：

- 今日總查詢次數
- 本月總查詢次數
- 今日 Google API 實際呼叫次數
- 本月 Google API 實際呼叫次數
- 今日系統 Google API 剩餘額度
- 本月系統 Google API 剩餘額度

每間店使用狀況欄位：

- 每間店今日使用次數
- 每間店本月使用次數
- 每間店今日剩餘次數
- 每間店本月剩餘次數
- 每間店 cache 次數
- 每間店 Google API 呼叫次數
- 每間店最後使用時間

顯示原則：

- 第一版不顯示完整查詢地址。
- 如需顯示地址，只顯示 `query_address_masked` 類型的遮罩地址。
- 第一版不顯示單筆完整查詢紀錄列表。
- 第一版只顯示彙整後資訊。

## 7. 第一版不顯示完整查詢地址

第一版 Dashboard 不顯示完整查詢地址。

原因：

- 地址可能涉及個資或客戶隱私。
- Admin Dashboard 第一版只需要監控用量與系統健康，不需要看完整地址。
- 完整地址若未做權限、遮罩與稽核設計，會增加資料外洩風險。

可接受顯示：

- 遮罩地址，例如只顯示行政區或部分路名。
- cache key 不直接顯示，除非已遮罩或 hash。
- 店家層級彙整數字。

不建議顯示：

- 完整地址。
- 完整 lat / lng 細節列表。
- 單筆查詢完整 raw request。
- Google Places 原始 response。

## 8. 第一版不做功能

第一版不做：

- 不做新增店家。
- 不做修改額度。
- 不做刪除資料。
- 不做圖表。
- 不做 CSV 匯出。
- 不做完整地址查詢紀錄列表。
- 不做 Supabase Auth。
- 不做角色權限管理。
- 不做資料表編輯功能。
- 不做 Google API key 管理。

第一版只做只讀式 dashboard 規劃。

## 9. Admin Dashboard 頁面區塊規劃

### 登入區

用途：

- 輸入 `ADMIN_DASHBOARD_PASSWORD` 或 `ADMIN_DASHBOARD_TOKEN`。
- 驗證通過後顯示 Dashboard。
- 驗證失敗時顯示簡短錯誤。

第一版欄位：

- Password / token input
- Login button
- Error message

### 系統總覽卡

用途：

- 快速看整體查詢量與 Google API 使用量。

顯示內容：

- 今日總查詢次數
- 本月總查詢次數
- 今日 Google API 實際呼叫次數
- 本月 Google API 實際呼叫次數
- 今日系統 Google API 剩餘額度
- 本月系統 Google API 剩餘額度

### 店家使用狀況表

用途：

- 查看每間店的用量與剩餘額度。

顯示欄位：

- 店家代號
- 店家名稱
- 今日使用次數
- 本月使用次數
- 今日剩餘次數
- 本月剩餘次數
- cache 次數
- Google API 呼叫次數
- 最後使用時間

### Google API 成本控管區

用途：

- 檢查系統 Google API 額度是否接近上限。
- 協助判斷是否需要調整 quota、cache TTL 或分類查詢策略。

顯示內容：

- 今日 Google API 實際呼叫次數
- 本月 Google API 實際呼叫次數
- 今日剩餘額度
- 本月剩餘額度
- Google API 使用狀態：正常 / 接近上限 / 已達上限

### cache 命中狀態區

用途：

- 檢查 cache 是否有效降低 Google API 消耗。

顯示內容：

- 今日 cache hit 次數
- 本月 cache hit 次數
- 今日 cache hit rate
- 本月 cache hit rate
- cache miss 後 Google API 呼叫次數

### 最後更新時間

用途：

- 讓管理者知道 Dashboard 資料的新鮮度。

顯示內容：

- `lastUpdatedAt`
- API 回傳時間
- 可選：資料統計基準時區，例如 `Asia/Taipei`

## 10. Admin API 回傳 JSON 草案

第一版單一 endpoint 回傳草案：

```json
{
  "ok": true,
  "source": "nearby-admin-dashboard",
  "timezone": "Asia/Taipei",
  "lastUpdatedAt": "2026-06-04T12:00:00+08:00",
  "systemSummary": {
    "todayTotalQueries": 128,
    "monthTotalQueries": 2300,
    "todayGoogleApiCalls": 64,
    "monthGoogleApiCalls": 1120,
    "systemGoogleDailyQuota": 500,
    "systemGoogleMonthlyQuota": 10000,
    "todayGoogleRemaining": 436,
    "monthGoogleRemaining": 8880
  },
  "cacheSummary": {
    "todayCacheHits": 72,
    "monthCacheHits": 1180,
    "todayCacheMisses": 56,
    "monthCacheMisses": 940,
    "todayCacheHitRate": 0.56,
    "monthCacheHitRate": 0.56
  },
  "googleApiSummary": {
    "status": "normal",
    "todayCalls": 64,
    "monthCalls": 1120,
    "todayRemaining": 436,
    "monthRemaining": 8880
  },
  "stores": [
    {
      "storeId": "CH001",
      "storeName": "店家名稱",
      "nearbyEnabled": true,
      "todayUsageCount": 12,
      "monthUsageCount": 210,
      "dailyQuota": 30,
      "monthlyQuota": 600,
      "todayRemaining": 18,
      "monthRemaining": 390,
      "todayCacheCount": 8,
      "monthCacheCount": 120,
      "todayGoogleApiCount": 4,
      "monthGoogleApiCount": 90,
      "lastUsedAt": "2026-06-04T11:45:00+08:00"
    }
  ],
  "warnings": []
}
```

驗證失敗回傳草案：

```json
{
  "ok": false,
  "error": "UNAUTHORIZED",
  "message": "Admin token is invalid."
}
```

資料尚未建立或無資料回傳草案：

```json
{
  "ok": true,
  "source": "nearby-admin-dashboard",
  "timezone": "Asia/Taipei",
  "lastUpdatedAt": "2026-06-04T12:00:00+08:00",
  "systemSummary": {
    "todayTotalQueries": 0,
    "monthTotalQueries": 0,
    "todayGoogleApiCalls": 0,
    "monthGoogleApiCalls": 0,
    "systemGoogleDailyQuota": 0,
    "systemGoogleMonthlyQuota": 0,
    "todayGoogleRemaining": 0,
    "monthGoogleRemaining": 0
  },
  "cacheSummary": {
    "todayCacheHits": 0,
    "monthCacheHits": 0,
    "todayCacheMisses": 0,
    "monthCacheMisses": 0,
    "todayCacheHitRate": 0,
    "monthCacheHitRate": 0
  },
  "googleApiSummary": {
    "status": "not_configured",
    "todayCalls": 0,
    "monthCalls": 0,
    "todayRemaining": 0,
    "monthRemaining": 0
  },
  "stores": [],
  "warnings": [
    "No nearby usage data found."
  ]
}
```

## 11. 權限與安全風險

主要風險：

- Admin token 若外洩，可能看到店家用量與系統用量。
- 若 Admin UI 直接連 Supabase，可能暴露 service role key。
- 若顯示完整地址，可能造成客戶隱私風險。
- 若第一版加入修改功能，可能誤改 quota 或店家狀態。
- 若顯示 Google API key 或 env 值，會造成嚴重安全風險。

第一版控管方式：

- 使用 `ADMIN_DASHBOARD_PASSWORD` 或 `ADMIN_DASHBOARD_TOKEN` 做簡易保護。
- Admin API 僅回傳彙整資料。
- 不回傳完整查詢地址。
- 不回傳 Supabase key。
- 不回傳 Google API key。
- 不提供新增、修改、刪除功能。
- 不提供 raw logs 全量列表。
- Admin UI 不直接連 Supabase。

後續若進入 V1.6 / V1.7，可再評估：

- 更完整的 admin session 管理。
- IP allowlist。
- audit logs。
- token rotation。
- 分級權限。
- 操作型功能與唯讀功能分離。

## 12. V1.6 Admin Dashboard API 與 V1.7 Admin UI 切分

### V1.6 Admin Dashboard API

V1.6 建議負責 server-side API 實作。

範圍：

- 建立 `/api/admin/nearby-dashboard-summary`。
- 驗證 `ADMIN_DASHBOARD_PASSWORD` 或 `ADMIN_DASHBOARD_TOKEN`。
- server-side 查詢 Supabase。
- 彙整 system summary。
- 彙整 store usage。
- 彙整 cache summary。
- 彙整 Google API usage summary。
- 遮罩敏感資料。
- 回傳 Dashboard JSON。

V1.6 不做完整 UI。

### V1.7 Admin UI

V1.7 建議負責前端 Dashboard 實作。

範圍：

- 建立登入區。
- 呼叫 V1.6 Admin API。
- 顯示系統總覽卡。
- 顯示店家使用狀況表。
- 顯示 Google API 成本控管區。
- 顯示 cache 命中狀態區。
- 顯示最後更新時間。
- 顯示 API 錯誤或權限錯誤。

V1.7 不直接連 Supabase。

## 13. 下一階段 V0.4 建議

下一階段建議：

```txt
V0.4 Google API 與成本控管規劃文件
```

建議新增文件：

```txt
docs/google-api-cost-control-plan.md
```

V0.4 建議規劃內容：

- Google Geocoding API 使用時機。
- Google Places API 使用時機。
- 每次查詢可能產生的 Google API 呼叫次數。
- cache hit 時如何避免呼叫 Google API。
- cache miss 時如何記錄 Google API usage logs。
- 系統層級 Google API daily / monthly quota。
- 店家層級 Google API daily / monthly quota。
- Google API 接近上限時的阻擋策略。
- Google API error handling。
- 不接 Google API、不修改 API、不修改 env 的執行邊界。

## V0.3 執行結果確認

- 實際新增檔案：
  - `docs/admin-dashboard-plan.md`
- 是否修改既有檔案：否
- 是否刪除檔案：否
- 是否修改現有 API 行為：否
- 是否接觸 Google API：否
- 是否接觸 Supabase：否
- 是否修改 Vercel 環境變數：否
- 是否建立資料表 / view / policy / trigger：否
- 是否新增 migration / SQL 檔：否
- 是否部署：否
- 是否 commit：否
- 是否 push：否

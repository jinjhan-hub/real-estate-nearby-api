# 房地產周邊機能查詢 GPTs 專案 Roadmap

建立日期：2026-06-04

## 1. 專案目標

本專案目標是建立一套可支援分店認證、額度控管、周邊查詢與內容輸出的 GPTs API 系統。

預期流程：

```txt
GPTs
-> Vercel API
-> Supabase 店家認證 / 額度 / logs / 周邊 cache
-> Google Geocoding API + Google Places API
-> 回傳 GPTs
-> 產出可供房仲使用的周邊機能內容
```

周邊分類：

```txt
park：公園
school：學校
shopping：購物 / 商圈
transport：交通
medical：醫療
```

第一版預設查詢半徑：

```txt
1000 公尺
```

未來預留半徑：

```txt
500 / 1000 / 1500 公尺
```

## 2. 目前方向

1. 第一版不再使用目前 `nearby-facilities.js` 的 Overpass 查詢作為新版主流程。
2. 新版希望使用使用者輸入地址，由 API 端進行 geocoding。
3. 店家驗證後，才允許查詢周邊機能與計算每日 / 每月剩餘次數。
4. 第一版預設查詢半徑為 1000 公尺。
5. 未來資料結構預留 500 / 1000 / 1500 公尺。
6. 不使用 Overpass 作為新版主流程。
7. 新版方向使用 Google Geocoding API + Google Places API。
8. Supabase cache 用來避免重複呼叫 Google API。
9. 每次查詢需記錄店家用量。
10. Admin UI 需要能顯示用量、額度、cache 與 Google API 使用狀況。
11. 不另開新的 Supabase database，而是使用既有 Supabase project。
12. 既有稅務相關資料表不可被修改。
13. 新增周邊機能相關資料表時，應使用 `nearby_` 前綴。
14. Admin UI 不直接連 Supabase，應透過 Vercel Admin API。
15. GPTs 不直接連 Supabase。

## 3. 已完成階段

```txt
V0.1：Repo 盤點與 Legacy 分類
狀態：已完成
文件：docs/api-inventory-review.md

V0.2：Supabase Schema 規劃文件
狀態：已完成
文件：docs/supabase-nearby-schema-plan.md
```

## 4. 階段 Roadmap

```txt
V0.3：Admin Dashboard 規劃文件
V0.4：Google API 成本與安全規劃文件
V1.0：建立 Supabase nearby_* schema
V1.1：重寫店家認證 API
V1.2：重寫周邊查詢 API
V1.3：加入 Supabase cache
V1.4：加入 Google API 額度控管
V1.5：GPTs Actions Schema
V1.6：Admin Dashboard API
V1.7：Admin UI
V1.8：GPTs 測試與上線檢查
```

## 5. 階段原則

- V0.x 只做規劃文件。
- V1.0 才開始建立新版 Supabase schema。
- V1.1 才開始修改店家認證 API。
- V1.2 才開始修改周邊查詢 API。
- V1.6 才開始規劃或實作 Admin API。
- V1.7 才開始規劃或實作 Admin UI。
- 每個階段只處理當階段任務，不順手修改 unrelated legacy API。

## 6. 目前下一步

下一步建議執行：

```txt
V0.3 Admin Dashboard 規劃文件
```

建議新增文件：

```txt
docs/admin-dashboard-plan.md
```

V0.3 仍應只做文件規劃，不做 UI、不改 API、不連 Supabase、不連 Google API。

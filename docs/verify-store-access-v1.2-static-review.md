# V1.2.1 店家認證 API 靜態檢查與測試計畫

## 1. 本次檢查範圍

- 檢查檔案：`api/verify-store-access.js`
- 執行語法檢查：`node --check api\verify-store-access.js`
- 本次未修改 `api/verify-store-access.js`
- 本次未修改 `api/nearby-facilities.js`
- 本次未修改 `package.json`
- 本次未修改 `README.md`
- 本次未修改 migration SQL
- 本次未連線 Supabase
- 本次未執行實際 Supabase 查詢
- 本次未接 Google API
- 本次未部署、未 commit、未 push

## 2. 語法檢查結果

`node --check api\verify-store-access.js` 檢查通過，未發現 JavaScript 語法錯誤。

## 3. 靜態檢查項目

| 檢查項目 | 結論 | 備註 |
| --- | --- | --- |
| 是否使用 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | A | 程式以 server-side env 讀取 Supabase URL 與 service role key。 |
| 是否查 `stores` | A | 以 `fetchSingleByStoreId(config, "stores", ...)` 查詢店家資料。 |
| 是否查 `nearby_store_settings` | A | 成功驗證店家後查詢 nearby 設定。 |
| 是否查 `nearby_store_quota_status` | A | 成功驗證店家後查詢 quota 狀態 view。 |
| 是否保留 store id aliases | A | 支援 `storeId`、`storeCode`、`store`、`storeNo`、`id`。 |
| 是否保留 access code aliases | A | 支援 `accessCode`、`verifyCode`、`verificationCode`、`authCode`、`password`、`code`。 |
| 是否正規化 store id | A | 使用 `normalizeStoreId()` 轉為 uppercase。 |
| 是否檢查 `active` | A | `store.active !== true` 時回傳 `STORE_DISABLED`。 |
| 是否檢查 `start_at` | A | 尚未開始時回傳 `NOT_STARTED`。 |
| 是否檢查 `expires_at` | A | 已過期時回傳 `EXPIRED`。 |
| 是否檢查 disclosure 欄位 | A | 檢查 `brokerage_name`、`broker_name`、`broker_license_no`，缺漏時回傳 `DISCLOSURE_INCOMPLETE`。 |
| 是否回傳 nearby quota | A | 回傳 daily/monthly quota、used、remaining。 |
| 是否回傳 Google quota | A | 回傳 Google daily/monthly quota、used、remaining。 |
| `nearby_enabled=false` 時是否 verified=true 但 `canSearchAddress=false` | A | `buildNearby()` 會讓 `enabled=false`、`canSearchAddress=false`、`status="DISABLED"`，不影響店家認證成功。 |
| 是否沒有碰 `nearby-facilities.js` | A | 本次靜態檢查未修改該檔案。 |
| 是否沒有接 Google API | A | 程式內未出現 Places / Geocoding / Google Maps 呼叫邏輯。 |
| 是否不回傳 `SUPABASE_SERVICE_ROLE_KEY` | A | key 僅用於 request header，未放入 response body。 |
| 是否不回傳 `SUPABASE_URL` | A | URL 僅用於組 Supabase REST endpoint，未放入 response body。 |
| 是否不回傳 `access_code` | A | `access_code` 僅用於比對，成功或失敗 response 均未回傳。 |

## 4. Response shape 檢查

成功 response 已包含：

- `verified: true`
- `success: true`
- `reason: "OK"`
- `source: "verify-store-access-api"`
- `runtimeVersion: "verify-store-access-v1.2-supabase"`
- `requestId`
- `storeId`
- `storeName`
- `active`
- `startAt`
- `expiresAt`
- `remainingDays`
- `features`
- `disclosure`
- `disclosureComplete`
- `missingDisclosure`
- `nearby`

`nearby` 已包含：

- `enabled`
- `canSearchAddress`
- `status`
- `dailyQuota`
- `monthlyQuota`
- `todayUsed`
- `monthUsed`
- `todayRemaining`
- `monthRemaining`
- `googleDailyQuota`
- `googleMonthlyQuota`
- `googleTodayUsed`
- `googleMonthUsed`
- `googleTodayRemaining`
- `googleMonthRemaining`
- `defaultRadius`
- `allowedRadii`
- `allowedCategories`

失敗 response 已維持：

- `verified: false`
- `success: false`
- `reason`
- `message`
- `requestId`

## 5. 檢查結論 A/B/C

- A：靜態檢查通過，V1.2 要求的主要欄位、查詢目標、輸入相容性與 response shape 已具備。
- B：仍需等 Vercel env、Supabase table/view 實際資料與 service role 權限完成後，才能做人工 API 測試。
- C：本次未發現需要立即修改 `api/verify-store-access.js` 的靜態問題。

## 6. 後續人工測試計畫

後續人工測試需在已設定 `SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY` 的 server-side 環境中執行，且不得將 service role key 暴露到前端。

建議測試案例：

| 測試案例 | 預期結果 |
| --- | --- |
| `GET` request | 回傳 `METHOD_NOT_ALLOWED`。 |
| `OPTIONS` request | 回傳 200 並結束。 |
| body 缺少 store id | 回傳 `MISSING_INPUT`。 |
| body 缺少 access code | 回傳 `MISSING_INPUT`。 |
| 使用各種 store id alias | 均可正規化並查詢同一店家。 |
| 使用各種 access code alias | 均可進入 access code 比對。 |
| store 不存在 | 回傳 `STORE_NOT_FOUND`。 |
| access code 錯誤 | 回傳 `INVALID_CODE`，不得回傳正確 access code。 |
| `active=false` | 回傳 `STORE_DISABLED`。 |
| `start_at` 晚於目前時間 | 回傳 `NOT_STARTED`。 |
| `expires_at` 早於目前時間 | 回傳 `EXPIRED`。 |
| disclosure 欄位缺漏 | 回傳 `DISCLOSURE_INCOMPLETE` 與 `missingDisclosure`。 |
| 找不到 `nearby_store_settings` | 回傳 `NEARBY_SETTINGS_NOT_FOUND`。 |
| `nearby_enabled=true` | 認證成功，`nearby.enabled=true`，`canSearchAddress=true`。 |
| `nearby_enabled=false` | 認證成功，`nearby.enabled=false`，`canSearchAddress=false`，`status="DISABLED"`。 |
| quota view 有資料 | 回傳今日 / 本月使用量與剩餘量。 |
| quota view 無資料 | 使用 settings quota 與 fallback 計算剩餘量。 |
| response 檢查敏感資訊 | 不得出現 `SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_URL`、`access_code` 或任何實際 key。 |

## 7. V1.2.1 執行結果確認

- 實際新增檔案：
  - `docs/verify-store-access-v1.2-static-review.md`
- 實際修改檔案：無
- 是否修改 `api/verify-store-access.js`：否
- 是否修改 `api/nearby-facilities.js`：否
- 是否修改 `package.json`：否
- 是否修改 `README.md`：否
- 是否修改 migration SQL：否
- 是否連線 Supabase：否
- 是否執行實際 Supabase 查詢：否
- 是否接 Google API：否
- 是否部署：否
- 是否寫入任何 key：否
- 是否修改 Vercel env：否
- 是否 commit：否
- 是否 push：否

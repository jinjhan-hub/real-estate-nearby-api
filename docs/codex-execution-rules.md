# Codex 執行規則規劃

建立日期：2026-06-04

## 1. 專案識別

專案名稱：

```txt
real-estate-nearby-api
```

本機專案根目錄：

```txt
C:\Users\User\Documents\real-estate-nearby-api
```

GitHub repo：

```txt
https://github.com/jinjhan-hub/real-estate-nearby-api
```

每次 Codex 開始任務前，應先確認目前工作目錄是專案根目錄，且根目錄至少包含：

```txt
package.json
README.md
api/
docs/
```

若目前目錄不是此專案根目錄，或根目錄結構不符合任務要求，應停止並回報，不得新增、修改或刪除檔案。

## 2. 任務執行原則

- 每次任務都應先閱讀 `docs/codex-task-current.md`，確認目前指定任務。
- 不得自行跳到下一階段任務。
- 任務完成後，應回報實際新增或修改的檔案。
- 不得自行 commit，除非使用者明確要求。
- 不得自行 push，除非使用者明確要求。
- 不得部署。
- 不得建立資料表。
- 不得執行未被要求的外部服務操作。
- 若任務範圍不清楚，應先停下來向使用者確認，不得自行擴大範圍。

## 3. 高風險操作禁止

以下操作除非使用者明確要求，否則一律禁止：

- 修改既有核心 API 行為。
- 修改 `api/*.js`。
- 修改 `package.json`。
- 修改 `README.md`。
- 修改 Vercel environment variables。
- 讀取、輸出或暴露 Supabase service role key。
- 讀取、輸出或暴露 Google API key。
- 建立或修改 Supabase table、view、policy、trigger。
- 建立 migration 檔案。
- 建立 SQL 檔案。
- 讓 GPTs 或前端直接連 Supabase。
- 在 quota、cache、logging 規劃完成前，直接改接 Google Places 查詢。

## 4. 文件任務規則

V0.x 任務以文件規劃為主，預設規則如下：

- 可以新增指定的 Markdown 文件。
- 可以閱讀既有文件作為背景。
- 不修改 API。
- 不建立資料表。
- 不建立 migration。
- 不連 Supabase。
- 不連 Google API。
- 不部署。

若使用者要求補強既有文件，應只修改使用者指定的文件，不得順手整理其他文件。

## 5. 實作任務規則

V1.x 之後若進入實作階段，應遵守：

- 先閱讀相關規劃文件。
- 先確認本次任務允許修改的檔案。
- 先確認是否允許新增檔案。
- 先確認是否允許連接外部服務。
- 先確認是否允許修改 env 或 secrets。
- 先確認是否需要測試與驗證。
- 不得處理 unrelated legacy API。

## 6. 回報格式

任務完成後建議使用以下格式回報：

```md
已完成 <任務名稱>

實際新增檔案：
- ...

實際修改檔案：
- ...

是否刪除檔案：否
是否修改現有 API 行為：否
是否接觸 Google API：否
是否接觸 Supabase：否
是否修改 Vercel 環境變數：否
是否建立資料表 / view / policy / trigger：否
是否新增 migration / SQL 檔：否
是否部署：否
是否 commit：否

git status --short：
```text
...
```

下一步建議：
<下一階段任務>
```

## 7. V0.2.1 文件任務結果

本次 V0.2.1 任務只建立 Codex 執行規則、專案 roadmap 與 current task 文件。

實際新增檔案：

- `docs/codex-execution-rules.md`
- `docs/project-roadmap.md`
- `docs/codex-task-current.md`

實際修改檔案：

- 無

本次未修改 API、未修改既有專案設定、未連接 Google API、未連接 Supabase、未建立資料表、未新增 migration / SQL 檔、未部署。

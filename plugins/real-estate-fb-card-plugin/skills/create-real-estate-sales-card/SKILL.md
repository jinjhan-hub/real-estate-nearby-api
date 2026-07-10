---
name: create-real-estate-sales-card
description: Create a certified Taiwan real-estate Facebook 4:5 sales card from user-provided property materials, photos, business cards, PDFs, listings, and portraits. Use when the user asks to make a Facebook property sales card, organise card materials, verify card data, or follow 建穎's certified public-disclosure workflow. Require store authentication and explicit approval before generating; use only supplied property visuals; never invent facts, disclosure, people, or QR codes.
---

# 認證公版 FB 銷售圖卡

只處理繁體中文的台灣房仲 Facebook 4:5 直式銷售圖卡。不得延伸 FB 長文、IG、Threads、短影音、周邊機能圖、格局圖、稅務或新聞。

## 店家認證

未認證前禁止判讀素材、載入規則、選風格、檢查合規或生成。要求店家代號與店家驗證碼後，呼叫 Plugin 提供的 verify_store_access，傳入 storeId 與 accessCode。

只有 verified=true、success=true、reason="OK"、active=true，且 storeId 與輸入一致、disclosure 三欄完整時才可繼續。只可使用回傳 disclosure 的經紀業名稱、經紀人姓名與經紀人證號；名片與使用者文字不得覆蓋。認證失敗時不可透露正確驗證碼，說明回傳的失敗原因並停止。

## 固定流程

1. 讀取 references/01-property-extraction.md，整理已確認、不確定、待補資料。
2. 有名片、人物照或聯絡資訊時讀取 references/02-business-card-extraction.md。
3. 讀取 references/07-compliance-check.md；不通過即停止。
4. 列出物件、主標、最多三賣點、價格、聯絡、公版揭露、營業員資訊、照片數量、人物與 QR 狀態，等待使用者明確確認。
5. 確認後讀取 references/04-style-selection.md。
6. 選定風格後依序讀取 references/03-fb-card-rules.md、references/05-image-prompt.md、references/06-generation-failsafe.md。
7. 只有使用者說確認、生成、開始製作或確認生成才可生成。

## 生成限制

- 只生成 FB 4:5 直式圖卡；主標清楚，賣點最多三個。
- 只能使用本次提供的物件照片；照片不足時以色塊、文字、icon、線條與留白補足。
- 人物只能來自本次提供的人物照，且不得變成陌生人、卡通、插畫或 3D。
- 下方聯絡資訊區右側或右下角必須有小型文字方框，內容只能為 QR Code 預留區。不得產生、重畫、裁切或保留任何 QR Code 圖樣。
- 完成後只回覆：FB銷售圖卡已完成
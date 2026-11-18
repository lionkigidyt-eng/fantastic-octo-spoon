# 《九霄仙途》架構與後續開發接續指南 (Developer & AI Handoff Guide)

本文件整理了《九霄仙途》修仙 MMORPG 網頁應用程式的完整專案結構、資料模型、戰鬥渲染機制與功能擴充規範，方便開發者或下一個 AI 代理直接閱讀並接續更新功能。

---

## 1. 技術架構與指令
- **前端框架**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- **圖示與動畫**: `lucide-react`、`motion`、原生 HTML5 Canvas 60fps 戰鬥引擎 + Web Audio API 合成音效
- **開發與建置指令**:
  - `npm run dev` — 於 `port 3000` 啟動 Vite 開發伺服器
  - `npm run lint` — 執行 `tsc --noEmit` 型別檢查
  - `npm run build` — 輸出靜態網頁應用程式至 `dist/`

---

## 2. 核心檔案地圖

| 檔案路徑 | 職責說明 |
| --- | --- |
| `src/types/game.ts` | 全部核心 TypeScript 型別：`PlayerState`、`FashionDef`、`LimitedSkinDef`、`EquipItem`、`ModalTab`、`RechargeSubTab` |
| `src/data/xianxiaData.ts` | 所有靜態配置表：職業、境界、5 大場景、怪物、世界 BOSS、副本、VIP1~15、商城、任務鏈、**時裝圖鑑 (`FASHION_CATALOG`)**、**陰陽限定外觀 (`LIMITED_SKINS`)**、**陰陽乾坤抽獎池 (`YINYANG_GACHA_POOL`)** |
| `src/utils/gameLogic.ts` | `createInitialPlayer`、`computePlayerStats`（匯總裝備、同伴、宗門、VIP、時裝、限定外觀加成）、裝備生成與戰力公式 |
| `src/utils/audio.ts` | Web Audio 仙俠音效合成器（劍氣、技能爆發、渡劫神雷、儲值/抽獎提示音） |
| `src/components/BattleCanvas.tsx` | 60fps 獨立 Canvas 戰場：背景分層、自動/手動技能、法寶奧義 [F] 釋放特效、時裝/陰陽太極光環、限定靈寵/法器/神器渲染 |
| `src/components/GameHUD.tsx` | 經典 2015–2020 修仙手遊介面：左上頭像/經驗條/修為、右上仙玉/金幣/儲值、右側活動矩陣（含陰陽抽獎入口）、左側接取打怪任務、下方技能列與法寶按鈕 |
| `src/components/EquipIcon.tsx` | 6 大裝備部位 SVG 小圖示與品階發光框 |
| `src/components/ItemMiniIcon.tsx` | 禮包/商城/抽獎共用小圖標與數量標籤組件（仙玉、強化石、進階丹、時裝、靈寵、法器、陰陽令等） |
| `src/components/TribulationOverlay.tsx` | 渡劫突破全螢幕閃電天劫 CSS/SVG 特效 |
| `src/components/modals/CharacterAndGearModal.tsx` | 角色境界、裝備強化、背包、**時裝幻化 (`fashion`)**、靈寵/坐騎/神翼/法寶/神器（含限定外觀切換） |
| `src/components/modals/YinYangGachaModal.tsx` | **陰陽限定抽獎**：單抽/十連抽、50抽保底、累抽里程碑、主題限定時裝/寵物/法器預覽與抽獎結果展示 |
| `src/components/modals/RechargeCenterModal.tsx` | 首儲、首充雙倍、VIP1~15、月卡/永久卡、累儲/連儲、限時/每日禮包（皆含小圖標標示內容物）、台灣多元支付確認彈窗 |
| `src/components/modals/PurchaseRewardModal.tsx` | 儲值、購買禮包或領獎後的獲得道具展示彈窗 |
| `src/components/modals/CombatContentModal.tsx` | 材料副本、世界 BOSS、宗門/仙盟戰、跨服競技場 |
| `src/App.tsx` | 主狀態控制器、存檔讀寫（`jiuxiao_xian_tu_save_v1`）、存檔 JSON 匯出/匯入備份、所有業務邏輯 handler |

---

## 3. 存檔格式與向後相容規範
- 玩家進度自動儲存於 `localStorage` 鍵值 `jiuxiao_xian_tu_save_v1`。
- 同時支援於系統選單 (`Esc`) 進行 **匯出存檔 JSON / 匯入存檔 JSON**。
- **重要擴充原則**: 若未來新增 `PlayerState` 欄位，請務必於 `App.tsx` 的 `loadSavedPlayer()` 與匯入驗證邏輯中補上 `?? defaultValue` 預設值，確保舊存檔不會發生 `undefined` 例外。

---

## 4. 後續 AI / 開發者快速擴充指南

### A. 新增時裝或陰陽限定外觀
1. 於 `src/data/xianxiaData.ts` 的 `FASHION_CATALOG` 或 `LIMITED_SKINS` 新增設定項目（含 `primaryColor`、`secondaryColor`、`auraType` 與屬性加成）。
2. 如需獨特畫布粒子或造型，於 `src/components/BattleCanvas.tsx` 的 Hero / Pet / Treasure / Artifact 繪製區塊依 `auraType` 或 `equippedLimited*` ID 擴充繪圖分支。

### B. 新增限定抽獎主題卡池
1. 參考 `YINYANG_GACHA_POOL` 與 `src/components/modals/YinYangGachaModal.tsx`，複製抽獎池結構並加入 `ModalTab` 對應分頁即可。
2. 所有獎項皆可透過 `ItemMiniIcon` 與 `PurchaseRewardModal` 呈現小圖標與抽獎結算畫面。

### C. 新增禮包 / 活動與小圖標標示
1. 若要新增禮包或儲值檔位，於 `src/data/xianxiaData.ts` 定義內容後，在元件中使用 `src/components/ItemMiniIcon.tsx` 匯出的 `<RewardIconChip kind="..." label="..." count="..." />` 即可自動顯示精緻圖標。
2. 記得於 `App.tsx` 的對應 handler 最後呼叫 `setPurchaseReceipt(...)`，讓玩家購買後立即看到獲得清單彈窗。

### D. 修改前檢查流程
1. 新增或修改模組後，務必執行 `npm run lint`（`tsc --noEmit`）與 `npm run build` 確認零型別錯誤與成功打包。

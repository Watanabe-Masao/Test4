# HANDOFF — data-load-idempotency-hardening

> 役割: 起点文書。後任者が最初に読む。完了済みの全景 + 次にやること + ハマりポイント。
> 詳細仕様は本書末尾の関連文書を参照する。

## 1. 現在地

idempotent load contract Phase 0-3 + read-path 重複耐性 PR A〜E は landed 済み。

| Phase | 内容 | 状態 |
|---|---|---|
| Phase 0 | 契約明文化 (`loadMonth` の replace セマンティクス) | ✅ #993 |
| Phase 1 | helper 抽出 (`purgeLoadTarget`) | ✅ #993 |
| Phase 2 | reload path の二重 delete 除去 | ✅ #994 |
| Phase 3.a | year-shift 解消 (`deletePrevYearRowsAt` 導入) | ✅ #996 / #998 |
| Phase 3.b | 冪等性契約テスト 4 件 (`dataLoaderPureFunctions.test.ts`) | ✅ #995 |
| Phase 3.c | read-path spot audit (FRAGILE 6 / PARTIAL 3 / SAFE) | ✅ #999 |
| PR A | handoff/plan/audit の役割固定 + Done 定義 + JSDoc + 防御コメント | ✅ |
| PR B | duplicate-injected mock conn helper 追加 | ✅ |
| PR C | FRAGILE 6 件への構造的回帰テスト (`.fails` ロック) | ✅ |
| PR D | `purchaseComparison.ts` FRAGILE 1/2 を pre-aggregate 化 | ✅ |
| PR E | `freePeriodFactQueries.ts` cs 側を pre-aggregate 化 | ✅ |

## 2. 次にやること

詳細は `checklist.md` を参照。**残作業は 1 つだけ**:

- FRAGILE 3, 4, 5 (`querySpecialSalesDaily` / `queryTransfersDaily` /
  `querySalesTotal`) の `.fails` テストの恒久方針を決める
  - 選択肢 A: 永続的に `.fails` ロックのまま放置（audit JSDoc-only 分類）
  - 選択肢 B: pre-aggregate 化して green に戻す（PR D/E と同パターン）
  - 選択肢 C: テストを削除し、JSDoc 注意書きだけに依存

現状は A を採用済み（audit 推奨どおり）。本 project の checklist は
A 採用を「決定済み」として扱い、レビューサイクルを 1 回だけ追加する形にする。

**Phase F 決定: Option A 採択確定（2026-04-12）** —
`references/03-guides/read-path-duplicate-audit.md` §結論 に正式決定として転記済み。
本 project は本決定と同時に archive された。

## 3. ハマりポイント

### 3.1. `deletePrevYearMonth` の year-shift 設計

`deletePrevYearMonth(conn, year, month)` は引数として **当年** を受け取り、
内部で `prevYear = year - 1` してから削除する設計。Phase 2 初版でこれを
誤解して 1 年ずれる回帰を出した。絶対位置で消したい場合は必ず
`deletePrevYearRowsAt(year, month)` を使う。
詳細: `references/03-guides/data-load-idempotency-handoff.md` §3.1（旧 handoff）

### 3.2. `store_day_summary.customers = MAX(customers)`

`schemas.ts` の `flowers` subquery で `MAX(customers)` を使うのは defense-in-depth。
SUM に戻すと過去の `1.56e+17` 事件が再発する。`@defense customers=MAX` コメントで
意図を明示済み。勝手に SUM に戻さないこと。

### 3.3. FRAGILE 3/4/5 を refactor したくなったとき

audit 推奨事項 §4 で「JSDoc only mitigation」分類になっており、refactor 計画は
ない。もし refactor したくなったら、PR D/E と同じ「source を subquery で
事前集約」パターンを `expectSqlPreAggregatesSource` で構造的に検証できる。
回帰テスト (`readPathDuplicateResistance.test.ts` の FRAGILE/3/4/5) は
`.fails` を外すだけで green になる。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `references/03-guides/data-load-idempotency-plan.md` | Phase 0-3 全履歴（背景） |
| `references/03-guides/read-path-duplicate-audit.md` | FRAGILE 分類根拠 |
| `references/03-guides/data-load-idempotency-handoff.md` | 旧 handoff（→ 本書に統合予定） |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール |
| `app/src/infrastructure/duckdb/__tests__/helpers/duplicateInjectedMockConn.ts` | 共有テスト helper |
| `app/src/infrastructure/duckdb/__tests__/readPathDuplicateResistance.test.ts` | FRAGILE 6 件の構造的回帰テスト |

---

Archived: 2026-04-12

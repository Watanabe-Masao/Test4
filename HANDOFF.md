# 引き継ぎ書 — Pure 計算責務再編（Phase 8 以降へ）

## 1. 現在地

Phase 0-7 の構造基盤が完了。PR #956（ブランチ `claude/create-handoff-docs-tFlIF`）でマージ済み。

本体: **v1.8.0**。AAG（アーキテクチャ品質管理）: **v4.5.0**。Guard: **53 ファイル / 461 テスト**。Architecture Rules: **140 ルール**。Hard Gate: **PASS**。

### 完了済みの構造基盤

- 契約固定（BIZ-001〜013 / ANA-001〜009）
- registry 契約値埋め 22 件
- 5 bridge の JSDoc に semanticClass + contractId
- wasmEngine に WASM_MODULE_METADATA
- current 群保守ポリシー + 7 Cargo.toml semantic metadata
- Tier 1 Business 移行計画（候補 6 件）+ Analytic Kernel 移行計画（候補 9 件）
- Guard 統合整理 + JS 正本縮退 4 段階ポリシー
- Promote Ceremony テンプレート
- 移行タグ基盤（migrationTagRegistry + migrationTagGuard + migration-tag-policy）
- Phase 3-7 guard 31 件追加

## 2. 完了した Phase の概要

| Phase | 主な成果物 | Guard 追加 |
|-------|-----------|-----------|
| 0 | 意味分類ポリシー + authoritative 用語スイープ | +1 |
| 1 | 意味分類 Inventory（35 ファイル分類） | — |
| 2 | CanonEntry 完全定義 + Derived View + block-merge | +4 |
| 3 | 契約定義ポリシー + registry 契約値 22件 + bridge JSDoc + wasmEngine metadata | +6 |
| 4 | current 群保守ポリシー + 7 Cargo.toml metadata | +7 |
| 5 | Tier 1 Business 移行計画（候補 6件 + 8ステップ + 判定基準） | +7 |
| 6 | Analytic Kernel 移行計画（候補 9件 + 9ステップ + 不変条件） | +7 |
| 7 | Guard 統合整理 + JS 正本縮退 4段階 + 違反レスポンス設計 | +4 |

## 3. 最初に読むファイル（優先順）

| ファイル | なぜ読むか |
|---------|-----------|
| `plan.md` | 全体計画。Phase 8 以降の成果物と受け入れ条件 |
| `plan-checklist.md` | Phase 単位のチェックリスト |
| `references/03-guides/tier1-business-migration-plan.md` | Tier 1 候補 6件 + 8ステップ移行プロセス |
| `references/03-guides/analytic-kernel-migration-plan.md` | Analytic 候補 9件 + 9ステップ移行プロセス |
| `references/03-guides/guard-consolidation-and-js-retirement.md` | 全 guard マップ + JS 縮退 4段階 |
| `references/03-guides/contract-definition-policy.md` | BIZ/ANA 契約テンプレート |
| `references/03-guides/current-maintenance-policy.md` | current 群の保守観点 |
| `app/src/test/calculationCanonRegistry.ts` | Master Registry（35 エントリ + 契約値） |
| `app/src/test/architectureRules.ts` | 全 140 ルール |
| `references/03-guides/promote-ceremony-template.md` | Phase 8 の昇格手順テンプレート |

## 4. Phase 8 以降でやること

### Phase 8: Promote Ceremony

candidate が promotion-ready になったら実行する昇格手順。

1. promote 提案書を作成（テンプレートあり）
2. 判定主体は「AAG 証拠収集 → AI 提案 → **人間承認**」
3. dual-run 安定期間の確認
4. null / warning / methodUsed / scope 一致の確認
5. rollback 実演の確認
6. promote 実施 → registry / contract / bridge metadata 更新
7. 失敗時の巻き戻し手順

**鉄則:** 実装 AI が自己承認してはならない。promotion-ready だけで current 扱いにしてはならない。

### Phase 9: JS retired-js 化

current 昇格済み責務だけを対象に、JS reference を段階的に縮退:
- compare-reference → fallback-only → retired-js の順に下げる
- 旧 JS path 禁止 guard を入れる
- repo 全体一括削除は禁止

### Phase 10: 物理構造の収束

semanticClass 棚卸し一巡後、必要範囲だけ物理移動。意味分類が揺れている状態で大規模リネームしない。

### Phase 11: 意味拡張 + UI 進化

Business / Analytic の境界が安定してから新しい KPI / 説明指標を導入。

## 5. Phase 8 を始めるための前提条件

Phase 8 は **candidate 実装が promotion-ready であること**が前提。
つまり、以下が完了していること:

1. ✅ candidate 一覧が確定している（Phase 5-6 で完了）
2. ✅ 契約が固定されている（Phase 3 で完了）
3. ✅ guard が導入されている（Phase 3-7 で完了）
4. ✅ candidate の Rust/WASM 実装が追加されている（Phase 5 実装で完了 — 6 crate）
5. ✅ bridge にモード切替が実装されている（Phase 5 実装で完了 — 6 bridge）
6. ✅ dual-run compare が実施されている（Phase 5 実装で完了 — mock ベース parity 検証）
7. ✅ rollback が確認されている（Phase 5 実装で完了 — rollbackToCurrentOnly テスト）

**Phase 5 Tier 1 Business 全 6 候補 + Phase 6 Analytic Kernel 全 9 候補の移行構造が完了。**

Phase 6 結果:
- candidate crate: ANA-003 (sensitivity), ANA-004 (trendAnalysis), ANA-005 (correlation), ANA-007 (dowGapAnalysis), ANA-009 (computeMovingAverage) — 5 件
- current 品質整備: ANA-001 (timeSlot Zod追加), ANA-002 (advancedForecast residual明文化), ANA-006 (forecast residual明文化) — 3 件
- non-target 除外: ANA-008 (dowGapActualDay: JS-native / FFI 便益薄) — 1 件

### 次のアクション

#### 最優先: データロード層の根本改善

`special_sales` テーブルの重複蓄積によるリグレッションバグを発見・暫定修正済み。
根本解決は別スコープで実施する。

- **問題定義書**: `references/03-guides/data-load-idempotency-plan.md`
- **暫定修正**: `MAX(customers)` (schemas.ts) + `loadMonth` 内自動 `deleteMonth` (dataLoader.ts)
- **根本解決**: `loadMonth` の完全冪等化 + `useDuckDB.ts` の冗長 `deleteMonth` 整理
- **テスト**: 同一データ 2 回ロードで行数不変の検証が必要

#### Phase 8: Promote Ceremony

実 WASM バイナリでの dual-run 観測と人間承認が前提。

1. `wasm-pack build` → 全 candidate crate の WASM バイナリ生成
2. DEV 環境で bridge を `dual-run-compare` モードに切替
3. 値一致 / null 一致 / warning 一致を観測
4. 安定期間確認後、promotion-readiness 判定表を更新
5. Promote Ceremony テンプレート (`references/03-guides/promote-ceremony-template.md`) に従い人間承認

#### 構造改善（Phase 5-6 で判明した課題）

| # | 課題 | 参照 | 優先度 |
|---|------|------|--------|
| 1 | wasmEngine を registry-driven に | candidate 追加時に 12 箇所手動更新が必要 | 高 |
| 2 | bridge テストヘルパーの横展開 | `bridgeTestHelpers.ts` 作成済み、11 テストに未適用 | 中 |
| 3 | pre-commit で `test:guards` 実行 | CANDIDATE_CRATES 追加忘れを CI 前に検出 | 中 |
| 4 | vitest mock alias の共有化 | vite.config.ts は統一済み、vitest は未統一 | 低 |

#### 気づき・教訓

1. **`tsc --noEmit` と `tsc -b` の差異** — ローカルで `--noEmit` は通るが CI の `-b` で型エラーが出るケースがあった。メモリ制限でローカル build が困難な場合の対策が必要
2. **docs:generate の破壊性** — `source: 'build-artifact'` で非破壊化済みだが、同様の環境依存 KPI が増える場合は設計の拡張が必要
3. **ANA-008 のような non-target 判定** — `wasm-candidate-eligibility.md` を作成済み。計画段階で適用すべき
4. **不変条件命名の統一** — `invariant-catalog.md` に命名規則を追加済み。新規追加時は準拠すること
5. **allowlist の factory 化** — bridge allowlist は factory パターンに集約済み。他の allowlist にも適用可能

## 6. 文書追加時の連鎖更新（最もハマりやすい）

新しい `.md` を `references/` に追加すると、以下の **4箇所** を全て更新しないとガードが落ちる:

1. `docs/contracts/doc-registry.json` — 文書レジストリに追加
2. `references/README.md` — 上部テーブル（正本一覧）に追加
3. `references/README.md` — 下部テーブル（AI 向け索引）にも追加
4. `cd app && npm run docs:generate` — generated section を再生成

### wasm/ 変更時

`wasm/` 配下を変更したら `docs/contracts/project-metadata.json` も同コミットに含める。

### references/01-principles/ 変更時

`references/01-principles/` 配下を変更したら `docs/contracts/principles.json` も同コミットに含める。

## 7. テスト実行の手順

```bash
cd app
npm run format          # Prettier 自動修正
npm run lint            # ESLint（0 errors 必須）
npm run build           # tsc -b + vite build
npm run test:guards     # ガードテスト（53 ファイル / 461+ テスト）
npm run docs:generate   # guard/allowlist/文書変更時は必須
npm run test:guards     # docs:generate 後に再度
```

## 8. 絶対にやってはいけないこと

1. `calculationCanonRegistry.ts` 以外に registry を作る
2. `semanticViews.ts` を手編集する（master から自動導出のみ）
3. `authoritative` を単独語で新規追加する
4. candidate エントリを current view に混ぜる
5. 移行タグを `completionChecklist` なしで作る
6. 移行タグを checklist 未実行で removed にする
7. CanonEntry に新しいフィールドを足す（Phase 2 で完了済み）
8. 実装 AI が Promote Ceremony を自己承認する
9. JS reference に新規 authoritative logic を追加する
10. review-needed のまま current 編入 / candidate 化する

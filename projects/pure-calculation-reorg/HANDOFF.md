# 引き継ぎ書 — Pure 計算責務再編（Phase 8 以降へ）

> **本文書の役割: 起点文書**
> 後任者が最初に読む文書。完了済みの概要、次にやること、ハマりポイント。
> コード truth の後追いであり、詳細は plan.md / checklist.md を参照する。

### 3文書の役割分担

| 文書 | 役割 | 更新タイミング |
|------|------|-------------|
| **HANDOFF.md（本書）** | 起点文書。全体把握と入口 | コード truth 変更後 |
| **plan.md** | 原則と構造の正本。4不可侵原則 + Phase 別禁止事項テーブル + Phase 定義 + Phase 11 完了後の 4 項目 | 計画変更時のみ |
| **checklist.md** | 進行管理の唯一の truth（達成条件 checkbox のみ。禁止事項は plan.md） | 作業完了ごと |

---

## 1. 現在地

Phase 0-7 の構造基盤が完了。AAG 5.0.0 Phase A1-A5 完了。Core / Project Overlay 分離済み。
**Phase C（Governance 配置完成）+ Phase 6（AAG 保証強化）完了**（2026-04-12）。
**AAG 5.2 Collector-Governance Symmetry 完了**（2026-04-13, 別プロジェクトで実施）。

本体: **v1.10.0**。AAG: **5.2.0**。Hard Gate: **PASS** (39/39 KPI OK)。
進捗: **84/113 (74.3%)** — Phase 0-7 の達成条件は全て `[x]`、Phase 8-11 が残件。

### 2026-04-13 の状態変化（別プロジェクトで実施済み、本 project への影響あり）

AAG コア信頼性回復フェーズ（P0-1/P0-2/P0-3）が完了し、以下が変化:

- **checklist.md が純化された**（aag-collector-purification project で実施）:
  - 各 Phase の「やってはいけないこと」セクション 19 件 → `plan.md` の「Phase 別禁止事項テーブル」へ
  - ファイル末尾の「常時チェック」6 件 → `CONTRIBUTING.md` の「PR 作成前のローカル確認」へ
  - ファイル末尾の「4 つだけ毎回見る最重要項目」4 件 → `plan.md` の「Phase 11 完了後に毎回確認する 4 項目」へ
  - **Phase 0-11 の達成条件 checkbox `[x]`/`[ ]` 状態は不変**
  - 進捗表記が `88/132` → `84/113` に（分母の prohibition noise 削減による改善）
- **`checklistGovernanceSymmetryGuard` (S1/S2/S3) 追加** — 禁止見出しが checklist に紛れ込むことを機械検出
- **AR-STRUCT-RESP-SEPARATION の 7 分割完了** — AR-RESP-* (STORE-COUPLING / MODULE-STATE /
  HOOK-COMPLEXITY / FEATURE-COMPLEXITY / EXPORT-DENSITY / NORMALIZATION / FALLBACK-SPREAD)

**後任者への影響:**
- checklist.md に禁止事項を書こうとしたら `checklistFormatGuard` (F3/F4/F5) と
  `checklistGovernanceSymmetryGuard` (S1/S2/S3) が両方発火する
- 禁止事項は必ず `plan.md` の「Phase 別禁止事項テーブル」に追記する
- 常時チェックコマンドは `CONTRIBUTING.md` §2「PR 作成前のローカル確認」を参照する

### 完了済みの構造基盤

### 完了済みの構造基盤

- 契約固定（BIZ-001〜013 / ANA-001〜009）
- Master Registry: 46 エントリ（実ファイル 35 件 + candidate placeholder 11 件）、契約値埋め 22 件
- 5 bridge の JSDoc に semanticClass + contractId
- wasmEngine に WASM_MODULE_METADATA
- current 群保守ポリシー + 7 Cargo.toml semantic metadata
- Tier 1 Business 移行計画（候補 6 件）+ Analytic Kernel 移行計画（9 件: 移行 5 + 品質整備 3 + 除外 1）
- Guard 統合整理 + JS 正本縮退 4 段階ポリシー
- Promote Ceremony テンプレート
- 移行タグ基盤（migrationTagRegistry + migrationTagGuard + migration-tag-policy）
- Phase 3-7 guard 31 件追加
- **Phase C: BaseRule を `app-domain/gross-profit/rule-catalog/base-rules.ts` へ物理移動**
- **Phase C: direct import 禁止 3 ルール + `aagDerivedOnlyImportGuard.test.ts`**
- **Phase C: project-resolver 一元化（vite / vitest / health tools、tsconfig は暫定静的）**
- **Phase 6: collector / resolver / merge 3 層の契約テスト + quote-agnostic 化**

## 2. 完了した Phase の概要

| Phase | 主な成果物 | Guard 追加 |
|-------|-----------|-----------|
| 0 | 意味分類ポリシー + authoritative 用語スイープ | +1 |
| 1 | 意味分類 Inventory（35 ファイル分類） | — |
| 2 | CanonEntry 完全定義 + Derived View + block-merge | +4 |
| 3 | 契約定義ポリシー + registry 契約値 22件 + bridge JSDoc + wasmEngine metadata | +6 |
| 4 | current 群保守ポリシー + 7 Cargo.toml metadata | +7 |
| 5 | Tier 1 Business 移行計画（候補 6件 + 8ステップ + 判定基準） | +7 |
| 6 | Analytic Kernel 移行計画（9件分類: 移行5 + 品質整備3 + 除外1 + 9ステップ） | +7 |
| 7 | Guard 統合整理 + JS 正本縮退 4段階 + 違反レスポンス設計 | +4 |
| **C** | **Governance 配置完成**: BaseRule → App Domain 物理移動 / direct import 禁止 / project resolver 一元化 / 入口文書整理 | **+1**（+3 ルール） |
| **6** | **AAG 保証強化**: collector / resolver / merge 契約テスト + quote-agnostic 化 + merge smoke guard | **+6**（6 test files 追加、内 5 は src/test/tools/、1 は guards/） |

### Phase C / Phase 6 詳細

| 項目 | 状態 | 成果物 |
|------|------|--------|
| 境界ポリシー文書 | **完了** | `aag/core/`, `app-domain/gross-profit/` |
| ArchitectureRule 型分割 | **完了** | `aag-core-types.ts`（RuleSemantics / Governance / DetectionSpec） |
| aagSchemas.ts Core re-export | **完了** | Core 型を aagSchemas.ts 経由でもアクセス可能 |
| allowlist RetentionReason 分離 | **完了** | CoreRetentionReason / AppRetentionReason + RemovalKind |
| **Phase C1: project 参照点一元化** | **完了** | `project-resolver.ts` / `resolve-project-overlay.mjs` / `project.json` 追加（tsconfig は暫定静的） |
| **Phase C2: direct import 禁止 guard** | **完了** | `AR-AAG-DERIVED-ONLY-IMPORT` 系 3 ルール + `aagDerivedOnlyImportGuard.test.ts` |
| **Phase C3: 入口文書整理** | **完了** | `governance-final-placement-plan.md` 現行化 + `architectureRules/README.md` 追加 |
| **Phase C4: BaseRule 物理移動** | **完了** | `app-domain/gross-profit/rule-catalog/base-rules.ts` + `@app-domain/*` alias |
| **Phase 6-1: Collector 契約テスト** | **完了** | `guardCollectorContract.test.ts` / `temporalGovernanceCollectorContract.test.ts` + quote-agnostic 化 |
| **Phase 6-2: Resolver 契約テスト** | **完了** | `projectResolverContract.test.ts` / `resolveProjectOverlayScript.test.ts` |
| **Phase 6-3: Merge / Facade smoke** | **完了** | `architectureRulesMergeSmokeGuard.test.ts` |
| **Phase 6-4: docs / health smoke** | **完了** | `docs:check` PASS, Healthy |

## 3. 後任者の読書順（3レイヤー構成）

### Layer 1: 全体把握（まずこの3つ）

| 順 | ファイル | 目的 |
|---|---------|------|
| 1 | `HANDOFF.md` | **起点**。完了済み Phase 0-7 の概要、次にやること、ハマりポイント |
| 2 | `plan.md` | 全体計画。4 不可侵原則 + Phase 別禁止事項テーブル + Phase 8 以降の成果物と受け入れ条件 + Phase 11 完了後の 4 項目 |
| 3 | `checklist.md` | Phase 単位の完了チェックリスト（純化済み、達成条件 `[x]`/`[ ]` のみ） |

### Layer 2: 次のアクション理解（何をやるか）

| ファイル | 内容 |
|---------|------|
| `references/03-implementation/data-load-idempotency-plan.md` | **最優先タスク**: データロード冪等化の問題定義書 |
| `references/03-implementation/promote-ceremony-template.md` | Phase 8 の昇格手順テンプレート |
| `references/03-implementation/tier1-business-migration-plan.md` | Tier 1 候補 6件 + 8ステップ移行プロセス |
| `references/03-implementation/analytic-kernel-migration-plan.md` | Analytic 9件の分類整理（移行5 + 品質整備3 + 除外1） |

### Layer 3: 構造ルール（壊さないために）

| ファイル | 内容 |
|---------|------|
| `CLAUDE.md` | 開発ルール全体。特に「設計原則」「ドキュメント運用」 |
| `app/src/test/calculationCanonRegistry.ts` | Master Registry（46 エントリ: 実ファイル35 + candidate 11） |
| `app/src/test/architectureRules.ts` | Consumer facade（**物理正本**は `app-domain/gross-profit/rule-catalog/base-rules.ts`、AAG 5.2 後）。AR-RESP-* 7 分割 + checklistGovernanceSymmetry 追加済み |
| `references/03-implementation/contract-definition-policy.md` | BIZ/ANA 契約テンプレート |
| `references/03-implementation/guard-consolidation-and-js-retirement.md` | Guard マップ + JS 縮退 4段階 |

## 4. Phase 8 以降でやること

> **用語注意: dual-run-compare**
> 本書で言う「dual-run-compare」は Phase 5-8 の **bridge 管理下で current（TS）と candidate（WASM）を並行実行し parity を検証する仕組み**を指す。
> AR-001 / AR-STRUCT-DUAL-RUN-EXIT が禁止するのは退役済みインフラ層 dual-run（getExecutionMode / recordCall / recordMismatch）のみ。
> bridge 管理下の dual-run-compare は AR-001 の対象外として明文化済み。

### Phase 8: Promote Ceremony

candidate が promotion-ready になったら実行する昇格手順。

1. promote 提案書を作成（テンプレートあり）
2. 判定主体は「AAG 証拠収集 → AI 提案 → **user 承認**」
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

### Governance 保守 TODO（Phase C の暫定事項）

- `tsconfig.app.json` の `@project-overlay/*` / include 静的直書きの解消（Phase C1 暫定事項）
- `tools/architecture-health/src/config/health-rules.ts` の target 値を Project Overlay へ移す検討（health 契約化）

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

> **本 project の次のアクションは Phase 8 (Promote Ceremony)。**
> データロード冪等化は別 project に分離し 2026-04-12 に archive 済み:
> [`projects/completed/data-load-idempotency-hardening`](../completed/data-load-idempotency-hardening/AI_CONTEXT.md)。
> 本 project と data-load-idempotency-hardening は scope が異なるため、
> 同じ checklist に混在させない（1 project = 1 一貫した task scope の原則）。

#### Phase 8: Promote Ceremony

実 WASM バイナリでの dual-run 観測とuser 承認が前提。

1. `wasm-pack build` → 全 candidate crate の WASM バイナリ生成
2. DEV 環境で bridge を `dual-run-compare` モードに切替
3. 値一致 / null 一致 / warning 一致を観測
4. 安定期間確認後、promotion-readiness 判定表を更新
5. Promote Ceremony テンプレート (`references/03-implementation/promote-ceremony-template.md`) に従いuser 承認

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

### references/01-foundation/ 変更時

`references/01-foundation/` 配下を変更したら `docs/contracts/principles.json` も同コミットに含める。

### pre-push hook による自動検出

上記の連鎖更新漏れは `tools/git-hooks/pre-push` で自動検出される:

```bash
# セットアップ（初回のみ）
cp tools/git-hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
# pre-commit も入れる場合
cp tools/git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

pre-push が検出する項目:
- `references/` 変更 → `doc-registry.json` / `README.md` 未更新
- `references/01-foundation/` 変更 → `principles.json` 未更新
- `wasm/` 変更 → `project-metadata.json` 未更新
- guard/allowlist/registry 変更 → `docs:generate` 未実行
- lint エラー残存
- `test:guards` 未通過

## 7. テスト実行の手順

```bash
cd app
npm run format          # Prettier 自動修正
npm run lint            # ESLint（0 errors 必須）
npm run build           # tsc -b + vite build
npm run test:guards     # ガードテスト（67 ファイル / 580 テスト、AAG 5.2 後）
npm run docs:generate   # guard/allowlist/文書変更時は必須
npm run test:guards     # docs:generate 後に再度
```

開発フローで常時実行する 6 コマンドの詳細は `CONTRIBUTING.md` §2 を参照。

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

## 9. Violation を見たときの読書導線

ガードテストや CI で violation が出た場合、以下の順番で対処する。

| violation のカテゴリ | 最初に読むファイル | 次に読むファイル |
|---------------------|-------------------|-----------------|
| **terminology** | `references/01-foundation/semantic-classification-policy.md` | `app/src/test/architectureRules.ts` の該当ルール |
| **semantic-boundary** | `references/01-foundation/semantic-classification-policy.md` | `app/src/test/calculationCanonRegistry.ts` |
| **registry-integrity** | `app/src/test/calculationCanonRegistry.ts` | 該当パスガード（`guards/*PathGuard.test.ts`） |
| **bridge-runtime-boundary** | `references/01-foundation/engine-boundary-policy.md` | 該当 bridge ファイル（`application/services/*Bridge.ts`） |
| **current-candidate-lifecycle** | `references/03-implementation/tier1-business-migration-plan.md` | `references/03-implementation/analytic-kernel-migration-plan.md` |
| **docs-synchronization** | `references/99-archive/aag-5-source-of-truth-policy.md` | `docs/contracts/doc-registry.json` |
| **promote-retire-lifecycle** | `references/03-implementation/promote-ceremony-template.md` | `references/03-implementation/guard-consolidation-and-js-retirement.md` |
| **ratchet-legacy-control** | 該当 allowlist（`app/src/test/allowlists/`） | `references/03-implementation/architecture-rule-system.md` |

> **全カテゴリ共通:** `app/src/test/guardCategoryMap.ts` で該当ルールのカテゴリと note を確認。
> `app/src/test/guardMetadataView.ts` で severity / enforcement / sunsetCondition を確認。

## 10. AAG 5.0 の構造

AAG は 4 層で構成されている。詳細は `references/99-archive/aag-5-constitution.md` を参照。

| 層 | 役割 | 代表ファイル |
|----|------|------------|
| Constitution | 思想の正本 | `references/01-foundation/` |
| Schema | 型の正本 | `calculationCanonRegistry.ts`, `architectureRules.ts`, `aagSchemas.ts` |
| Execution | 検出の実装 | `guards/*.test.ts`, `tools/architecture-health/` |
| Operations | 運用手順 | 本書, `plan.md`, `plan-checklist.md` |

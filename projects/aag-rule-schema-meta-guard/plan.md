# plan — aag-rule-schema-meta-guard

> **正本**: 親 project (`projects/aag-bidirectional-integrity/plan.md`) の §3.4 SemanticTraceBinding 設計 +
> §Phase 2 (schema 拡張) + §Phase 6 (binding 記入) + §Phase 8 MVP (meta-guard) を継承。
> 本 plan は Project B scope に絞った operational plan。

## 不可侵原則

1. **正本 = `app-domain/gross-profit/rule-catalog/base-rules.ts`**: BaseRule の物理正本は同 file 1 つだけ。
   `defaults.ts` (execution overlay) と `guardCategoryMap.ts` には semantic binding を持たせない (二重正本
   回避、PR review Review 3 P0 #1 + P1 #4 反映)。
2. **新 field は optional**: `canonicalDocRef` / `metaRequirementRefs` は optional field として追加し、
   既存 RuleBinding consumer は backward 互換を維持。breakingChange = false。
3. **status field 必須**: 新 field は `SemanticTraceBinding<T>` (= `{ status, justification?, refs }`)
   構造を持つ。空配列 (refs: []) と `{ status: 'pending', refs: [] }` を区別する設計
   (= 「未対応 vs 適用外」を articulate 可能)。
4. **initial state = pending**: Phase 1 では全 166 rule に `{ status: 'pending', refs: [] }` を装着。
   Phase 6 で各 rule の status を `bound` または `not-applicable` (justification 必須) に flip。
5. **Phase 8 MVP scope 厳守**: 本 project の Phase 8 は **4 meta-guard MVP のみ** (canonicalDocRefIntegrity /
   canonicalDocBackLink / semanticArticulationQuality / statusIntegrity)。残 sub-audit (4.1 境界 / 4.3 波及
   / 4.5 機能性 / selfHostingGuard / metaRequirementBindingGuard) は follow-up project へ逃がす。
6. **Project A 完了 dependence**: Phase 6 binding 記入は Project A (AAG Core doc refactor) の Phase 1〜2
   完了 (新 doc 安定状態) に依存。Phase 1〜5 は Project A 進行中でも着手可能 (型定義 + initial value 装着)。
7. **scope 越境禁止**: AAG Core doc content refactor (`aag/` 配下 doc Create / Split / Rewrite) /
   DFR registry 構築 / 複雑 legacy archive 案件は Project A / C / D 所掌、本 project では touch しない。

## Phase 構造

### Phase 1: SemanticTraceBinding 型 family 実装

**目的**: 親 plan §3.4 に articulate された型構造を `architectureRules/types.ts` (or `aag-core-types.ts`)
に実装。

**deliverable**:
```typescript
type TraceBindingStatus = 'pending' | 'not-applicable' | 'bound'
interface SemanticTraceRef {
  readonly problemAddressed: string
  readonly resolutionContribution: string
}
interface CanonicalDocTraceRef extends SemanticTraceRef { readonly docPath: string }
interface MetaRequirementTraceRef extends SemanticTraceRef { readonly requirementId: string }
interface SemanticTraceBinding<TRef> {
  readonly status: TraceBindingStatus
  readonly justification?: string
  readonly refs: readonly TRef[]
}
```

`RuleBinding` 型に optional field 追加:
- `canonicalDocRef?: SemanticTraceBinding<CanonicalDocTraceRef>` (実装 → 設計 doc binding)
- `metaRequirementRefs?: SemanticTraceBinding<MetaRequirementTraceRef>` (実装 → 要件 binding)

**完了条件**: 型定義が landed、`merged.ts` 経由で consumer から型アクセス可能、tsc -b PASS、既存全 guard PASS。

### Phase 2: 166 rule に initial value 装着

**目的**: `app-domain/gross-profit/rule-catalog/base-rules.ts` の `ARCHITECTURE_RULES` 配列の全 166 rule に
`{ status: 'pending', refs: [] }` を初期化。

**deliverable**:
- 各 rule entry に `binding: { canonicalDocRef: { status: 'pending', refs: [] }, metaRequirementRefs: { status: 'pending', refs: [] } }` (or 既存 `binding` field と merge)
- (option) 既存 `principleRefs` の semantic 化検討 (pointer のみ → pointer + problem + resolution + status)、本 project に含めるか別 sprint かは Phase 1 着手時に判断

**完了条件**: 全 166 rule に initial value 装着、build / lint / 既存 guard 全 PASS、新 field 整合性
(空配列でなく明示的 status が articulate 済) を grep で確認。

### Phase 3: AR-rule binding 記入 (Project A 完了後 or 並行可能 batch)

**目的**: 各 rule の `canonicalDocRef` を Project A の新 doc に向けて記入、`metaRequirementRefs` を
aag/meta.md §2 の `AAG-REQ-*` ID に向けて記入。

**deliverable**:
- 各 rule の status を `pending` → `bound` (binding 記入完了) or `not-applicable` (justification 必須) に flip
- batch 戦略: 親 plan §6.1 articulation を踏襲 (5-10 rule で品質基準 protocol 確定 → 残 rule batch 適用)
- semantic articulation 品質基準: hard fail = 禁止 keyword (TBD/N/A/same/see above 等) + 20 文字 minimum + 重複検出 + status 整合性 + path 実在

**完了条件**: 全 166 rule の status 整合 (`pending` 0 件 = MVP 完遂条件 or 一部 `pending` を follow-up に articulate)、
`semanticArticulationQualityGuard.test.ts` (Phase 4) PASS、Discovery Review で意味品質補完。

### Phase 4: meta-guard MVP 4 件実装

**目的**: 親 plan §Phase 8 MVP scope (= 4.2 Direction + 4.4 Completeness) の 4 meta-guard を実装。

**deliverable**:
- `canonicalDocRefIntegrityGuard.test.ts`: 各 rule の `canonicalDocRef.refs[].docPath` が実在 doc を指すか機械検証 (forward direction = 実装 → 設計)
- `canonicalDocBackLinkGuard.test.ts`: 各 canonical doc が refer されている rule を逆引き、orphan canonical doc を検出 (reverse direction = 設計 → 実装)
- `semanticArticulationQualityGuard.test.ts`: hard fail 基準を機械検証 (禁止 keyword + 20 文字 minimum + 重複 + status 整合 + path 実在)
- `statusIntegrityGuard.test.ts`: status 値の整合性 (`pending` / `not-applicable` / `bound` のみ、`not-applicable` 時 justification 必須)

**完了条件**: 4 meta-guard 全 PASS (= 全 166 rule binding が品質基準と direction 整合性を satisfy)、
test:guards 全 PASS、Phase 3 binding 記入の品質を機械検証で担保。

### Phase 5: ratchet-down 整備 + follow-up scope articulate

**目的**: 残 sub-audit (4.1 境界 / 4.3 波及 / 4.5 機能性 / selfHostingGuard / metaRequirementBindingGuard) を
follow-up project へ逃がす articulation を完遂。本 project の MVP 完遂状態を articulate。

**deliverable**:
- 残 sub-audit 一覧 + follow-up 配置先 articulation (decision log + commit message)
- meta-guard 4 件の baseline を `architectureRules.ts` に articulate (ratchet-down で進化可能)
- Phase 8 MVP 完遂を親 project HANDOFF / `aag-doc-audit-report.md` に通知 update
- 本 project の archive 候補 articulate

**完了条件**: 4 meta-guard MVP 完遂、follow-up scope が別 project (推奨: `aag-meta-guard-extended` 等の名称) に articulate 済、
親 project HANDOFF update 済。

### Phase 6: 最終レビュー (人間承認)

**目的**: 全 deliverable の人間 review 通過、archive プロセスへの移行 gate。

**deliverable**:
- 全 Phase 1〜5 の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビュー
- 親 project (`aag-bidirectional-integrity`) との archive 連動を articulate (Project A〜D 全完了で親 archive)

**完了条件**: 人間 review 通過、checklist 末尾「最終レビュー (人間承認)」 [x] flip。

## やってはいけないこと

- **`defaults.ts` (execution overlay) に `canonicalDocRef` / `metaRequirementRefs` を追加** → 二重正本回避 (不可侵原則 1)
- **`guardCategoryMap.ts` に semantic binding を追加** → 二重正本回避 (不可侵原則 1)
- **新 field を required field にする** → 既存 RuleBinding consumer の backward 互換を破壊 (不可侵原則 2)
- **空配列 (`refs: []`) のみで status を持たせない** → 「未対応 vs 適用外」の区別が消失 (不可侵原則 3)
- **Phase 8 MVP scope を超える sub-audit を本 project で実装** → follow-up project に逃がす scope を侵食 (不可侵原則 5)
- **Project A 完了前に Phase 3 binding 記入を全数着手** → binding 対象 (新 doc path) が不安定 → 後続 update 多発 (不可侵原則 6)
- **AAG Core doc を直接 edit / 新 doc を Create** → Project A 所掌の越境 (不可侵原則 7)
- **DFR registry を本 project で構築** → Project C 所掌の越境 (不可侵原則 7)

## 途中判断 (decision gates)

> `references/03-guides/deferred-decision-pattern.md` 適用。詳細は checklist.md を参照。

主要な途中判断:
- **Phase 1 着手前**: `principleRefs` の semantic 化を本 project に含めるか別 sprint か (親 plan §8.9)
- **Phase 3 着手前**: batch 戦略の確定 (5-10 rule で protocol 確定 → 残 batch 適用)
- **Phase 3 進行中**: Project A 完了状況に応じて binding 記入の対象 doc path 確定
- **Phase 4 着手前**: meta-guard 4 件の baseline 設定 (既存 binding 状態を baseline、ratchet-down で進化)
- **Phase 5 着手前**: follow-up scope (残 sub-audit) の配置先 (新 project spawn or 既存 follow-up に追加)

## 関連実装

| パス | 役割 |
|---|---|
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | BaseRule 物理正本 (Phase 2 で initial value 装着、Phase 3 で binding 記入) |
| `app/src/test/aag-core-types.ts` | Core 型定義 (Phase 1 で `SemanticTraceBinding<T>` family 追加) |
| `app/src/test/architectureRules/types.ts` | RuleBinding 型 (Phase 1 で `canonicalDocRef` + `metaRequirementRefs` 追加) |
| `app/src/test/architectureRules/merged.ts` | derived consumer (Phase 1 で型アクセス整合性確認) |
| `app/src/test/architectureRules/defaults.ts` | execution overlay (**touch 禁止**、不可侵原則 1) |
| `app/src/test/guardCategoryMap.ts` | category map (**touch 禁止**、不可侵原則 1) |
| `app/src/test/guards/canonicalDocRefIntegrityGuard.test.ts` | Phase 4 で新規実装 (forward direction 検証) |
| `app/src/test/guards/canonicalDocBackLinkGuard.test.ts` | Phase 4 で新規実装 (reverse direction 検証) |
| `app/src/test/guards/semanticArticulationQualityGuard.test.ts` | Phase 4 で新規実装 (品質基準) |
| `app/src/test/guards/statusIntegrityGuard.test.ts` | Phase 4 で新規実装 (status 整合性) |
| `references/01-principles/aag/meta.md` | AAG Meta charter (`metaRequirementRefs.refs[].requirementId` の供給元) |
| `projects/aag-core-doc-refactor/plan.md` | Project A 正本 (`canonicalDocRef.refs[].docPath` の供給元) |

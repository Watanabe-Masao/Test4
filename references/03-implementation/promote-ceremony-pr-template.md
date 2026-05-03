# Promote Ceremony PR テンプレート

> 役割: `domain/calculations/` の **candidate → current 昇格**、または **current → deprecated** 退役を、
> 1 PR で機械検証可能な単位に閉じ込めるためのテンプレート。
>
> **形式正本**: `references/04-tracking/elements/calculations/README.md` §「Lifecycle State Machine」
> **検証 guard**: `app/src/test/guards/contentSpecLifecycleGuard.test.ts`（AR-CONTENT-SPEC-LIFECYCLE-FIELDS）

## なぜテンプレートか

candidate を current に昇格させる作業は、次の 5 ファイルを **同期** で更新しなければならない:

1. `app/src/test/calculationCanonRegistry.ts` — `runtimeStatus: candidate → current`
2. 旧 current の spec — `lifecycleStatus: active → deprecated`、`replacedBy` 追記
3. 新 current の spec — `lifecycleStatus: proposed/active`、`supersedes` 追記
4. 旧 current の `sunsetCondition` + `deadline` を記載
5. ADR / projects/<active>/ 配下に判断記録

このセットが揃わない PR は guard で reject される（半移行状態を構造的に排除）。

## チェックリスト（PR テンプレ）

```markdown
## Promote Ceremony — <CALC-NNN-old> → <CALC-NNN-new>

### 移行の意味
- 業務意味: <一言>
- contractId: <BIZ-XXX>
- migrationTier: <tier1 | tier2>
- WASM module: <wasm/<name>/ または「TS-only」>

### 5 同期チェック

- [ ] 1. `calculationCanonRegistry.ts` の対象 entry の `runtimeStatus` を更新した
  - 旧 current: `current → non-target`（または `archived`）
  - 新 current: `candidate → current`
- [ ] 2. 旧 current spec (CALC-NNN-old.md) を更新
  - `lifecycleStatus: active → deprecated`（caller 残存中）または `→ sunsetting`（期限付き撤退）
  - `replacedBy: CALC-NNN-new` を必須記入
  - `sunsetting` の場合は `sunsetCondition` + `deadline` 必須
- [ ] 3. 新 current spec (CALC-NNN-new.md) を更新
  - `lifecycleStatus: proposed → active`
  - `canonicalRegistration: candidate → current`
  - `supersedes: CALC-NNN-old` 必須
- [ ] 4. ADR / 判断記録
  - 着手 project の `adr/` または `inquiry/` に Promote 判断と Shapley 同値性等の検証エビデンス
- [ ] 5. consumer 移行計画
  - 旧 current の caller 一覧（grep 結果 or content graph）
  - 新 current への切替 PR 計画 (PR-A / PR-B / PR-C... の段階分割)
  - 期限内に caller=0 → retired transition 予定

### 機械検証

実行して通ることを確認:

\`\`\`bash
cd app && npm run test:guards   # AR-CONTENT-SPEC-LIFECYCLE-FIELDS が PASS
cd app && npm run content-specs:check   # 0 drift
node tools/widget-specs/generate.mjs --check   # frontmatter sync 完璧
\`\`\`

### 影響

- 影響 widget / readModel: <CALC-impact-graph 出力 (Phase H で生成) または手動 grep>
- breaking change: yes / no
- backward compat shim: あり / なし

### Sunset 計画

- deadline: YYYY-MM-DD
- deadline 超過時の挙動: `AR-CONTENT-SPEC-LIFECYCLE-FIELDS` が hard fail し CI が止まる
- 想定 caller 切替期間: N 日 / N PR
```

## 状態遷移の規則

```
                  Promote Ceremony
                  (1 PR で 5 同期)
                        │
                        ▼
candidate ────→ current ────→ deprecated ────→ sunsetting ────→ retired ────→ archived
   ▲                              │                  │              │
   │                              │ replacedBy       │ deadline      │ active
   │                              ▼                  ▼ 超過          ▼ caller=0
   │                          後継 spec を必須      hard fail        source 削除
   │                          記入                  (temporal       許可
   │                                                governance)
   │
   └─ proposed (candidate file がまだ存在しない計画段階。source 不在許容)
```

### 各 transition の guard 検証

| transition | guard が要求するもの |
|---|---|
| `proposed → active` | source ファイル + `@calc-id` JSDoc + Promote PR の 5 同期 |
| `active → deprecated` | `replacedBy: <new>` 記入 |
| `active → sunsetting` | `replacedBy` + `sunsetCondition` + `deadline` |
| `deprecated → sunsetting` | + `deadline` 追加 |
| `sunsetting → retired` | active caller=0、`replacedBy` 既設定 |
| `* → archived` | source 削除済み、ID は欠番保持 |

### deadline 超過の扱い

- `deprecated` / `sunsetting` で deadline 過ぎても retired に transition していない → **hard fail**
- これは temporal governance（`@expiresAt` / `deprecatedMetadataGuard` 系列）と同じ思想:
  「移行が居残らない」ことを構造的に保証する

## チェックリスト省略可能なケース（撤退 only）

新規 candidate 化なしで、単に **current → deprecated → archived** の撤退のみを行う場合:

- 上記 1, 2, 4, 5 のみ（3 = 新 current spec 更新は不要）
- 「`replacedBy` を記入できない」場合は **退役判断** を ADR に書く（後継なき廃止の根拠）
- 後継なき廃止は `replacedBy: <root-cause-ADR-link>` のような ADR リンクで代替する例外があるが、AR rule 違反としてレビュー必須

## 整合性ペア (registry+guard) の追加 / 撤退儀式

calculation 系 spec とは別に、整合性ペア (registry+guard) の追加 / 撤退は **専用 checklist**
に従う。本 PR template は「current ↔ candidate Promote Ceremony」専用、整合性ペアは:

- 採用 / 撤退判断: `references/03-implementation/canonicalization-checklist.md` (Phase I 成果物)
- selection rule: `canonicalization-principles.md §P8`
- 撤退規律 default: 同 `§P9` (step 5 直接到達、in-place migration)
- 機械検証: `integrityDomainCoverageGuard` / `integrityNoResurrectGuard`

整合性ペア追加 PR では canonicalization-checklist.md §1 を、撤退 PR では §2 を埋める。
本 template の 5 同期チェック / 状態遷移規則は適用しない (整合性ペアは Lifecycle State
Machine 不要、step 5 直接到達が default)。

## 参照

- `references/04-tracking/elements/calculations/README.md` §「Lifecycle State Machine」
- `app/src/test/guards/contentSpecLifecycleGuard.test.ts` — AR-CONTENT-SPEC-LIFECYCLE-FIELDS
- `app/src/test/calculationCanonRegistry.ts` — runtimeStatus / authorityKind / migrationTier
- `references/01-foundation/canonicalization-principles.md` — current / candidate 分離原則 (§P1-P7) + 整合性ペア selection rule (§P8) + 撤退規律 default (§P9)
- `references/03-implementation/canonicalization-checklist.md` — 整合性ペア追加 / 撤退の標準手順 (Phase I 成果物)
- `projects/active/pure-calculation-reorg/plan.md` — Promote Ceremony の運用主体（active project）

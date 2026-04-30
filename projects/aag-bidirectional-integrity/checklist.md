# checklist — aag-bidirectional-integrity

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 0: 計画 doc landing

- [x] `projects/aag-bidirectional-integrity/` を `_template` から bootstrap した
- [x] `config/project.json` に projectization (Level 3 / governance-hardening / status active / requiresLegacyRetirement=true) を記録した
- [x] `plan.md` に Phase 1〜10 + 不可侵原則 + やってはいけないこと + 5 層 drill-down + 縦スライス matrix + 破壊的変更前提 + 検証層 + §8 確認・調査事項 を記録した
- [x] `AI_CONTEXT.md` に scope (含む / 含まない) と read order と 5 層 drill-down + 3 軸 (Meta/Core/Audit) を記録した
- [x] `HANDOFF.md` に現在地と次にやること（Phase 1〜10）とハマりポイントを記録した
- [x] `projectization.md` に AAG-COA 判定 (Level 3 / requiresLegacyRetirement=true) と nonGoals を記録した
- [x] `legacy-retirement.md` の skeleton を landing した（Phase 5 で実値を埋める）

## Phase 1: AAG Meta doc (`aag/meta.md`) の新規創出 (Layer 0+1)

> 着手前 prerequisite: plan §8.5 (registry / contract 系の現実 schema 確認) + §8.8 (命名規則 / ディレクトリ階層化整合性) + §8.9 (もう一押し候補の integrate 判断: A / C / E / F / G / J)

- [ ] `references/01-principles/aag/meta.md` を新規 Create し、§1 目的 (Purpose、Layer 0、1-2 段落) を記述した
- [ ] `aag/meta.md` §2 要件 (Requirements、Layer 1) を記述した — 不変条件 + 禁則 table、各行に enforcing AR-rule + state-based 達成条件 + 達成 status (双方向 integrity / state-based / self-hosting / ratchet-down / non-performative 等)
- [ ] `aag/meta.md` §3 AAG Core 構成要素 mapping (5 層 × 5 縦スライス matrix) を記述した
- [ ] `aag/meta.md` §4 達成判定総括 (全要件の達成度サマリ + 不達成解消責務) を記述した
- [ ] `references/01-principles/aag/README.md` を新規 Create した (aag/ ディレクトリ index、CLAUDE.md からの 1 link entry)
- [ ] `docs/contracts/doc-registry.json` に新 doc 群 (`aag/meta.md` + `aag/README.md`) を登録した
- [ ] CLAUDE.md AAG セクションに `aag/README.md` への 1 行索引 link を追加した (詳細薄化は Phase 4)
- [ ] charter doc の人間 review を経て確定した (Constitution 改訂と同等の慎重さ)

## Phase 2: AAG rule metadata 拡張 (semantic articulation 構造)

> 着手前 prerequisite: plan §8.2 (architectureRules.ts の現実 schema 確認) + §8.9 (`principleRefs` semantic 化検討)

- [ ] `architectureRules/defaults.ts` の rule entry schema に `canonicalDocRef: Array<{ docPath, problemAddressed, resolutionContribution }>` を追加した
- [ ] 同 schema に `metaRequirementRefs: Array<{ requirementId, problemAddressed, resolutionContribution }>` を追加した
- [ ] `guardCategoryMap.ts` の対応 field を追加した (または schema 統合)
- [ ] 既存全 AR-NNN rule に `canonicalDocRef: []` + `metaRequirementRefs: []` 空 array で初期化した
- [ ] TypeScript 型定義の整合を確認した (build / lint PASS)

## Phase 3: AAG Core doc audit (4 層位置付け + 責務 + drill-down semantic + operation 判定)

> 着手前 prerequisite: plan §8.1 (8 doc + CLAUDE.md AAG セクションの実 inbound link 数 grep) + §8.3 (5 縦スライス整合性検証) + §8.4 (Layer 3 / Layer 4 境界 identify) + §8.7 (Layer 2 doc 状態確認)

各 AAG 関連 doc に対して:

- [ ] **5 層位置付け** (Layer 0/1/2/3/4 / 境界 のどれか) を articulate した
- [ ] **責務** (1 doc 1 責務、C1 適用) を articulate した
- [ ] **書くべきこと (write list)** + **書かないこと (non-write list)** を articulate した
- [ ] **drill-down pointer** (上位 back-pointer + 下位 drill-down) を articulate した
- [ ] **必要 operation** (Create / Split / Merge / Rename / Relocate / Rewrite / Archive のどれか、複数可) を判定した
- [ ] **影響範囲 inventory** (inbound link 数 / 索引 / registry / guard binding) を集約した
- [ ] **migration order** (operation 間の依存 + commit 順序) を articulate した

追加 deliverable:

- [ ] AR-rule canonization mapping (人間語 → AR rule ID 候補) を作成した
- [ ] gap 識別 / redundancy 識別 / staleness 識別を完了した
- [ ] 5 縦スライス境界の reshape 必要性を判定した
- [ ] Layer 3 (実装) と Layer 4 (検証) に混在している guard を identify した
- [ ] audit 結果を `references/02-status/aag-doc-audit-report.md` に集約した

## Phase 4: AAG Core doc content refactoring (新規書き起こし優先)

> 着手前 prerequisite: Phase 3 audit 完了 + plan §8.8 (命名 / ディレクトリ整合性) + Phase 1 aag/meta.md skeleton 完了

operation 順序:

- [ ] **Create 段階**: 新 path に新 doc を直接 Create (`aag/strategy.md` / `aag/architecture.md` / `aag/evolution.md` / `aag/layer-map.md` / `aag/source-of-truth.md` / `aag/operational-classification.md`)
- [ ] **Split / Merge / Rewrite 段階**: 旧 doc から内容を選別して新 doc に書き起こし、5 層位置付け + drill-down pointer + semantic articulation を装着した
- [ ] Layer 3 (実装) と Layer 4 (検証) を明示分離した (混在 guard の責務再分離)
- [ ] **CLAUDE.md AAG セクション薄化**: 「AAG を背景にした思考」の core を `aag/meta.md` に逃がし、CLAUDE.md は `aag/README.md` への 1 link 索引のみにした
- [ ] **doc-registry.json + principles.json + manifest.json** を更新した (新 doc 登録、旧 doc は deprecation marker 段階)
- [ ] 各 operation 独立 commit で履歴を残した、parallel comparison 期間に entered

## Phase 5: legacy 撤退 (旧 doc archive、inbound 0 trigger)

> 着手前 prerequisite: Phase 4 完了 + 旧 path への inbound migration 完了

- [ ] `legacy-retirement.md` を実値で update した (Phase 3 audit の Archive 候補対象を埋める)
- [ ] 各旧 doc の **inbound 0 機械検証** を実施した (旧 path への参照を全 doc / 全 registry / 全 guard binding で grep)
- [ ] inbound 0 確認した旧 doc を `references/99-archive/` に移管した (migrationRecipe + 履歴付き)
- [ ] 99-archive 配下の旧 doc に対する inbound も 0 になった file を物理削除した (即時、buffer なし)
- [ ] doc-registry.json + principles.json + manifest.json の reflect を完了した

## Phase 6: 既存 AR-NNN rule の audit + binding (partial)

> 着手前 prerequisite: Phase 3 audit 完了 + Phase 4 refactor 完了 (新 path で binding 記入)

- [ ] Phase 3 mapping を input に既存 100+ AR-NNN rule を A/B/C/D 4 分類で audit した
- [ ] 分類 A の rule に `canonicalDocRef` + `metaRequirementRefs` を semantic articulation 付きで即時記入した
- [ ] 分類 D の rule の sunset trigger を確定した
- [ ] 分類 B/C は後続 sprint で漸次対応する旨を HANDOFF に明示した
- [ ] audit 結果を `references/02-status/ar-rule-audit.md` に記録した

## Phase 7: Layer 2 doc に back link section + drill-down semantic 装着

> 着手前 prerequisite: plan §8.7 (Layer 2 doc の rule canonization 状態確認) + Phase 6 binding 完了

- [ ] `04-design-system/docs/` 関連 doc に `## Mechanism Enforcement` section を追加した
- [ ] `01-principles/` 関連 doc (rule 定義系) に同 section を追加した
- [ ] `03-guides/` 関連 doc (数値表示ルール / coding-conventions 等) に同 section を追加した
- [ ] 各 section の各 entry が **3 要素を保持** (AR rule ID + 要件 ID + architect 寄与 articulation) を確認した

## Phase 8: forward / reverse meta-guard 実装 (Layer 4 検証層)

> 着手前 prerequisite: Phase 2 schema 拡張完了 + Phase 6 / Phase 7 binding 完了 + plan §8.9 C / H 候補の判断

- [ ] `canonicalDocRefIntegrityGuard.test.ts` (reverse) を新設し、各 AR rule の `canonicalDocRef` の各 entry について docPath 実在 + rule ID 出現 + articulation non-empty を検証した
- [ ] `canonicalDocBackLinkGuard.test.ts` (forward) を新設し、canonical doc の `## Mechanism Enforcement` section の各 entry について AR ID + 要件 ID + articulation non-empty を検証した
- [ ] (option) `metaRequirementBindingGuard.test.ts` を新設した (Layer 1 ↔ Layer 3 binding 検証)
- [ ] (option / candidate C) `selfHostingGuard.test.ts` を新設した (aag/meta.md 自身が AR-rule に linked + 内部整合性 hard check)
- [ ] 例外 allowlist の baseline を機械管理した (ratchet-down のみ、増加禁止)
- [ ] 新 rule 追加 PR で immediate enforcement が hard fail することを synthetic 注入で確認した
- [ ] aag/meta.md §2 の **双方向 integrity 要件 status が「未達成」→「達成」に flip** した

## Phase 9: DFR registry (Layer 2 新規製本)

> 着手前 prerequisite: Phase 8 meta-guard landing 完了 + plan §8.6 DFR-001〜005 の実 baseline survey 完了

- [ ] `references/01-principles/aag/display-rule-registry.md` を新設した
- [ ] DFR-001 chart semantic color を rule entry として登録した (Layer 1 source link / Layer 2 doc link / bypass pattern / 適用 path / migrationRecipe / metaRequirementRefs semantic 付き)
- [ ] DFR-002 axis formatter via useAxisFormatter を登録した
- [ ] DFR-003 percent via formatPercent を登録した
- [ ] DFR-004 currency via formatCurrency を登録した (thousands separator 明文化)
- [ ] DFR-005 icon via pageRegistry / emoji canonical を登録した
- [ ] Phase 3 で gap 判定された他 rule に対する新規 doc を必要なものに限定して新設した (anti-bloat 適用)
- [ ] `content-and-voice.md` の "thousands-separator convention is not enforced" 記述を更新した
- [ ] `doc-registry.json` に新規 doc を登録した

## Phase 10: 表示 rule guards 実装 (Layer 4 検証層 instances)

> 着手前 prerequisite: Phase 8 meta-guard landing 完了 + Phase 9 DFR registry landing 完了

- [ ] `displayRuleGuard.test.ts` を rule registry framework として新設した
- [ ] DFR-001〜005 を `architectureRules/defaults.ts` + `guardCategoryMap.ts` に登録した (semantic articulation 付き)
- [ ] DFR-001 baseline 確定 (CHART-004 / CHART-005 の semantic 不使用)
- [ ] DFR-002 baseline 確定 (FactorDecomp / BudgetVsActual.builders 等の `toAxisYen` 直接呼び)
- [ ] DFR-003 baseline 確定 (BudgetTrend / Seasonal 等の `Math.round(v * 100)`)
- [ ] DFR-004 baseline 確定 (survey 結果から)
- [ ] DFR-005 baseline 確定 (survey 結果から)
- [ ] 各 rule の migrationRecipe を記入した (fix 方法を機械生成可能に)
- [ ] Phase 8 reverse meta-guard が DFR-001〜005 全てに対して PASS した (双方向 integrity 成立)
- [ ] aag/meta.md §2 の **performative 防止 要件 status が「未達成」→「達成」に flip** した

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase (1〜10) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する

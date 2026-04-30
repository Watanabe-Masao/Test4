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
- [x] `plan.md` に Phase 1〜9 + 不可侵原則 + やってはいけないこと を記録した
- [x] `AI_CONTEXT.md` に scope (含む / 含まない) と read order を記録した
- [x] `HANDOFF.md` に現在地（spawn 直後）と次にやること（Phase 1〜9）と ハマりポイントを記録した
- [x] `projectization.md` に AAG-COA 判定 (Level 3 / requiresLegacyRetirement=true) と nonGoals を記録した
- [x] `legacy-retirement.md` の skeleton を landing した（Phase 4 で実値を埋める）

## Phase 1: AAG Meta charter doc の新規創出

- [ ] `references/01-principles/aag-meta.md` を新規作成し、§1 identity (AAG とは何であり何でないか) を記述した
- [ ] `aag-meta.md` §2 goals (解決する問題) を記述した — 動くが意図に反するコードの即時検出 / 過去判断の文脈消失防止 / 暗黙知の形式知化 / 改善の不可逆化 / 双方向 integrity 等
- [ ] `aag-meta.md` §3 limits (解決できない問題) を記述した — 設計の良し悪し / 業務的妥当性 / 創造性 / 戦略判断 / 意味的意図 (= CLAUDE.md 領分) との境界明示
- [ ] `aag-meta.md` §4 invariants (実現すべき性質) を記述した — 双方向 integrity (forward + reverse) / state-based trigger / self-hosting / ratchet-down / 例外管理の構造化
- [ ] `aag-meta.md` §5 non-goals (してはいけないこと) を記述した — performative work 生成 / date-based ritual 許容 / 完璧主義 / AI-人間判断の代替 / 業務 logic への侵入 / 意味改変
- [ ] `aag-meta.md` §6 boundaries (限界の honest な認識) を記述した — 検出の粗さ / Discovery 属人性 / 評価の手動性は意図的な弱さとして steady state
- [ ] `aag-meta.md` §7 他 AAG doc との境界 (Core: operational / Meta: statics / Evolution: dynamics) を記述した
- [ ] AAG Core (`adaptive-architecture-governance.md`) の「関連文書」table に back link 1 行追加した — diff 目視で意味改変ゼロを確認
- [ ] CLAUDE.md AAG セクションに 1 行索引 link を追加した
- [ ] `docs/contracts/doc-registry.json` に `aag-meta.md` を登録した
- [ ] charter doc の人間 review を経て確定した（Constitution 改訂と同等の慎重さ）

## Phase 2: AAG rule metadata 拡張

- [ ] `architectureRules/defaults.ts` の rule entry schema に `canonicalDocRef: string[]` を追加した
- [ ] `guardCategoryMap.ts` の対応 field を追加した（または schema 統合）
- [ ] 既存全 AR-NNN rule に `canonicalDocRef: []` 空 array で初期化した
- [ ] TypeScript 型定義の整合を確認した（build / lint PASS）

## Phase 3: 網羅的 doc audit (rule canonization mapping + gap analysis)

- [ ] `references/` 配下全 doc inventory を作成した（path / 役割 / 分類: rule-defining / rule-using / status / archive / template）
- [ ] 各 rule-defining doc が canonize している rule を抽出した（人間語 → AR rule ID 候補マッピング）
- [ ] gap 識別を完了した（実装 / 慣習として確立しているが doc 化されていない rule の候補）
- [ ] redundancy 識別を完了した（同一概念を複数 doc が説明している箇所、conflict があれば flag）
- [ ] staleness 識別を完了した（archived / superseded / 内容が古い doc）
- [ ] audit 結果を `references/02-status/doc-audit-report.md` に集約した

## Phase 4: legacy 撤退 (不要 doc 整理 + 冗長性解消 + 不足補完)

- [ ] `legacy-retirement.md` に Phase 4 の sunset / consolidation / 補完計画を確定した
- [ ] staleness 判定 doc 全件の判定（即時 sunset / 漸次 sunset / 維持）を確定した
- [ ] sunset 判定 doc を `99-archive/` に移管した（migrationRecipe 付き、物理削除は段階）
- [ ] redundancy 判定対象の正本確定 + 他 doc の back link 化を完了した
- [ ] gap 補完の必要最低限 doc を新設した（Phase 8 と区別、即時補完が前提整理に必要なもののみ）
- [ ] doc-registry.json に変更を反映した

## Phase 5: 既存 AR-NNN rule の audit + binding (partial)

- [ ] Phase 3 mapping を input に既存 100+ AR-NNN rule を A/B/C/D 4 分類で audit した
- [ ] 分類 A（自明な既製本）の rule に `canonicalDocRef` を即時記入した
- [ ] 分類 D（撤回判定）の rule の sunset trigger を確定した
- [ ] 分類 B/C は後続 sprint で漸次対応する旨を HANDOFF に明示した
- [ ] audit 結果を `references/02-status/ar-rule-audit.md` に記録した

## Phase 6: Layer 2 既存 doc に back link section 追加

- [ ] `04-design-system/docs/` 関連 doc に `## Mechanism Enforcement` section を追加した
- [ ] `01-principles/` 関連 doc（rule 定義系）に同 section を追加した
- [ ] `03-guides/` 関連 doc（数値表示ルール / coding-conventions 等）に同 section を追加した
- [ ] 各 section が指す AR rule ID 一覧と Phase 5 分類 A の binding が双方向で整合した

## Phase 7: forward / reverse meta-guard 実装

- [ ] `canonicalDocRefIntegrityGuard.test.ts` (reverse) を新設した
- [ ] reverse guard が各 AR rule の `canonicalDocRef` 必須化 + path 実在 + doc 内 rule ID 出現を検証した
- [ ] `canonicalDocBackLinkGuard.test.ts` (forward) を新設した
- [ ] forward guard が canonical doc の Mechanism Enforcement section が指す AR ID の実在を検証した
- [ ] 例外 allowlist の baseline を機械管理した（ratchet-down のみ、増加禁止）
- [ ] 新 rule 追加 PR で immediate enforcement が hard fail することを synthetic 注入で確認した

## Phase 8: 新規製本創出 (Phase 3 で identified gaps + display-rule registry)

- [ ] `references/01-principles/display-rule-registry.md` を新設した（Phase 8 の最重要 instance）
- [ ] DFR-001 chart semantic color を rule entry として登録した（Layer 1 source link / Layer 2 doc link / bypass pattern / 適用 path / migrationRecipe）
- [ ] DFR-002 axis formatter via useAxisFormatter を登録した
- [ ] DFR-003 percent via formatPercent を登録した
- [ ] DFR-004 currency via formatCurrency を登録した（thousands separator 明文化）
- [ ] DFR-005 icon via pageRegistry / emoji canonical を登録した
- [ ] Phase 3 で gap 判定された他 rule に対する新規 doc を必要なものに限定して新設した（anti-bloat 適用）
- [ ] `content-and-voice.md` の "thousands-separator convention is not enforced" 記述を更新した
- [ ] `doc-registry.json` に新規 doc を登録した

## Phase 9: 表示 rule guards 実装

- [ ] `displayRuleGuard.test.ts` を rule registry framework として新設した
- [ ] DFR-001〜005 を `architectureRules/defaults.ts` + `guardCategoryMap.ts` に登録した
- [ ] DFR-001 baseline 確定（CHART-004 / CHART-005 の semantic 不使用）
- [ ] DFR-002 baseline 確定（FactorDecomp / BudgetVsActual.builders 等の `toAxisYen` 直接呼び）
- [ ] DFR-003 baseline 確定（BudgetTrend / Seasonal 等の `Math.round(v * 100)`）
- [ ] DFR-004 baseline 確定（survey 結果から）
- [ ] DFR-005 baseline 確定（survey 結果から）
- [ ] 各 rule の migrationRecipe を記入した（fix 方法を機械生成可能に）
- [ ] Phase 7 reverse meta-guard が DFR-001〜005 全てに対して PASS した（双方向 integrity 成立）

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase (1〜9) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する

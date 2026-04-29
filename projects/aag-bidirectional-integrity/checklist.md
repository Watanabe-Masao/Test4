# checklist — aag-bidirectional-integrity

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 0: 計画 doc landing

- [x] `projects/aag-bidirectional-integrity/` を `_template` から bootstrap した
- [x] `config/project.json` に projectization (Level 4 / governance-hardening / status active) を記録した
- [x] `plan.md` に Phase 1〜7 + 不可侵原則 + やってはいけないこと を記録した
- [x] `AI_CONTEXT.md` に scope (含む / 含まない) と read order を記録した
- [x] `HANDOFF.md` に現在地（spawn 直後）と次にやること（Phase 1〜7）と ハマりポイントを記録した
- [x] `projectization.md` に AAG-COA 判定 (Level 4) と nonGoals を記録した

## Phase 1: 双方向 integrity meta-rule の AAG core 文書化

- [ ] `adaptive-architecture-governance.md` に「双方向 integrity」章を追加した（forward / reverse の定義 + 図示 + 例）
- [ ] meta-rule の例外カテゴリ（pure mechanism rule allowlist）を明示した
- [ ] 例外 list の改廃のための review window 経路を明示した
- [ ] 章の人間 review を経て確定した（Constitution 改訂と同等の慎重さ）

## Phase 2: AAG rule metadata 拡張

- [ ] `architectureRules/defaults.ts` の rule entry schema に `canonicalDocRef: string[]` を追加した
- [ ] `guardCategoryMap.ts` の対応 field を追加した（または schema 統合）
- [ ] 既存全 AR-NNN rule に `canonicalDocRef: []` 空 array で初期化した
- [ ] TypeScript 型定義の整合を確認した（build / lint PASS）

## Phase 3: 既存 AR-NNN rule の audit + binding（partial）

- [ ] 既存 100+ AR-NNN rule を A/B/C/D 4 分類で audit した（結果を `references/02-status/` に記録）
- [ ] 分類 A（自明な既製本）の rule に `canonicalDocRef` を即時記入した
- [ ] 分類 D（撤回判定）の rule の sunset trigger を確定した
- [ ] 分類 B/C は後続 sprint で漸次対応する旨を HANDOFF に明示した

## Phase 4: Layer 2 既存 doc に back link section 追加

- [ ] `04-design-system/docs/` 関連 doc に `## Mechanism Enforcement` section を追加した
- [ ] `01-principles/` 関連 doc（rule 定義系）に同 section を追加した
- [ ] `03-guides/` 関連 doc（数値表示ルール / coding-conventions 等）に同 section を追加した
- [ ] 各 section が指す AR rule ID 一覧と Phase 3 分類 A の binding が双方向で整合した

## Phase 5: forward / reverse meta-guard 実装

- [ ] `canonicalDocRefIntegrityGuard.test.ts` (reverse) を新設した
- [ ] reverse guard が各 AR rule の `canonicalDocRef` 必須化 + path 実在 + doc 内 rule ID 出現を検証した
- [ ] `canonicalDocBackLinkGuard.test.ts` (forward) を新設した
- [ ] forward guard が canonical doc の Mechanism Enforcement section が指す AR ID の実在を検証した
- [ ] 例外 allowlist の baseline を機械管理した（ratchet-down のみ、増加禁止）
- [ ] 新 rule 追加 PR で immediate enforcement が hard fail することを synthetic 注入で確認した

## Phase 6: 表示 rule registry 製本化（Layer 3）

- [ ] `references/01-principles/display-rule-registry.md` を新設した
- [ ] DFR-001 chart semantic color を rule entry として登録した（Layer 1 source link / Layer 2 doc link / bypass pattern / 適用 path / migrationRecipe）
- [ ] DFR-002 axis formatter via useAxisFormatter を登録した
- [ ] DFR-003 percent via formatPercent を登録した
- [ ] DFR-004 currency via formatCurrency を登録した（thousands separator 明文化）
- [ ] DFR-005 icon via pageRegistry / emoji canonical を登録した
- [ ] `content-and-voice.md` の "thousands-separator convention is not enforced" 記述を更新した
- [ ] `doc-registry.json` に `display-rule-registry.md` を登録した

## Phase 7: 表示 rule guards 実装

- [ ] `displayRuleGuard.test.ts` を rule registry framework として新設した
- [ ] DFR-001〜005 を `architectureRules/defaults.ts` + `guardCategoryMap.ts` に登録した
- [ ] DFR-001 baseline 確定（CHART-004 / CHART-005 の semantic 不使用）
- [ ] DFR-002 baseline 確定（FactorDecomp / BudgetVsActual.builders 等の `toAxisYen` 直接呼び）
- [ ] DFR-003 baseline 確定（BudgetTrend / Seasonal 等の `Math.round(v * 100)`）
- [ ] DFR-004 baseline 確定（survey 結果から）
- [ ] DFR-005 baseline 確定（survey 結果から）
- [ ] 各 rule の migrationRecipe を記入した（fix 方法を機械生成可能に）
- [ ] Phase 5 reverse meta-guard が DFR-001〜005 全てに対して PASS した（双方向 integrity 成立）

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase (1〜7) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する

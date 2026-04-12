# plan — aag-collector-purification

## 不可侵原則

1. **Phase 1 → 2 → 3 の順序を逆転させない** — 純化前に strict 化や抑制削除をすると pure-calculation-reorg の集計が壊れる
2. **pure-calculation-reorg の達成条件 (Phase 0-11 の checkbox) を変えない** — フォーマットだけを純化する。`[x]` / `[ ]` の状態は維持する
3. **heading 抑制を削除する前に format guard を strict 化する** — 順序逆転で false negative が出る
4. **規約と実装の対称性を test で固定する** — heading 抑制削除だけでは再発防止にならない。symmetry guard を必須にする
5. **governance §3 の規約自体は変更しない** — 実装を規約に揃えるのが目的。規約を実装に合わせるのは方向が逆

## Phase 構造

### Phase 1: pure-calculation-reorg/checklist.md の純化

`pure-calculation-reorg/checklist.md` を以下の方針で書き換える:

- Phase 0-11 の **達成条件 checkbox だけ** を残す
- 各 Phase 内の `**やってはいけないこと**` セクション → `pure-calculation-reorg/plan.md` の不可侵原則 / 禁止事項テーブルに移動
- ファイル末尾の `## 常時チェック` セクション → CONTRIBUTING.md または `references/03-guides/coding-conventions.md` の開発フローに移動
- ファイル末尾の `## 4つだけ毎回見る最重要項目` セクション → `pure-calculation-reorg/plan.md` の Phase 11 完了後の確認項目に移動

純化後、`npm run docs:generate` で project-health の数字が **変わらないこと** を確認する
（現状 88/132 は collector が heading 抑制で除外しているため、純化しても同じ数字になるはず）。

### Phase 2: format guard の strict 化

- `app/src/test/guards/checklistFormatGuard.test.ts` の `FORMAT_EXEMPT_PROJECT_IDS` から `pure-calculation-reorg` を削除
- F3-F5 検出が全 project に適用されることを確認
- `npm run test:guards` が PASS することを確認
- もし `pure-calculation-reorg` で違反が出たら Phase 1 が不完全 → Phase 1 に戻る

### Phase 3: collector の heading 抑制ロジック削除 + 対称性 guard 追加

- `tools/architecture-health/src/collectors/project-checklist-collector.ts::countCheckboxes`
  から「やってはいけないこと / 常時チェック / 最重要項目」セクション抑制 if 文を削除
- `quick-fixes` collection の動作に regression がないことを確認
- 新規 guard `checklistGovernanceSymmetryGuard.test.ts` を追加し、governance §3 が禁止する
  見出しが全 live project の checklist.md に存在しないことを検証する
- governance §3 の冒頭に「symmetry guard で機械検証されている」旨を追記

### Phase 4: 文書同期

- `references/03-guides/project-checklist-governance.md` §3 と §8 の関連実装表に
  symmetry guard を追加
- `references/01-principles/aag-5-constitution.md` Layer 3 Execution 一覧に追加
- 本 project の HANDOFF.md 末尾に `Archived: YYYY-MM-DD` を追記し archive プロセスを実行

## やってはいけないこと

- Phase 順序を逆転させる → 集計が破壊される
- pure-calculation-reorg の checkbox 状態 (`[x]` / `[ ]`) を変更する → 進行管理がぶれる
- heading 抑制ロジックを削除する前に strict 化を skip する → false negative
- governance §3 の規約自体を変更する → 方向が逆。実装を規約に揃える
- symmetry guard なしで完了とする → 再発防止が機能しない
- 本 project の作業中に pure-calculation-reorg の Phase 8-11 進行を blocking する
  → 並行進行を尊重する。可能なら 1 commit で完結させる

## 関連実装

| パス | 役割 |
|---|---|
| `tools/architecture-health/src/collectors/project-checklist-collector.ts` | Phase 3: heading 抑制削除 |
| `app/src/test/guards/checklistFormatGuard.test.ts` | Phase 2: strict 化 |
| `app/src/test/guards/checklistGovernanceSymmetryGuard.test.ts` | Phase 3: 新規追加 (再発防止) |
| `projects/pure-calculation-reorg/checklist.md` | Phase 1: 純化対象 |
| `projects/pure-calculation-reorg/plan.md` | Phase 1: 移動先 |
| `references/03-guides/project-checklist-governance.md` | Phase 4: 文書同期 |
| `references/01-principles/aag-5-constitution.md` | Phase 4: 文書同期 |
| `CONTRIBUTING.md` または `references/03-guides/coding-conventions.md` | Phase 1: 常時チェック移動先 |

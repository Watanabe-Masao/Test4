# plan — docs-and-governance-cohesion

## 不可侵原則

1. **ドキュメントに live task を書かない** — references/ / CLAUDE.md / roles/ から live task table を一切排除する
2. **checklist に機能説明を書かない** — checklist.md は completion 判定の入力だけを持つ
3. **completion は collector が動的に判定する** — 人間が手動で `status: completed` を書かない
4. **archive は collector の derivedStatus を見てから手動で行う** — 自動 archive はしない

## Phase 構造

### Phase 1: project / checklist 運用ルールの正本ガイド作成

`references/03-guides/project-checklist-governance.md` を作成し、本 project の
規約の正本にする。

### Phase 2: 5 live project スケルトン作成

| projectId | scope |
|---|---|
| `data-load-idempotency-hardening` | idempotent load contract 残存防御 |
| `presentation-quality-hardening` | active-debt 残 + 500 行超 + coverage + E2E |
| `docs-and-governance-cohesion` | 本 project（live task 集約 + AAG 統合） |
| `architecture-decision-backlog` | 未決定の設計判断 (R-9 ロール軽量化など) |
| `aag-rule-splitting-execution` | AR-STRUCT-RESP-SEPARATION 7 分割実装 |

### Phase 3: 既存 docs から live task 移管

verification (2026-04-12) を経て LIVE と確定した item だけを各 project の
checklist.md に転記する。DONE / STALE / PARTIAL は転記しない。

### Phase 4: references/ を機能説明だけに縮退

`data-load-idempotency-plan.md` / `data-load-idempotency-handoff.md` /
`read-path-duplicate-audit.md` / `active-debt-refactoring-plan.md` 等から
live task table を削除する。背景・歴史・契約・原則は残置する。
各文書冒頭に「live task は projects/<id>/checklist.md を参照」の導線を入れる。

### Phase 5: open-issues.md の縮退

「現在の課題 / 将来のリスク / 次に取り組むべきこと」を全削除し、
**active project の索引** に縮退する:

```markdown
# active projects 索引

| projectId | title | entrypoint |
|---|---|---|
| ... | ... | projects/<id>/AI_CONTEXT.md |
```

「解決済み」セクションは履歴として残す。

### Phase 6: technical-debt-roadmap.md の縮退

live な改善 project 表を削除し、judgment rationale (どの優先順位で何を
やる/やらないと決めたか) だけを残す。

### Phase 7: project checklist collector 追加

`tools/architecture-health/src/collectors/project-checklist-collector.ts` を新設。
`projects/**/config/project.json` を列挙し、checklist の required checkbox を
カウントして KPI を返す:

```ts
{ projects: { active: N, completed: N, archived: N },
  perProject: [{ projectId, total, checked, derivedStatus }] }
```

### Phase 8: checklist format guard 追加

`app/src/test/guards/checklistFormatGuard.test.ts` を新設。
`projects/<id>/checklist.md` で以下を機械検出する:
- ネスト checkbox の禁止
- 「やってはいけないこと」セクションの checkbox 禁止
- 「常時チェック」セクションの checkbox 禁止
- `* [x]` / `* [ ]` 以外の形式禁止

### Phase 9: completion consistency guard 追加

`app/src/test/guards/projectCompletionConsistencyGuard.test.ts` を新設。
以下を検出:
- `CURRENT_PROJECT.md` の `active` が実在 project を指す
- active project が `projects/completed/` 配下にない
- collector が completed と判定した project が `projects/completed/` に配置されている

### Phase 10: generated project-health 追加

`references/02-status/generated/project-health.json` / `.md` を生成。
collector の出力を JSON として serialize + 人間可読な markdown view を出力。

### Phase 11: architecture-health に project KPI 統合

architecture-health.md / .json に project KPI セクションを追加し、
hard gate の対象に「未配置 completed project 数 = 0」「inconsistent active = 0」を含める。

### Phase 12: projects/completed/ 導入

物理 directory `projects/completed/` を作成。実際の archive は本 project で
は行わず、archive 手順だけ確立する。

### Phase 13: archive 手順固定

`references/03-guides/project-checklist-governance.md` §6 に archive 手順を
明文化（既に Phase 1 で追加済み）。Phase 12 で directory 構造を整えた後に
runbook を完成させる。

## やってはいけないこと

- references/ から live task を移管したつもりで残置する → drift の温床
- collector / guard を入れる前に checklist の format を強制する → 開発停止
- pure-calculation-reorg/checklist.md の format を本 project 内で書き換える
  → 既存 project の運用と衝突。pure-calculation-reorg は既存形式を尊重し、
    新 project だけ新規 format で進める
- archive を自動化する → 不可逆操作はレビューを通す

## 関連実装

| パス | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 規約の正本 |
| `tools/architecture-health/src/collectors/project-checklist-collector.ts` | Phase 7 |
| `app/src/test/guards/checklistFormatGuard.test.ts` | Phase 8 |
| `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` | Phase 9 |
| `references/02-status/generated/project-health.json` | Phase 10 |
| `references/02-status/generated/project-health.md` | Phase 10 |
| `projects/completed/` | Phase 12 |

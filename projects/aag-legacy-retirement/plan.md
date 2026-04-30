# plan — aag-legacy-retirement

> **正本**: 親 project (`projects/aag-bidirectional-integrity/plan.md`) の §Phase 5 + §3.5 操作順序原則 +
> §1.5 archive 前 mapping 義務 を継承。Project A (`projects/aag-core-doc-refactor/`) の Phase 5 で
> 完遂しない複雑案件を本 project に分離。

## 不可侵原則

1. **Project A 完了 dependence**: 本 project は **Project A Phase 5 完了後** にのみ着手。Project A で完遂可能な
   単純 archive 案件は Project A で完遂し、本 project に持ち込まない (= 本 project は Project A の overflow
   バッファではなく、明確に「複雑案件のみ」を担当)。
2. **inbound 0 trigger のみ**: archive trigger は **inbound 参照 0 件の機械検証** のみ。期間 buffer
   (例: 30 日待機) は anti-ritual として絶対禁止 (親 plan §3.5 / Project A 不可侵原則 2 と同一)。
3. **archive 前 mapping 義務**: 旧 doc を archive する前に、新 doc に「旧概念 → 新概念 mapping table」が
   landed 済を機械検証で確認 (親 plan §1.5 / Project A 不可侵原則 5 と同一)。
4. **物理削除 trigger は人間判断必須**: archive 配下 file への inbound 0 機械検証 PASS 後の物理削除は
   AI が判断しない。frontmatter `humanDeletionApproved: true` + `approvedBy` + `approvedCommit` の
   articulate を人間レビューアが行った後にのみ AI が物理削除 commit を実行。
5. **必要性の re-evaluate**: 本 project が **必要かどうかは Project A Phase 5 進捗に依存**。Project A Phase 5
   で全件完遂したなら本 project は不要 (archive 候補に migrate)。Phase 1 で必要性を re-evaluate する。
6. **scope 越境禁止**: AAG Core doc content refactor / AR-rule schema 拡張 / meta-guard 実装 / DFR registry
   構築は Project A / B / C 所掌、本 project では touch しない。
7. **段階パス厳守 (§3.5 操作順序原則)**: Split が必要な doc は新 path Create → Split → Rewrite → archive の順。
   edit-in-place は禁止。

## Phase 構造

### Phase 1: 必要性 re-evaluate + 拡張案件 inventory

**目的**: Project A Phase 5 完了後、本 project の必要性を re-evaluate し、拡張案件を inventory する。

**deliverable**:
- Project A Phase 5 完遂状況の確認 (各旧 doc の archive 移管完了 / 未完了の identify)
- 未完遂 doc の **複雑性分析** (Split 必要 / 複数 doc 横断 / inbound 60+ 件 等の判定基準)
- 本 project の **継続判断** (case A: 拡張案件あり → 継続、case B: なし → 本 project archive 候補に migrate)
- `references/02-status/legacy-retirement-extended.md` 新設 (拡張案件 articulation の集約 doc)

**完了条件**: 必要性 re-evaluate 完了、case A の場合は拡張案件 inventory 完備、case B の場合は本 project
archive プロセス着手。

### Phase 2: 拡張案件の Split + Rewrite (case A 限定)

**目的**: 識別された複雑 archive 案件 (例: `adaptive-architecture-governance.md` の Split + 部分 Archive) の
Split + Rewrite を実行 (§3.5 操作順序原則)。

**deliverable** (case A の各拡張案件ごと):
- 旧 doc の責務分割 articulate (例: `adaptive-architecture-governance.md` = 戦略マスター + 文化論 + 旧 4 層 +
  バージョン履歴 同居 → 4 分割)
- Split 先の新 doc (or 既存 doc) への内容書き起こし (Project A の `aag/` 配下 doc を活用)
- 各分割成果物の独立 commit
- archive 前 mapping table の landing (新 doc 内に「旧概念 → 新概念 mapping」articulate)

**完了条件**: 各拡張案件の Split + Rewrite 完遂、新 doc に mapping 装着済、build / lint / docs:check 全 PASS。

### Phase 3: 拡張案件の inbound migration + archive 移管 (case A 限定)

**目的**: 各拡張案件の inbound 全件を新 doc に書き換え、inbound 0 機械検証後に archive 移管。

**deliverable** (case A の各拡張案件ごと):
- inbound grep + 全件 update (`git grep "<旧 path>"` で 0 件確認)
- archive 移管 (`mv references/01-principles/<旧 path>.md references/99-archive/<旧 path>.md`)
- frontmatter `archived: true` + `archivedAt` + `archivedBy` 追加
- `docs/contracts/doc-registry.json` の archive section update

**完了条件**: 全拡張案件の archive 移管完了、inbound 0 機械検証 PASS、docRegistryGuard / docCodeConsistencyGuard 全 PASS。

### Phase 4: 物理削除 (人間判断後、case A 限定)

**目的**: archive 配下 file への inbound 0 機械検証 PASS 後、人間判断を待って物理削除を実行。

**deliverable**:
- 各 archive file の frontmatter `humanDeletionApproved: true` + `approvedBy` + `approvedCommit` の articulate (人間レビューアが記入)
- AI 側で `humanDeletionApproved: true` を検出した case のみ物理削除 commit を実行
- 物理削除完遂を本 project HANDOFF / 親 project HANDOFF に通知 update

**完了条件**: 全 archive file の物理削除完了 (人間 approval 後)、または approval 待ち状態を articulate して本 project archive 候補に migrate。

### Phase 5: 最終レビュー (人間承認)

**目的**: 全 deliverable の人間 review 通過、archive プロセスへの移行 gate。

**deliverable**:
- 全 Phase 1〜4 の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビュー
- 親 project (`aag-bidirectional-integrity`) との archive 連動を articulate (Project A〜D 全完了で親 archive)

**完了条件**: 人間 review 通過、checklist 末尾「最終レビュー (人間承認)」 [x] flip。

## やってはいけないこと

- **Project A Phase 5 完了前に本 project Phase 2 以降を着手** → Project A の単純案件と本 project の複雑案件の境界が不明確になり scope creep (不可侵原則 1)
- **Project A で完遂可能な単純案件を本 project に持ち込む** → 本 project の scope が overflow バッファ化、Project A の MVP 完遂判定が不能になる (不可侵原則 1)
- **期間 buffer を archive trigger として導入** → anti-ritual (不可侵原則 2)
- **mapping table 不在で archive する** → 後任が変更履歴を辿れない (不可侵原則 3)
- **AI 単独で物理削除を実行** → 人間 approval gate を bypass (不可侵原則 4)
- **必要性 re-evaluate を skip して Phase 2 着手** → 不要 project が active のまま残る (不可侵原則 5)
- **scope 越境** → Project A / B / C 所掌 (不可侵原則 6)
- **edit-in-place で意味改変** → 段階パス違反 (不可侵原則 7)

## 途中判断 (decision gates)

> `references/03-guides/deferred-decision-pattern.md` 適用。詳細は checklist.md を参照。

主要な途中判断:
- **Phase 1 着手前**: Project A Phase 5 完了状況確認 (本 project 必要性 re-evaluate)
- **Phase 1 進行中**: 拡張案件の identify + 複雑性判定 (Split 必要 / 複数 doc 横断 / inbound 60+ 件 等)
- **Phase 1 結果**: case A (拡張案件あり) / case B (なし、本 project archive 候補) の判定
- **Phase 4 進行中**: 各 archive file の人間 approval 状態確認 (人間判断 gate、AI 判断しない)

## 関連実装

| パス | 役割 |
|---|---|
| `references/01-principles/adaptive-architecture-governance.md` | 複雑 archive 候補の典型例 (Split + 部分 Archive、Phase 2 で扱う可能性) |
| `references/99-archive/` | archive 配下 (Phase 3 で物理移管先) |
| `references/02-status/legacy-retirement-extended.md` | Phase 1 で新規 Create (拡張案件 articulation の集約 doc) |
| `docs/contracts/doc-registry.json` | Phase 3 で archive section update |
| `projects/aag-core-doc-refactor/plan.md` | Project A 正本 (Phase 5 完遂範囲の確認元) |
| `projects/aag-core-doc-refactor/legacy-retirement.md` | Project A の legacy-retirement (単純案件と複雑案件の境界 articulation) |

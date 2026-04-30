# legacy-retirement — aag-legacy-retirement

> 役割: 拡張 archive 案件 (Project A Phase 5 で完遂しない複雑案件) の sunset / consolidation 計画。
> 規約: `references/03-guides/projectization-policy.md` の Level 2 / requiresLegacyRetirement=true 対応。
>
> **本 project の scope**: Project A (`aag-core-doc-refactor`) の legacy-retirement.md を継承。本 doc では
> **拡張案件のみ** を articulate。

## 1. 撤退対象の判定基準 (Phase 1 で確定)

Project A Phase 5 完了状況を確認し、以下のいずれかに該当する doc を本 project の対象として inventory:

| 判定基準 | 例 |
|---|---|
| **Split 必要 + 複数 doc 横断** | `adaptive-architecture-governance.md` を 4 doc に Split + Project A の `aag/` 配下既存 doc に書き起こし |
| **inbound 60+ 件で migration 工数大** | 1 doc の inbound 数が Project A Phase 5 単独で完遂しない規模 |
| **責務同居の解きほぐし複雑** | 1 doc に 4-5 責務が同居していて、Split 粒度の判断に複数の判断軸 (旧 4 層 / 戦略 / 文化論 / 履歴 等) を要する |

**判定方法 (Phase 1 進行中判断)**:
1. Project A Phase 5 完遂状況 grep
2. 各 doc の inbound count + 責務同居数の articulate
3. case A (拡張案件あり) / case B (なし、本 project archive) を判定

## 1.5. archive 前 mapping 義務 (本 project plan 不可侵原則 3、Project A 不可侵原則 5 を継承)

Project A の同条文を継承:

> 旧 doc を archive 移管する前に、新 doc に「旧概念 → 新概念 mapping」を必ず articulate すること。

本 project の拡張案件は Project A の Phase 5 で完遂しなかった案件のため、Project A `aag/` 配下 doc の
articulate 状況を確認の上、不足する mapping は本 project Phase 2 で landing。

## 2. 段階削除原則 (anti-ritual、inbound 0 trigger、本 project plan 不可侵原則 2)

> **絶対原則** (Project A 不可侵原則 2 を継承): 物理削除の trigger は **期間 (日数 / commits 数 等) を一切
> 使わず、参照場所が 0 になった瞬間** (inbound 0 機械検証) のみ。期間 buffer は anti-ritual で絶対禁止。

archive 移管段階 (`99-archive/` 配下) は **inbound 0 機械検証** で trigger:

```
拡張案件 identify (Phase 1) → Split + Rewrite (Phase 2) → inbound 全件 update (Phase 3 段階)
  → grep "<旧 path>" 0 件 PASS → 99-archive/ に移管 (frontmatter `archived: true`)
  → 99-archive 配下 file への inbound 0 機械検証 + 人間 deletion approval (Phase 4)
  → 物理削除 (人間判断後の commit、AI 単独で判断しない)
```

## 3. 物理削除 trigger (人間判断必須、AI 判断しない、本 project plan 不可侵原則 4)

archive 移管後の **物理削除** は AI が判断しない:

| 段階 | 判断者 | 判断基準 |
|---|---|---|
| 旧 path → 99-archive 移管 | AI 自主判断 | inbound 0 機械検証 PASS + §1.5 archive 前 mapping 義務 PASS |
| 99-archive 配下 file の物理削除 | **人間レビューア** (AI でない) | 99-archive 配下 file への inbound 0 機械検証 PASS + frontmatter `humanDeletionApproved: true` + `approvedBy` + `approvedCommit` の articulate |

AI が独自判断で物理削除 commit を実行することは **禁止**。本 project checklist Phase 4 進行中判断にも明示済。

## 4. 移行手順 (case A 限定、各拡張案件ごと、Phase 2-4 で実施)

各拡張案件に対して以下のステップを順守:

1. **複雑性分析完了**: Phase 1 で「Split 必要 / 複数 doc 横断 / inbound 60+ 件」等を articulate
2. **Split 粒度確定**: 1 doc 1 責務 (C1 適用) を満たす分割案を articulate
3. **新 doc landing 確認 / 不足分の Create**: Project A `aag/` 配下 doc の articulate 状況を確認、不足する mapping は本 project で landing
4. **mapping table landing 確認**: 新 doc 内に「旧 → 新 mapping table」が articulate 済を確認
5. **inbound grep**: `git grep "<旧 path>"` で全 inbound を identify
6. **inbound 全件 update**: 各 inbound を旧 path → 新 path に書き換え (independent commits)
7. **inbound 0 機械検証**: `git grep "<旧 path>"` で 0 件確認 + docRegistryGuard / docCodeConsistencyGuard PASS
8. **archive 移管**: `mv references/01-principles/<旧 path>.md references/99-archive/<旧 path>.md` + frontmatter `archived: true` + `archivedAt` + `archivedBy` 追加
9. **doc-registry update**: 旧 path entry を archive section に移動
10. **物理削除待ち**: archive 配下 file への inbound 0 機械検証 PASS + 人間 deletion approval を待つ
11. **物理削除 (人間 approval 後)**: AI が `humanDeletionApproved: true` を検出した case のみ物理削除 commit 実行

## 5. 履歴 (Phase 1 完了時に拡張案件 inventory を articulate、各完遂時に追記)

| 日付 | 拡張案件 path | 移行先 | mapping 装着先 | inbound 0 PASS commit | archive 移管 commit | 物理削除 commit (人間 approval 後) |
|---|---|---|---|---|---|---|
| (Phase 1 で identify) | (TBD) | (TBD) | (TBD) | TBD | TBD | TBD (人間判断) |

## 6. 完遂条件

本 project の legacy-retirement は以下が全て satisfy された時に完遂:

- Phase 1 必要性 re-evaluate 完了 (case A or case B が articulate 済)
- case A の場合:
  - 全拡張案件が `references/99-archive/` に移管済 (frontmatter `archived: true` 装着)
  - 各 archive 移管前に新 doc 内 mapping table が landed 済を §5 に articulate
  - 全拡張案件への inbound 0 機械検証 PASS 状態が維持されている
  - breaking-changes.md の各 entry が完遂 articulation に flip 済
  - §5 の各拡張案件履歴 entry が完遂 articulation で fill 済
  - 物理削除は人間 approval 後にのみ実施 (本 project の MVP scope は archive 移管までが完遂条件、物理削除は人間判断 gate)
- case B の場合:
  - 本 doc は適用外 articulation を残し、本 project archive 候補に migrate
  - 最終レビュー (人間承認) checkbox を [x] flip して archive プロセスへ

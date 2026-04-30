# breaking-changes — aag-legacy-retirement

> 役割: 破壊的変更前提 (`breakingChange=true`) project の破壊対象 + 移行方針。
> 規約: `references/03-guides/projectization-policy.md` §5。
>
> **本 project の scope**: Project A (`aag-core-doc-refactor`) の Phase 5 で完遂しない複雑 archive 案件のみ。
> Project A の breaking-changes.md (§1.1〜1.4) を継承し、本 project では拡張案件のみ articulate。

## 1. 破壊対象 inventory (case A 限定、Phase 1 で確定)

> Phase 1 必要性 re-evaluate で **case A (拡張案件あり)** と判定された場合のみ articulate。
> case B (なし) なら本 doc は適用外で本 project archive。

### 1.1. 想定される拡張案件 (Phase 1 で confirm)

| 候補 | 想定される複雑性 | 移行方針 |
|---|---|---|
| `references/99-archive/adaptive-architecture-governance.md` | **Split + 部分 Archive** (戦略マスター + 文化論 + 旧 4 層 + バージョン履歴 が同居、複数の新 doc に分散書き起こし必要) | Project A `aag/` 配下 doc に分散書き起こし → 旧 doc archive (Phase 2-3) |
| (Phase 1 で identify される他の拡張案件) | (case-by-case) | (case-by-case) |

### 1.2. 移行原則 (Project A breaking-changes.md §2 を継承)

- **段階パス厳守 (§3.5)**: Create → Split / Merge / Rewrite → Archive の順
- **inbound 0 trigger のみ**: 期間 buffer 禁止 (anti-ritual)
- **archive 前 mapping 義務 (§1.5)**: 新 doc に「旧概念 → 新概念 mapping table」が landed 済を機械検証
- **物理削除 trigger は人間判断必須**: AI 単独で物理削除を実行しない

## 2. backward 互換性

本 project は **doc path の構造変更** であり、**runtime 機能の変更ではない**:

- アプリケーション機能変更なし
- domain calculation / business logic 変更なし
- 影響範囲は **Project A Phase 5 で完遂しなかった範囲のみ** に限定

backward 互換は **doc inbound update の完遂** で担保 (Project A Phase 5 と同じ枠組み)。

## 3. 完遂条件

本 project の breaking-changes は以下が全て satisfy された時に完遂:

- Phase 1 必要性 re-evaluate が完了し、case A (拡張案件あり) または case B (なし) が articulate 済
- case A の場合:
  - 全拡張案件の Split + Rewrite 完遂 (Phase 2)
  - 全拡張案件の inbound 0 機械検証 PASS + archive 移管完了 (Phase 3)
  - legacy-retirement.md の各 entry が完遂 articulation に flip
  - 物理削除は人間 approval 後にのみ実施 (Phase 4、AI 単独不可)
- case B の場合:
  - 本 doc は適用外 articulation を残し、本 project archive 候補に migrate
- 最終レビュー (人間承認) checkbox が [x] flip 済 (Phase 5)

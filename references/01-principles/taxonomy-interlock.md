# taxonomy-interlock — R:tag × T:kind Interlock マトリクス

> **役割**: 責務軸（R:*）とテスト軸（T:*）の **Interlock 契約** の正本（Constitution §4 の詳細版）。
>
> **位置付け**: `taxonomy-constitution.md` 原則 4「Tag ↔ Test は双方向契約」の運用詳細。
> `AR-TAXONOMY-INTERLOCK` rule の検証ロジックは本文書を canonical source として参照する。
>
> **改訂規律**: 本マトリクスの改訂は **review window** 経由のみ。R:tag 追加と T:kind 追加は同一 window で裁定する（原則 4 + 親 plan §OCS.4 Lifecycle）。
>
> **status**: **draft（Phase 1 起草中）**。Phase 0 Inventory で v1 タグ実態を採取後、Anchor Slice 5+6 を確定させた段階で `final` 候補。最終確定は子 Phase 3（Guard 実装）で `AR-TAXONOMY-INTERLOCK` baseline=0 達成時。

## 1. Interlock の意味

責務軸（R:*）と テスト軸（T:*）は **対称な双方向契約** で結ばれる:

| 方向 | 契約 |
|---|---|
| R:tag → T:kind | **R:tag が test obligation を発行**する。R:tag を持つファイルは、対応する required T:kind を持つ test を最低 1 件持つ |
| T:kind → R:tag | **T:kind が tag contract を検証**する。T:kind を持つ test は、対応する R:tag を持つ source の振る舞いを検証する |

Interlock が崩れると:

- R:tag が「自称」になり、振る舞い保証なし（Constitutional Correctness 破綻）
- T:kind が「孤立」し、検証対象が不明
- 片軸だけのタグ追加で全体不整合化

これを防ぐため、マトリクスは**両方向の整合**を機械検証する。

## 2. 完全マトリクス（v1 → v2 提案）

### 2.1. R:tag → 必須 T:kind / 任意 T:kind

| R:tag | 必須 T:kind | 任意 T:kind | 振る舞い保証の意味 |
|---|---|---|---|
| `R:calculation` | `T:unit-numerical`, `T:boundary` | `T:invariant-math` | 数値契約 + 境界値 + 不変条件（推奨） |
| `R:bridge` | `T:contract-parity` | `T:fallback-path` | current ⇔ candidate の振る舞い同一性 |
| `R:read-model` | `T:zod-contract`, `T:null-path` | — | parse fail fast + 欠損正常系 |
| `R:guard` | `T:meta-guard` | `T:allowlist-integrity` | guard 自身の契約テスト |
| `R:presentation` | `T:render-shape` | `T:side-effect-none` | 描画形状検証 + 副作用なし |
| `R:store` | `T:state-transition` | — | state 遷移の網羅 |
| `R:hook` | `T:dependency-list`, `T:unmount-path` | — | deps 完全性 + unmount safety |
| `R:unclassified` | なし（`T:unclassified` が対応） | — | review window 待ちの保留状態 |

### 2.2. T:kind → 検証対象 R:tag

| T:kind | 検証対象 R:tag | 検証内容 |
|---|---|---|
| `T:unit-numerical` | `R:calculation` | 数値契約（入力 → 出力の正しさ） |
| `T:boundary` | `R:calculation` | 境界値（empty / null / overflow / 0 / 負数 等） |
| `T:invariant-math` | `R:calculation` | 数学的不変条件（合計値 = 構成要素和 等） |
| `T:contract-parity` | `R:bridge` | current ⇔ candidate の同一性 |
| `T:fallback-path` | `R:bridge` | fallback 分岐の到達性 |
| `T:zod-contract` | `R:read-model` | Zod schema による parse fail fast |
| `T:null-path` | `R:read-model` | 欠損正常系（null / undefined の許容範囲） |
| `T:meta-guard` | `R:guard` | guard 自身の契約（test for tests） |
| `T:allowlist-integrity` | `R:guard` | allowlist 構造の整合性 |
| `T:render-shape` | `R:presentation` | 描画 DOM 形状の検証 |
| `T:side-effect-none` | `R:presentation` | 副作用がないことの検証 |
| `T:state-transition` | `R:store` | state 遷移の網羅性 |
| `T:dependency-list` | `R:hook` | useEffect 等の deps 完全性 |
| `T:unmount-path` | `R:hook` | unmount 時の cleanup 完全性 |
| `T:unclassified` | `R:unclassified` | 保留状態の対応 |

## 3. Anchor Slice（5 R:tag + 6 T:kind）

親 plan §OCS.7 で指定された Anchor Slice。両子 Phase 3 で end-to-end の保証経路を完成させる対象。

### Anchor Slice 5 R:tag

`R:calculation` / `R:bridge` / `R:read-model` / `R:guard` / `R:presentation`

### Anchor Slice 6 T:kind（Interlock 上の必須）

`T:unit-numerical` / `T:boundary` / `T:contract-parity` / `T:zod-contract` / `T:meta-guard` / `T:render-shape`

### Anchor Slice 配下の Interlock サブマトリクス

| R:tag | 必須 T:kind |
|---|---|
| `R:calculation` | `T:unit-numerical`, `T:boundary` |
| `R:bridge` | `T:contract-parity` |
| `R:read-model` | `T:zod-contract` |
| `R:guard` | `T:meta-guard` |
| `R:presentation` | `T:render-shape` |

> **目的**: Anchor Slice の目的は「対象網羅」ではなく **「保証経路完成」**（親 plan §OCS.7）。
> 5 R:tag + 6 T:kind で Constitution → registry → guard → CI → health KPI の end-to-end が
> 動作することを確認する。これが動けば、後続は同じ仕組みの拡大。

## 4. AR-TAXONOMY-INTERLOCK 検証ロジック

### 4.1. 検出ロジック（仕様正本）

`AR-TAXONOMY-INTERLOCK` は次の 2 段階で検証する:

**段階 1: R → T 検証（必須 T:kind の存在）**

```
for each source file F with R:tag in {R1, R2, ...}:
  for each Ri:
    required_T_kinds = matrix.requiredOf(Ri)
    for each Tj in required_T_kinds:
      if no test file links to F with T:kind=Tj:
        FAIL: "F has R:tag={Ri} but no test with T:kind={Tj}"
```

**段階 2: T → R 検証（検証対象 R:tag の存在）**

```
for each test file T with T:kind in {T1, T2, ...}:
  for each Ti:
    target_R_tags = matrix.verifies(Ti)
    if no source file linked to T has any R:tag in target_R_tags:
      FAIL: "T has T:kind={Ti} but no linked source with R:tag in {target_R_tags}"
```

### 4.2. baseline 戦略

- 子 Phase 3（Guard 実装）で baseline=current 違反件数 + ratchet-down 設定
- 子 Phase 6（Migration Rollout）で baseline=0 到達
- 親 Phase 4（制度成立確認）で **連続 2 四半期 0** を制度成立 5 要件に組み込み

### 4.3. exception の扱い

`R:unclassified` / `T:unclassified` は Interlock 検証から除外する（Constitution 原則 1）。判断保留中は能動タグとして扱う。

### 4.4. 例外的な許容（Exception Policy）

review window で承認された場合のみ、特定ファイルを Interlock 検証から一時除外可能。形式は親 plan §OCS.8 の `TXE-NNN` Exception Policy に従う:

```yaml
exceptions:
  - id: TXE-001
    rule: AR-TAXONOMY-INTERLOCK
    target: <ファイルパス>
    reason: "<なぜ一時除外するか>"
    owner: architecture
    expiresAt: <YYYY-MM-DD>
    sunsetCondition: "<何が起きたら除外解除するか>"
```

期限超過例外は hard fail（plan §OCS.8）。

## 5. 改訂手続き

### 5.1. 新 R:tag 追加

1. review window で提案（Origin: Why/When/Who/Sunset を併記）
2. 対応する必須 T:kind / 任意 T:kind を **同一 review window で確定**（原則 4: 片軸だけの追加禁止）
3. Antibody Pair も同時に提示（原則 6）
4. Cognitive Load Ceiling 残数の確認（原則 7）
5. window 承認後、本マトリクス §2 に追加 + Origin Journal にエントリ追加

### 5.2. 新 T:kind 追加

R:tag 追加と同じ手順。**ただし**、新 T:kind は最低 1 件の R:tag に対する検証契約を持つ必要がある（孤立 T:kind 禁止）。

### 5.3. R:tag / T:kind の撤退

1. review window で `deprecated` 提案（plan §OCS.4 Lifecycle）
2. `replacedBy` 必須（原則 5: Sunset 条件）
3. 撤退期限（90 日以上先）を設定
4. 全使用箇所が `replacedBy` 先に移行 → `sunsetting` → `retired` → `archived`

### 5.4. Interlock 関係の変更

R:tag に required T:kind を追加・削除する場合も review window 必須。
両子 plan の Phase 3 / Phase 5 / Phase 6 で interlock guard baseline の調整を伴う。

## 6. 関連文書

| 文書 | 役割 |
|---|---|
| `references/01-principles/taxonomy-constitution.md` | 7 不可侵原則（本マトリクスは原則 4 の詳細） |
| `references/01-principles/taxonomy-origin-journal.md` | 各タグの Origin（採択経緯） |
| `projects/taxonomy-v2/plan.md` | §AR-TAXONOMY-* 仕様正本 / §OCS.7 Anchor Slice |
| `projects/responsibility-taxonomy-v2/plan.md` | 子: 責務軸 Phase 0-9（Phase 3 で Interlock guard 実装） |
| `projects/test-taxonomy-v2/plan.md` | 子: テスト軸 Phase 0-9（Phase 3 で Interlock guard 実装） |
| `app/src/test/guards/constitutionBootstrapGuard.test.ts` | 本マトリクスの存在 + Constitution 相互参照検証 |

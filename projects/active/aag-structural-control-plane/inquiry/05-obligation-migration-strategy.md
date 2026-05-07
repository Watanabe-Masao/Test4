# inquiry/05 — Obligation / Required Reads Migration Strategy

> **役割**: Phase 0 で既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS`（`tools/architecture-health/src/collectors/obligation-collector.ts` L43 / L201）の構造を確認し、Phase 8a 正規化比較器の必要要件を articulate する。
>
> **scope**: Phase 8a/8b/8c の 3 段階 shadow migration（ADR-SCP-005）の前提整備。
>
> **規約**: ADR-SCP-005 に従う。一発切替禁止。

## 1. 既存実装の確認項目（Phase 0 で完成）

### 1.1. OBLIGATION_MAP（L43）

- [ ] 既存 `OBLIGATION_MAP` の type 定義（`ObligationRule` interface）を確認
- [ ] 各 entry の field listing（pathPattern / obligationId / label / check / triggerOnAdded 等）
- [ ] entry 数（既存は 12 件規模、CLAUDE.md `Obligation Map` table と整合）
- [ ] check function の articulate（pure か / 副作用ありか / 同期か非同期か）
- [ ] pathPattern の matching semantics（prefix / glob / regex のいずれか）

### 1.2. PATH_TO_REQUIRED_READS（L201）

- [ ] 既存 `PATH_TO_REQUIRED_READS` の type 定義（`RequiredReadsRule` interface）を確認
- [ ] 各 entry の field listing（pathPrefix / requiredReads / rationale 等）
- [ ] entry 数（既存は 10 件規模、`.claude/manifest.json` `pathTriggers` の export 元）
- [ ] pathPrefix の matching semantics

### 1.3. consumer の listing

- [ ] `obligation-collector.ts` 自身の export を grep（どこから読まれているか）
- [ ] `architecture-health` pipeline での使用箇所
- [ ] `.claude/manifest.json` `pathTriggers` への export チェーン
- [ ] `references/05-aag-interface/` 配下の AAG interface doc 経由で参照されているか

## 2. Phase 8a 正規化比較器の必要要件

### 2.1. 比較対象

- TS 定数（`OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS`）
- generated JSON（`docs/contracts/generated/obligations.generated.json` / `required-reads.generated.json`）

### 2.2. 比較粒度

#### 意味的等価判定（必須）

- entry 集合の **set 等価**（順序無視、重複なし前提）
- 各 entry 内の **field 等価**（key 順序無視、配列要素は order-preserving 比較）
- function 比較（`check`）は **identity** で扱う（同名 export を参照しているか確認、内部実装比較はしない）

#### 文字列差分の許容範囲（Phase 8a で確定）

- **許容**: TS の `'foo'` vs JSON の `"foo"`（quote style 差）
- **許容**: TS の readonly array vs JSON array
- **許容**: TS の object key 順序 vs JSON の object key 順序（alphabetical sort 後比較）
- **不許容**: entry 数の差
- **不許容**: pathPattern / obligationId / requiredReads list の差
- **不許容**: rationale 文の差

### 2.3. 比較器の output

- entry 単位の `match` / `mismatch` / `missing-in-ts` / `missing-in-json` finding
- 各 finding が `FND-OBLIGATION-DRIFT-{id}` 形式の Finding ID を持つ
- Finding 数 == 0 が Phase 8a 完了条件

## 3. Phase 8a/8b/8c 段階的詳細

### Phase 8a（YAML 追加 + 正規化比較器）

成果物:

- `docs/contracts/src/governance/obligations.yaml`（既存 OBLIGATION_MAP の意味的写像）
- `docs/contracts/src/governance/required-reads.yaml`（既存 PATH_TO_REQUIRED_READS の意味的写像）
- `docs/contracts/schema/obligations.schema.json`
- `docs/contracts/schema/required-reads.schema.json`
- `docs/contracts/generated/obligations.generated.json`
- `docs/contracts/generated/required-reads.generated.json`
- `tools/governance/normalize-obligations.ts`（YAML → JSON）
- `tools/governance/check-obligation-drift.ts`（正規化比較器、advisory）

完了条件:

- [ ] YAML の意味的写像が完成（人間/AI の手作業）
- [ ] generated JSON 生成が動作
- [ ] 正規化比較器で TS 定数と generated JSON の **意味的差分 == 0**
- [ ] collector は **まだ既存 TS 定数を読む**（変更なし）
- [ ] shadow check で 7 日（または state-based 完了判定）drift がないこと

### Phase 8b（collector 切替）

成果物:

- `obligation-collector.ts` の export を generated JSON 読みに切替
- TS 定数は **deprecated shim**（同一値を export し続けるが、内部は generated JSON 読みに変更）
- new-only gate: 新規 obligation 追加は YAML のみ許可（`tools/governance/check-obligation-drift.ts` で TS 定数追加を fail）

完了条件:

- [ ] collector が generated JSON を入力に動作
- [ ] architecture-health pipeline が PASS 維持
- [ ] TS 定数は shim 状態（呼び出し側コードは変更不要）
- [ ] 新規 obligation 追加が YAML のみ許可されることが機械検証

### Phase 8c（TS 定数削除）

成果物:

- `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS` の TS 定数 / shim を削除
- `obligation-collector.ts` を slim 化

完了条件:

- [ ] TS 定数 / shim の grep 結果 == 0 件
- [ ] 全テスト PASS
- [ ] architecture-health pipeline 不変
- [ ] generated JSON が唯一 machine contract

## 4. 注意事項（ハマりポイント）

### 4.1. 正規化比較器の「永遠の差分あり」リスク

文字列 diff だけだと、order や quoting の違いで永遠に「差分あり」のまま 8b へ進めない。本 inquiry の §2.2 で **意味的等価判定** を articulate し、order / quote / readonly array の差を許容することを明示。

### 4.2. function 比較の限界

`check: () => CheckResult` のような function field は意味的等価判定が不可能。**identity 比較**（同名 export 参照確認）に留め、function 内部実装を YAML に articulate しない。YAML には `checkRef: 'obligation-checks.allowlistHealth'` のような **named function reference** を articulate し、function 本体は TS で残す（generated JSON にも reference のみ articulate）。

### 4.3. .claude/manifest.json `pathTriggers` への影響

`.claude/manifest.json` L41-46 で `pathTriggers` の `source: obligation-collector.ts`、`exportedSymbol: PATH_TO_REQUIRED_READS` を articulate。Phase 8b で collector の export 経路を変更しても、export 自体は維持されるため manifest 側の変更は不要。Phase 8c で TS 定数を削除する際は manifest の `exportedSymbol` を `(generated)` 等に articulate（または manifest の参照経路を再設計）。

## 5. 整合性確認項目（Phase 0 で完了）

- [ ] OBLIGATION_MAP / PATH_TO_REQUIRED_READS の現在 type 定義と entry 数を確認
- [ ] consumer chain（collector → architecture-health → manifest）の listing 完了
- [ ] 正規化比較器の意味的等価判定範囲が articulate
- [ ] function field の identity 比較戦略が articulate
- [ ] Phase 8a/8b/8c の段階的完了条件が articulate

## 6. open questions

- Q1: function field（`check`）の YAML 表現はどうするか? → 暫定: `checkRef: <named function id>` で articulate、function 本体は TS で `obligation-checks.ts` 等に集約
- Q2: pathPattern の matching semantics は YAML で表現可能か? → 確認、glob / regex ならば string で articulate 可能。複雑な動的判定がある場合は function reference 化
- Q3: Phase 8b の TS shim 期間（state-based exit criteria）は何で判定するか? → 暫定: 「全 consumer が新 collector export を使い、TS 定数 / shim への参照が 0 件」を grep で確認、その後 Phase 8c へ進む
- Q4: rationale 文の差は許容するか不許容にするか? → 暫定: 不許容（rationale も意味的等価判定対象）。YAML での rationale 編集は Phase 8a 段階で TS 定数も同期 update

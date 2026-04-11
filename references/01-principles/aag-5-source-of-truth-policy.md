# AAG 5.0.0 — 正本 / 派生 / 運用物ポリシー

> 「何が正本か」を1枚で固定する。

## 3区分の定義

| 区分 | 定義 | 手編集 |
|------|------|--------|
| **正本** | 他の情報の導出元になる唯一の情報源 | ✅ 許可（変更は連鎖更新義務あり） |
| **派生物** | 正本から自動導出される情報 | ❌ 禁止（`docs:generate` 等で再生成） |
| **運用物** | 人間と AI の手順書・進行管理 | ✅ 許可（コード truth の後追い） |

---

## 正本一覧

### 思想の正本（Constitution 層）

| 正本 | ファイル | 変更トリガー |
|------|---------|-------------|
| 設計原則 | `docs/contracts/principles.json` | 原則の追加・修正・廃止 |
| 意味分類ポリシー | `references/01-principles/semantic-classification-policy.md` | semanticClass / authorityKind の定義変更 |
| エンジン境界 | `references/01-principles/engine-boundary-policy.md` | 3エンジンの責務変更 |
| 業務値定義書 | `references/01-principles/*-definition.md`（13 件） | 業務値の計算方法・意味変更 |

### 型の正本（Schema 層）

| 正本 | ファイル | 変更トリガー |
|------|---------|-------------|
| **Master Registry** | `app/src/test/calculationCanonRegistry.ts` | 計算ファイルの追加・分類変更・契約値変更 |
| Architecture Rules | `app/src/test/architectureRules.ts` | ルール追加・修正・廃止 |
| ガードタグ定義 | `app/src/test/guardTagRegistry.ts` | タグの追加・意味変更 |
| 責務タグ定義 | `app/src/test/responsibilityTagRegistry.ts` | 責務タグの追加 |
| 移行タグ定義 | `app/src/test/migrationTagRegistry.ts` | 移行タグの追加 |
| AllowlistEntry 型 | `app/src/test/allowlists/types.ts` | 例外管理の型変更 |
| 文書レジストリ | `docs/contracts/doc-registry.json` | 文書の追加・廃止 |
| プロジェクトメタ | `docs/contracts/project-metadata.json` | WASM crate / CI 構成変更 |

### 実行の正本（Execution 層）

| 正本 | ファイル | 変更トリガー |
|------|---------|-------------|
| ガードテスト | `app/src/test/guards/*.test.ts`（48 件） | 検出ルール変更 |
| Allowlist データ | `app/src/test/allowlists/*.ts`（types.ts 以外） | 例外の追加・削除 |
| Health ルール | `tools/architecture-health/src/config/health-rules.ts` | KPI 閾値変更 |

---

## 派生物一覧（手編集禁止）

| 派生物 | 導出元 | 生成コマンド |
|--------|--------|-------------|
| `semanticViews.ts` の 3 View | `calculationCanonRegistry.ts` | テスト実行時に自動検証 |
| `architecture-health.json` | guard + health tool | `npm run docs:generate` |
| `architecture-health.md` | 同上 | 同上 |
| `architecture-health-certificate.md` | 同上 | 同上 |
| `CLAUDE.md` の generated section | 同上 | 同上 |
| `technical-debt-roadmap.md` の generated section | 同上 | 同上 |

**鉄則:** 派生物に現在値を手書きしない。prose に件数を書かない。

---

## 運用物一覧

| 運用物 | ファイル | 役割 | 更新タイミング |
|--------|---------|------|-------------|
| 起点文書 | `HANDOFF.md` | 後任者の読書起点 | コード truth 変更後 |
| 全体計画 | `plan.md` | Phase 構成と原則 | 計画変更時 |
| 進行管理 | `plan-checklist.md` | 完了 / 未完の truth | 作業完了ごと |
| BIZ 移行計画 | `tier1-business-migration-plan.md` | Tier 1 候補の手順 | 候補追加・完了時 |
| ANA 移行計画 | `analytic-kernel-migration-plan.md` | Analytic の手順 | 候補追加・完了時 |
| 昇格手順 | `promote-ceremony-template.md` | Promote Ceremony | Phase 8 着手時 |
| 昇格判定表 | `promotion-readiness-*.md`（11 件） | 各候補の判定 | 観測結果取得時 |

---

## 連鎖更新マップ

正本を変更したとき、どの派生物・運用物の更新が必要か。

### `calculationCanonRegistry.ts` を変更したとき

1. `semanticViews.ts` — 自動検証（テスト実行で一致確認）
2. `wasmEngine.ts` — 手動確認（統合 drift 検出テストで検出）
3. `npm run docs:generate` — health 再生成
4. `HANDOFF.md` — エントリ数の記載を確認

### `architectureRules.ts` を変更したとき

1. `npm run docs:generate` — health 再生成
2. 対象ガードテスト — ルール追加に対応するテスト追加

### `references/` に新規 `.md` を追加したとき

1. `docs/contracts/doc-registry.json` — 文書登録
2. `references/README.md` — 上部テーブル追加
3. `references/README.md` — 下部テーブル追加
4. `npm run docs:generate` — generated section 再生成

### `references/01-principles/` を変更したとき

- `docs/contracts/principles.json` — 同コミットに含める

### `wasm/` を変更したとき

- `docs/contracts/project-metadata.json` — 同コミットに含める

### `app/src/test/allowlists/` を変更したとき

- `npm run docs:generate` — health 再生成

---

## 手編集禁止の強制

| 禁止対象 | 検出方法 |
|---------|---------|
| `semanticViews.ts` の手編集 | `calculationCanonGuard.test.ts` で master との一致検証 |
| generated section の手編集 | `docs:check` が差分検出 |
| derived view に non-target 混入 | `calculationCanonGuard.test.ts` の non-target 除外テスト |
| registry と wasmEngine のズレ | 統合 drift 検出テスト（4層横断） |
| 文書追加時の更新漏れ | `pre-push` hook が検出 |

---

## 正本性の判定基準

あるファイルが「正本」か「派生物」か迷ったときの判定:

1. **それを削除したら、他の何かが壊れるか？** → 壊れるなら正本
2. **それは別のファイルから再生成できるか？** → できるなら派生物
3. **それは人間の判断で自由に書き換えてよいか？** → よいなら運用物
4. **それは CI で自動生成・検証されるか？** → されるなら派生物または実行層

**迷ったら正本にしない。** 正本を増やすほど連鎖更新コストが増える。

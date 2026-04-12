# architectureRules — AAG ルール正本ディレクトリ

このディレクトリは AAG ルールの **App Domain 側正本 + derived merge** を置く。
Project Overlay（案件運用状態）は `projects/<project-id>/aag/execution-overlay.ts` に分離されている。

## ファイル構成

| ファイル | 区分 | 責務 |
|---|---|---|
| `rules.ts` | **後方互換 facade** | 物理正本 `app-domain/gross-profit/rule-catalog/base-rules.ts` からの薄い re-export |
| `merged.ts` | **Derived Artifact** | BaseRule + ExecutionOverlay を ruleId キーで合成 |
| `index.ts` | **Facade**（consumer 入口） | 型 + 値 + helpers を 1 箇所から re-export |
| `types.ts` | 型定義 | BaseRule / ArchitectureRule / PrincipleId 等 |
| `helpers.ts` | ヘルパー関数 | getRuleById / formatViolationMessage / buildAagResponse 等 |

**物理正本**: `app-domain/gross-profit/rule-catalog/base-rules.ts`
BaseRule 配列は App Domain 側へ物理移動済み（C4 完了）。`@app-domain/*` alias 経由で参照される。

## consumer の入口

全 consumer は **必ず** `architectureRules` facade 経由で参照する:

```ts
import { ARCHITECTURE_RULES, getRuleById, formatViolationMessage } from '../architectureRules'
```

外部パスからは `app/src/test/architectureRules.ts`（barrel 互換 facade）が
このディレクトリの `index.ts` へ転送する。

## 禁止事項

consumer は以下の直接 import をしてはならない:

- `from '../architectureRules/rules'`（BaseRule 配列の直接参照）
- `from '@project-overlay/execution-overlay'`（Project Overlay の直接参照）

これらは derived merge を経由しない不完全な参照であり、
guard によって検出される:

- `AR-AAG-DERIVED-ONLY-IMPORT` — 束ねルール
- `AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT`
- `AR-AAG-NO-DIRECT-OVERLAY-IMPORT`

検出ロジック: `app/src/test/guards/aagDerivedOnlyImportGuard.test.ts`

## 例外（直参照が許可されるファイル）

- `merged.ts` — 正本合成点そのもの
- `app/src/test/guards/executionOverlayGuard.test.ts` — BaseRule ↔ overlay の整合検証
- `app/src/test/guards/aagDerivedOnlyImportGuard.test.ts` — 本ガード自身（文字列定数として参照）
- 本ディレクトリ配下のファイル（実装上の相互参照）

## 合成フロー

```
rules.ts (BaseRule[])                execution-overlay.ts (ExecutionOverlay)
         │                                     │
         └──────────┐           ┌──────────────┘
                    ▼           ▼
              merged.ts (ruleId キーで合成)
                    │
                    ▼
         ARCHITECTURE_RULES: readonly ArchitectureRule[]
                    │
                    ▼
         index.ts (facade / helpers)
                    │
                    ▼
              consumer（guard / tool / renderer）
```

## project の切替点

Project Overlay の物理位置は `CURRENT_PROJECT.md` + `projects/<id>/config/project.json`
から解決される:

- build 時: `app/scripts/resolve-project-overlay.mjs`（vite / vitest alias）
- health 時: `tools/architecture-health/src/project-resolver.ts`

project 名の直書きは上記 resolver にのみ許容される。

## 参照

- 配置方針: `references/03-guides/governance-final-placement-plan.md`
- 物理移動計画: 同文書の「物理配置の目標構造」セクション
- AI 向け案件入口: `projects/pure-calculation-reorg/AI_CONTEXT.md`

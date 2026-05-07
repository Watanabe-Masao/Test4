# AAG Command Output Examples

> **役割**: 各 `aag <command>` の **representative output 例** を articulate (= AI session が `aag introspect command <name>` から example pointer 経由で参照できる substrate)。
>
> **canonical**: 各 command の output schema は `docs/contracts/aag/commands/*.schema.json`、本 directory の example はそれを満たす **representative snapshot**。

## Articulation philosophy

- 本 example file は **shape を articulate する snapshot** であり、契約ではない (= contract は schema、example は inspiration / discovery 用、v4.1 transparency 軸整合)
- AI session が `aag introspect command <name>` → output の `examples` field 経由で本 directory に navigate できる substrate
- **Drift OK**: command 実装の進化で example output が schema 範囲内で変化しても articulate harm なし (= schema validate さえ通れば fixture vs output の byte-level 一致は要求しない、v4.1 期間軸 / score 軸排除整合)

## Snapshot specification

各 example は **commit-pinned snapshot** (= 取得時の commit の output)。`provenance.computedAt` / `provenance.sourceCommit` field の articulate された値は時間 / commit と共に変化するが、**schema-level shape は不変** (= schema validate で機械検証可能)。

再取得 (= 再 capture) は demand-driven:
- command output shape が articulate された場合 (= schema bump 時)
- AI session で「example が古すぎる」demand surface した場合
- 本 directory を強制的に regenerate する `aag chaos / aag examples regen` 等の articulate 候補 command 起動時

## Directory layout

```
fixtures/aag/commands/
  <command-id>/
    examples/
      <example-name>.json   # output snapshot
```

例:
- `self-check/examples/basic.json` (= `aag self-check` の no-arg 実行結果)
- `describe/examples/validate.json` (= `aag describe validate` の出力)
- `introspect-schema/examples/detector-result-v1.json` (= `aag introspect schema detector-result-v1` の出力)

## Articulate されている command (= v4.2 substrate Phase 1 articulate seed)

14 stable / provisional commands を articulate (= 残 command は demand-driven 起動候補):

| Command | Example file |
|---|---|
| `aag self-check` | `self-check/examples/basic.json` |
| `aag fixtures` | `fixtures/examples/basic.json` |
| `aag list` | `list/examples/basic.json` |
| `aag where-am-i` | `where-am-i/examples/basic.json` |
| `aag clean check` | `clean-check/examples/basic.json` |
| `aag docs placement-check` | `docs-placement-check/examples/basic.json` |
| `aag project stale` | `project-stale/examples/basic.json` |
| `aag shadow` | `shadow/examples/basic.json` |
| `aag validate` | `validate/examples/basic.json` |
| `aag describe validate` | `describe/examples/validate.json` |
| `aag introspect command validate` | `introspect-command/examples/validate.json` |
| `aag introspect schema detector-result-v1` | `introspect-schema/examples/detector-result-v1.json` |
| `aag rule locate AR-G3-SUPPRESS-RATIONALE` | `rule-locate/examples/AR-G3-SUPPRESS-RATIONALE.json` |
| `aag detector refs archive-manifest` | `detector-refs/examples/archive-manifest.json` |

## 未 articulate command (= demand-driven 起動候補)

以下は input 依存 (= active project / stdin / file path) で example 配置が複雑、demand articulate されたら articulate:
- `aag context --project <id>` (= active project 依存)
- `aag changed --base <ref> --head <ref>` (= git history 依存)
- `aag obligation check --base ... --head ...` (= 同上)
- `aag comments list --kind <kind>` (= per-kind articulate 候補)
- `aag stats files` (= filter combination per-example articulate 候補)
- `aag task prepare/validate/close` (= active project + capsule file 依存)
- `aag repair-context --from <file>` (= input file 依存)
- `aag wrap --command <name>` (= stdin 依存)
- `aag next` (= state 依存)

## 参照

- Output schemas: `docs/contracts/aag/commands/*.schema.json`
- Introspect command: `aag introspect command <name>` で本 example directory への pointer を articulate
- Substrate seed: PR #1267〜#1273 (= v4.2 substrate cluster A)

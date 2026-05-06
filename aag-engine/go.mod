// AAG Engine Go MVP — read-only governance validator shadow implementation。
//
// 位置付け (= aag-engine-go-mvp project Phase 1 deliverable):
//   - aag-engine-readiness-refactor で抽出済みの 5 detector を Go 製 read-only
//     engine として shadow mode 実装する MVP。
//   - validator のみ (= generator ではない)、TS guard / docs:check /
//     architecture-health は置き換えない。
//   - canonical schema = docs/contracts/aag/detector-result.schema.json (= Phase 2 で binding)。
//   - primary success metric = fixtures/aag/ 配下 8 fixture × 5 detector = 40 parity 検証点。
//
// 不可侵原則 (= projects/active/aag-engine-go-mvp/plan.md §不可侵原則):
//   1. validator のみ、generator ではない
//   2. TypeScript guard を全廃しない
//   3. rule semantics を Go 側に複製しない
//   4. app-specific TS guard を engine 化対象に含めない
//   5. CI hard gate を即時置換しない
//   9. Go engine が source of truth にならない
//   10. fixture parity を必須にする
module aag-engine

go 1.24

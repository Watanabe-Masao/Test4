# aag/_framework/ — AAG framework 実装 skeleton

> **status**: skeleton (= R1 で landed)、後続 phase で fill 予定。
> **reader**: AAG framework 改修者のみ。主アプリ改修 userは本 sub-tree を読まない。

## 役割 (= aag/ tree 第二階層、_internal/ と並列)

本 sub-tree は **AAG framework 実装** (= rules / collectors / generators / schemas / fixtures) を将来 物理移動する skeleton。R1 では skeleton のみ、内容 fill は別 program (= 本 program archive 後に判断)。

## 構造

```
aag/_framework/
├── README.md           (本 file、R1 で landed)
├── rules/              (= AAG rule definition、現 app/src/test/architectureRules/ から後続 phase で物理移動候補)
├── collectors/         (= 現 tools/architecture-health/src/collectors/ から後続 phase で物理移動候補)
├── generators/         (= 現 tools/architecture-health/src/renderers/ + drawer-generator から後続 phase で物理移動候補)
├── schemas/            (= 現 docs/contracts/aag/ から後続 phase で物理移動候補)
└── fixtures/           (= test fixture、後続 phase で articulate)
```

## scope (= 本 R1 = skeleton landing のみ)

含む:

- 5 sub-directory + README.md (本 file)
- AAG framework 改修者向け boundary 警告

含まない (= 本 R1 scope 外):

- 実装の物理移動 (= 別 program、本 program archive 後に判断)
- 内容追加 (= 不可侵原則 2a articulate)
- 主アプリ code (`app/src/`, `app-domain/`, `wasm/`) 移動 (= 不可侵原則 1)

## 関連

- 並列 sub-tree: `aag/_internal/` (= AAG framework 内部 articulation)
- 本 program: `projects/completed/aag-self-hosting-completion/`
- 進行中 R-phase 詳細: `projects/completed/aag-self-hosting-completion/plan.md` §3
- 主アプリ改修 user reach 経路: 本 tree ではなく `references/05-aag-interface/` (R2 で landing 予定)

## status

- 2026-05-02: skeleton landed (= R1)
- 後続 phase で各 sub-directory に内容 fill 判断 (= 本 program archive 後)

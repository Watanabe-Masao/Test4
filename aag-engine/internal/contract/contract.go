// Package contract holds canonical schema bindings for AAG Engine.
//
// Phase 1 (= Go CLI Skeleton) では placeholder のみ。
//
// Phase 2 (= DetectorResult Contract Binding) で以下を populate 予定:
//   - DetectorResult Go struct (= docs/contracts/aag/detector-result.schema.json と structurally identical)
//   - DetectorResult schema loader (= ajv 相当の schema validation、Go 側で再現)
//   - schema sync helper (= TS 側 detectorResult.ts との field-level parity 検証)
//
// Phase 4-8 で各 detector が本 package を import:
//   - Phase 4: archive-manifest-detector → contract.DetectorResult
//   - Phase 5: doc-registry-detector → contract.DetectorResult
//   - Phase 6: schema-validation-detector → contract.DetectorResult
//   - Phase 7: project-lifecycle-detector → contract.DetectorResult
//   - Phase 8: generated-metadata-detector → contract.DetectorResult (severity=advisory only)
//
// 不可侵原則:
//   - canonical schema は docs/contracts/aag/detector-result.schema.json の TS 側正本。
//     Go struct は **structurally identical な mirror**、独自 field 追加は禁止。
//   - schemaVersion mismatch は ExitError として hard fail。
//
// 参照:
//   - tools/architecture-health/src/detector-result.ts (= TS implementation reference)
//   - app/src/test/guards/aagContractSchemaSyncGuard.test.ts (= TS 側 schema sync verifier)
//   - projects/active/aag-engine-go-mvp/plan.md §Phase 2 (= 本 package の binding 計画)
package contract

// PackageVersion は本 package の binding skeleton version。Phase 2 で landing する
// DetectorResult struct と一緒に CanonicalSchemaVersion を articulate 予定。
const PackageVersion = "phase-1-skeleton"

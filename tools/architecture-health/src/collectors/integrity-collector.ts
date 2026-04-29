/**
 * Integrity Domain Collector — Phase G architecture-health KPI 統合
 *
 * canonicalization-domain-consolidation Phase G で landing (2026-04-29)。
 * Phase R-① 部分採用 (2026-04-29) で COVERAGE_MAP を shared JSON module から直接 read
 * するように改修 (旧: test file の regex parse、新: app-domain/integrity/coverage/coverage-map.json)。
 *
 * 出力 KPI:
 * - integrity.violations.total       — Hard Gate (eq 0): migrated pair で domain 経由
 *                                       が壊れている件数 (Phase F coverage guard と同期)
 * - integrity.driftBudget            — info: deferred pair 数 (Phase H 進捗指標)
 * - integrity.expiredExceptions      — Hard Gate (eq 0): integrity 関連 file の
 *                                       @expiresAt 過去日 markers
 * - integrity.consolidationProgress  — info (percent): migrated / total
 *
 * **設計判断 (Phase R-① 部分採用、2026-04-29)**: 旧 regex parse は test file の構造変更に
 * 脆弱だった。COVERAGE_MAP を JSON 正本に集約し、test/collector 双方が `JSON.parse` 経由で
 * 構造化 read する形に統一。drift risk 解消 (傾向 1 解消)。
 *
 * @see references/03-guides/integrity-domain-architecture.md §8
 * @see app-domain/integrity/coverage/coverage-map.json (正本 data)
 * @see app-domain/integrity/coverage/index.ts (test 側 typed wrapper)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { HealthKpi } from "../types.js";

const COVERAGE_MAP_JSON_REL = "app-domain/integrity/coverage/coverage-map.json";
const INTEGRITY_DOMAIN_REL = "app-domain/integrity";

interface PairEntry {
  pairId: string;
  status: "migrated" | "deferred";
  guardFiles: readonly string[];
}

interface CoverageStats {
  total: number;
  migrated: number;
  deferred: number;
  pairs: readonly PairEntry[];
}

interface CoverageMapJson {
  $comment?: string;
  pairs: ReadonlyArray<{
    pairId: string;
    displayName: string;
    guardFiles: readonly string[];
    maxLines: Readonly<Record<string, number>>;
    status: "migrated" | "deferred";
    deferReason?: string;
  }>;
}

/**
 * COVERAGE_MAP を shared JSON から直接 read する。
 *
 * 旧 regex parse 方式 (Phase G) は test file の構造変更に脆弱だった。本実装は
 * `coverage-map.json` を正本として読み、`pairs[]` から pairId / status /
 * guardFiles を構造化抽出する。
 *
 * **正本 missing は hard fail**: `coverage-map.json` は本 collector の正本なので、
 * 不在は silent fallback (zeros) ではなく throw する。silent fallback は
 * driftBudget=0 / consolidationProgress=0 として Hard Gate を欺く形になり、
 * 本 collector が KPI evaluator の hard_gate と二重判定で violation を見落とす
 * リスクがあるため避ける。
 */
function parseCoverageMap(repoRoot: string): CoverageStats {
  const jsonPath = resolve(repoRoot, COVERAGE_MAP_JSON_REL);
  if (!existsSync(jsonPath)) {
    throw new Error(
      `[integrity-collector] coverage-map.json not found at ${jsonPath}. ` +
        `本 file は integrity domain の正本 (Phase R-① 部分採用)。silent fallback は ` +
        `Hard Gate (integrity.violations.total / integrity.expiredExceptions) を欺くので throw。`,
    );
  }

  const content = readFileSync(jsonPath, "utf-8");
  const parsed: CoverageMapJson = JSON.parse(content);

  const pairs: PairEntry[] = parsed.pairs.map((p) => ({
    pairId: p.pairId,
    status: p.status,
    guardFiles: p.guardFiles,
  }));

  const migrated = pairs.filter((p) => p.status === "migrated").length;
  const deferred = pairs.filter((p) => p.status === "deferred").length;

  return { total: pairs.length, migrated, deferred, pairs };
}

const DOMAIN_IMPORT_RE = /from\s+['"]@app-domain\/integrity/;
const HELPERS_IMPORT_RE =
  /from\s+['"]\.\/contentSpecHelpers['"]|from\s+['"]\.\.\/guards\/contentSpecHelpers['"]/;

function importsDomain(repoRoot: string, guardFileRel: string): boolean {
  const path = resolve(repoRoot, "app/src/test", guardFileRel);
  if (!existsSync(path)) return false;
  const content = readFileSync(path, "utf-8");
  if (DOMAIN_IMPORT_RE.test(content)) return true;
  if (guardFileRel.startsWith("guards/contentSpec") && HELPERS_IMPORT_RE.test(content)) return true;
  return false;
}

/**
 * migrated pair のうち、最初の guard file が domain 経由になっていない件数。
 * Phase F coverage guard と同等の static 検証 (collector level の observability)。
 */
function countViolations(repoRoot: string, stats: CoverageStats): number {
  let violations = 0;
  for (const p of stats.pairs) {
    if (p.status !== "migrated") continue;
    if (p.guardFiles.length === 0) {
      violations++;
      continue;
    }
    const reachable = p.guardFiles.some((f) => importsDomain(repoRoot, f));
    if (!reachable) violations++;
  }
  return violations;
}

/**
 * `@expiresAt YYYY-MM-DD` を持つ comment が今日以降の日付かを scan。
 * 対象: app-domain/integrity/ 配下 + COVERAGE_MAP に list された全 guard file。
 */
function findExpiredMarkers(repoRoot: string, stats: CoverageStats): readonly string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filesToScan: string[] = [];

  // app-domain/integrity/ 配下を再帰的に列挙
  const integrityDir = resolve(repoRoot, INTEGRITY_DOMAIN_REL);
  if (existsSync(integrityDir)) {
    for (const f of walkTsFiles(integrityDir)) {
      filesToScan.push(f);
    }
  }

  // COVERAGE_MAP に list された全 guard file
  for (const p of stats.pairs) {
    for (const g of p.guardFiles) {
      const abs = resolve(repoRoot, "app/src/test", g);
      if (existsSync(abs) && !filesToScan.includes(abs)) {
        filesToScan.push(abs);
      }
    }
  }

  const expired: string[] = [];
  for (const f of filesToScan) {
    const content = readFileSync(f, "utf-8");
    const matches = content.matchAll(/@expiresAt\s+(\d{4}-\d{2}-\d{2})/g);
    for (const mm of matches) {
      const date = new Date(mm[1]);
      if (!isNaN(date.getTime()) && date < today) {
        expired.push(`${f.slice(repoRoot.length + 1)}: ${mm[1]}`);
      }
    }
  }
  return expired;
}

function walkTsFiles(dir: string): string[] {
  const result: string[] = [];
  if (!existsSync(dir)) return result;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      result.push(full);
    }
  }
  return result;
}

/**
 * 4 KPI を architecture-health.json に出力する。
 *
 * **status は collector で 'ok' 固定**: pass/fail 判定は evaluator
 * (`tools/architecture-health/src/config/health-rules.ts`) が `value` と
 * `target` (hard_gate / info) を比較して決定する。collector は raw value のみ
 * 出力し、判定は単一 source of truth (health-rules.ts) に集約する設計
 * (本 codebase の collector 全 30+ KPI で一貫)。
 *
 * 例: integrity.violations.total は health-rules.ts で `hard_gate, eq, target=0`
 * と宣言されており、value > 0 で自動 fail する。collector で status を動的に
 * 設定すると二重判定 anti-pattern になるため避ける。
 */
export function collectFromIntegrityDomain(repoRoot: string): readonly HealthKpi[] {
  const stats = parseCoverageMap(repoRoot);
  const violations = countViolations(repoRoot, stats);
  const expired = findExpiredMarkers(repoRoot, stats);

  const consolidationProgress =
    stats.total > 0 ? Math.round((stats.migrated / stats.total) * 1000) / 10 : 0;

  return [
    {
      id: "integrity.violations.total",
      label: "Integrity domain coverage 違反数 (Hard Gate)",
      category: "guard",
      value: violations,
      unit: "count",
      status: "ok",
      owner: "documentation-steward",
      docRefs: [],
      implRefs: [],
    },
    {
      id: "integrity.driftBudget",
      label: "Integrity drift budget (deferred pair 数)",
      category: "guard",
      value: stats.deferred,
      unit: "count",
      status: "ok",
      owner: "documentation-steward",
      docRefs: [],
      implRefs: [],
    },
    {
      id: "integrity.expiredExceptions",
      label: "Integrity 関連 file の @expiresAt 過去日 markers (Hard Gate)",
      category: "guard",
      value: expired.length,
      unit: "count",
      status: "ok",
      owner: "documentation-steward",
      docRefs: [],
      implRefs: [],
    },
    {
      id: "integrity.consolidationProgress",
      label: "Integrity consolidation progress (migrated / total)",
      category: "guard",
      value: consolidationProgress,
      unit: "percent",
      status: "ok",
      owner: "documentation-steward",
      docRefs: [],
      implRefs: [],
    },
  ];
}

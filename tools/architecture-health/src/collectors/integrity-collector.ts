/**
 * Integrity Domain Collector — Phase G architecture-health KPI 統合
 *
 * canonicalization-domain-consolidation Phase G で landing (2026-04-29)。
 * `integrityDomainCoverageGuard.test.ts` の COVERAGE_MAP を file 走査で読み取り、
 * 4 KPI を architecture-health.json に出力する。
 *
 * 出力 KPI:
 * - integrity.violations.total       — Hard Gate (eq 0): migrated pair で domain 経由
 *                                       が壊れている件数 (Phase F coverage guard と同期)
 * - integrity.driftBudget            — info: deferred pair 数 (Phase H 進捗指標)
 * - integrity.expiredExceptions      — Hard Gate (eq 0): integrity 関連 file の
 *                                       @expiresAt 過去日 markers
 * - integrity.consolidationProgress  — info (percent): migrated / total
 *
 * **設計判断 (2026-04-29)**: 機械可読 const は test file 内に in-lined のまま、
 * collector 側で regex parse する。理由:
 *   - 既存 collector (test-contract / taxonomy / content-spec) と同じ「file 読み + 構造抽出」pattern
 *   - tools/ tsconfig は rootDir=src で app/src/test を import 不能
 *   - 13 pair の構造は安定 (Phase H で 2 件追加予定だが構造変更なし)
 *
 * @see references/03-guides/integrity-domain-architecture.md §8
 * @see app/src/test/guards/integrityDomainCoverageGuard.test.ts (COVERAGE_MAP 正本)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { HealthKpi } from "../types.js";

const COVERAGE_GUARD_REL = "app/src/test/guards/integrityDomainCoverageGuard.test.ts";
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

/**
 * COVERAGE_MAP から pair 情報を抽出する。
 *
 * test file の構造を仮定:
 *   { pairId: 'foo', ..., guardFiles: ['guards/x.test.ts', ...], ..., status: 'migrated', ... }
 *
 * 各 entry block を `{ pairId:` から次の閉じ括弧までで切り出し、
 * pairId / status / guardFiles 配列を抽出する。
 */
function parseCoverageMap(repoRoot: string): CoverageStats {
  const path = resolve(repoRoot, COVERAGE_GUARD_REL);
  if (!existsSync(path)) {
    return { total: 0, migrated: 0, deferred: 0, pairs: [] };
  }
  const content = readFileSync(path, "utf-8");

  const pairs: PairEntry[] = [];
  // entry の開始: "pairId: '<id>'" を anchor にする
  const entryRe = /pairId:\s*'([^']+)'/g;
  const entryStarts: { id: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(content)) !== null) {
    entryStarts.push({ id: m[1], index: m.index });
  }

  for (let i = 0; i < entryStarts.length; i++) {
    const start = entryStarts[i].index;
    const end = i + 1 < entryStarts.length ? entryStarts[i + 1].index : content.length;
    const block = content.slice(start, end);

    const statusMatch = block.match(/status:\s*'(migrated|deferred)'/);
    if (!statusMatch) continue;

    const guardFiles: string[] = [];
    const guardFilesMatch = block.match(/guardFiles:\s*\[([^\]]*)\]/);
    if (guardFilesMatch) {
      const items = guardFilesMatch[1].matchAll(/'([^']+)'/g);
      for (const it of items) guardFiles.push(it[1]);
    }

    pairs.push({
      pairId: entryStarts[i].id,
      status: statusMatch[1] as "migrated" | "deferred",
      guardFiles,
    });
  }

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

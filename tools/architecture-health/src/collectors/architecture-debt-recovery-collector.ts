/**
 * architecture-debt-recovery Remediation Collector
 *
 * SP-D ADR-D-005 PR1 — umbrella project の remediation 進捗を generated 文書に出力する。
 *
 * 出力先:
 *  - references/04-tracking/generated/architecture-debt-recovery-remediation.json （構造化）
 *  - references/04-tracking/generated/architecture-debt-recovery-remediation.md   （人間可読）
 *
 * 入力:
 *  - projects/architecture-debt-recovery/inquiry/15〜18.md（ADR / BC / LEG / SP の総数）
 *  - projects/<sub-project>/checklist.md（sub-project の checkbox 完遂率）
 *
 * 出力 KPI（PR1 範囲）:
 *  - itemCount             ADR 件数
 *  - breakingChangeCount   BC 件数
 *  - legacyCount           LEG 件数
 *  - subProjectCount       SP 件数 + 個別 status / progress
 *  - guardImplementedCount 本 umbrella で landed した新 guard 数
 *  - baselineRemaining     現時点で ratchet-down 待ちの baseline 合計（粗推定）
 *  - reviewPending         architecture review 未了の inquiry section 数（プレースホルダ: 0）
 *
 * 本 collector は HealthKpi を返さず、独立 generated 文書を直接書き出す。
 * 生成 / 検証は main.ts から呼び出される。
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-D-005
 *  - projects/aag-temporal-governance-hardening/checklist.md Phase 2
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REL = "projects/architecture-debt-recovery";

interface SubProjectStat {
  readonly id: string;
  readonly checked: number;
  readonly total: number;
  readonly progressRatio: number;
}

export interface RemediationSnapshot {
  readonly generatedAt: string;
  readonly umbrellaProject: string;
  readonly itemCount: number;
  readonly breakingChangeCount: number;
  readonly legacyCount: number;
  readonly subProjectCount: number;
  readonly subProjects: readonly SubProjectStat[];
  readonly guardImplementedCount: number;
  readonly baselineRemaining: number;
  readonly reviewPending: number;
}

const countUniqueTokens = (filePath: string, pattern: RegExp): number => {
  if (!existsSync(filePath)) return 0;
  const content = readFileSync(filePath, "utf-8");
  return new Set(content.match(pattern) ?? []).size;
};

const readSubProjectChecklist = (
  repoRoot: string,
  subProjectId: string,
): SubProjectStat | null => {
  const checklistPath = resolve(
    repoRoot,
    `projects/${subProjectId}/checklist.md`,
  );
  if (!existsSync(checklistPath)) return null;
  const content = readFileSync(checklistPath, "utf-8");
  const checked = (content.match(/^\* \[x\]/gm) ?? []).length;
  const unchecked = (content.match(/^\* \[ \]/gm) ?? []).length;
  const total = checked + unchecked;
  return {
    id: subProjectId,
    checked,
    total,
    progressRatio: total === 0 ? 0 : checked / total,
  };
};

/**
 * 本 umbrella で landed した PR1 guard を sub-project checklist から抽出する。
 * checklist の `* [x] PR1: ... <guard-name>` 行を数える簡易ヒューリスティック。
 */
const countLandedGuards = (
  subProjectStats: readonly SubProjectStat[],
): number => subProjectStats.reduce((sum, sp) => sum + sp.checked, 0);

export function collectRemediationSnapshot(
  repoRoot: string,
): RemediationSnapshot {
  const inquiryDir = resolve(repoRoot, `${PROJECT_REL}/inquiry`);
  const itemCount = countUniqueTokens(
    resolve(inquiryDir, "15-remediation-plan.md"),
    /ADR-[A-D]-\d+/g,
  );
  const breakingChangeCount = countUniqueTokens(
    resolve(inquiryDir, "16-breaking-changes.md"),
    /BC-\d+/g,
  );
  const legacyCount = countUniqueTokens(
    resolve(inquiryDir, "17-legacy-retirement.md"),
    /LEG-\d+/g,
  );

  const subProjectIds = [
    "widget-context-boundary",
    "duplicate-orphan-retirement",
    "aag-temporal-governance-hardening",
  ];
  const subProjectStats = subProjectIds
    .map((id) => readSubProjectChecklist(repoRoot, id))
    .filter((s): s is SubProjectStat => s !== null);

  const subProjectCount = countUniqueTokens(
    resolve(inquiryDir, "18-sub-project-map.md"),
    /SP-[A-D]/g,
  );

  return {
    generatedAt: new Date().toISOString(),
    umbrellaProject: "architecture-debt-recovery",
    itemCount,
    breakingChangeCount,
    legacyCount,
    subProjectCount,
    subProjects: subProjectStats,
    guardImplementedCount: countLandedGuards(subProjectStats),
    baselineRemaining: 0, // PR2 以降で ratchet-down baseline の合算を実装予定
    reviewPending: 0, // PR2 以降で inquiry section の review marker 解析を実装予定
  };
}

const renderJson = (snapshot: RemediationSnapshot): string =>
  JSON.stringify(snapshot, null, 2) + "\n";

const renderMd = (snapshot: RemediationSnapshot): string => {
  const lines: string[] = [];
  lines.push("# architecture-debt-recovery Remediation Snapshot");
  lines.push("");
  lines.push(`> 生成: ${snapshot.generatedAt}`);
  lines.push("> 正本: `projects/architecture-debt-recovery/inquiry/15-18`");
  lines.push("");
  lines.push("## 集計値");
  lines.push("");
  lines.push("| 指標 | 値 |");
  lines.push("|------|-----|");
  lines.push(`| ADR (remediation item) | ${snapshot.itemCount} |`);
  lines.push(`| Breaking Change | ${snapshot.breakingChangeCount} |`);
  lines.push(`| Legacy Retirement | ${snapshot.legacyCount} |`);
  lines.push(`| Sub-Project | ${snapshot.subProjectCount} |`);
  lines.push(
    `| Guard Implemented (PR landed) | ${snapshot.guardImplementedCount} |`,
  );
  lines.push(
    `| Baseline Remaining (placeholder) | ${snapshot.baselineRemaining} |`,
  );
  lines.push(`| Review Pending (placeholder) | ${snapshot.reviewPending} |`);
  lines.push("");
  lines.push("## Sub-Project 進捗");
  lines.push("");
  lines.push("| Sub-Project | Checked | Total | Progress |");
  lines.push("|---|---|---|---|");
  for (const sp of snapshot.subProjects) {
    const pct = (sp.progressRatio * 100).toFixed(1);
    lines.push(`| ${sp.id} | ${sp.checked} | ${sp.total} | ${pct}% |`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    "本ファイルは `tools/architecture-health/src/collectors/architecture-debt-recovery-collector.ts`",
  );
  lines.push("により自動生成される。手動編集禁止。");
  return lines.join("\n") + "\n";
};

export function writeRemediationFiles(
  snapshot: RemediationSnapshot,
  repoRoot: string,
): {
  jsonPath: string;
  mdPath: string;
} {
  const jsonPath = resolve(
    repoRoot,
    "references/04-tracking/generated/architecture-debt-recovery-remediation.json",
  );
  const mdPath = resolve(
    repoRoot,
    "references/04-tracking/generated/architecture-debt-recovery-remediation.md",
  );
  writeFileSync(jsonPath, renderJson(snapshot));
  writeFileSync(mdPath, renderMd(snapshot));
  return { jsonPath, mdPath };
}

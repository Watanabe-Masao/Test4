/**
 * docs:check — live 再計算 + committed 正本との意味比較
 *
 * 2段階で検証する:
 *   A. live 再計算: 全 collector を実行し、health gate を判定
 *   B. 意味比較: committed architecture-health.json と live 結果を比較
 *      - 各 KPI の id / value / status が一致するか
 *      - generated section の要約本文が一致するか
 *      - byte diff ではなく意味 diff（timestamp 等の環境差異は無視）
 *
 * これにより、`npm run docs:generate` を忘れると CI は落ちる。
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { collectFromSnapshot } from "./collectors/snapshot-collector.js";
import { collectFromGuards } from "./collectors/guard-collector.js";
import { collectFromDocs } from "./collectors/doc-collector.js";
import { collectFromBundle } from "./collectors/bundle-collector.js";
import { collectObligations } from "./collectors/obligation-collector.js";
import { collectFromTemporalGovernance } from "./collectors/temporal-governance-collector.js";
import { collectFromProjectChecklists } from "./collectors/project-checklist-collector.js";
import { evaluate } from "./evaluator.js";
import {
  assessOverall,
  buildCompositeIndicators,
  detectTopRisks,
  generateRecommendations,
} from "./diagnostics.js";
import { renderCertificateInline } from "./renderers/certificate-renderer.js";
import { HEALTH_RULES } from "./config/health-rules.js";
import type { HealthReport } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const errors: string[] = [];

// ---------------------------------------------------------------------------
// A. Live 再計算
// ---------------------------------------------------------------------------
console.log("[docs:check] Live recalculation...");

const snapshotKpis = collectFromSnapshot(repoRoot);
const guardKpis = collectFromGuards(repoRoot);
const docKpis = collectFromDocs(repoRoot);
const bundleKpis = collectFromBundle(repoRoot);
const obligationKpis = collectObligations(repoRoot);
const temporalKpis = collectFromTemporalGovernance(repoRoot);
const projectKpis = collectFromProjectChecklists(repoRoot);

const allKpis = [
  ...snapshotKpis,
  ...guardKpis,
  ...docKpis,
  ...bundleKpis,
  ...obligationKpis,
  ...temporalKpis,
  ...projectKpis,
];
console.log(`[docs:check] ${allKpis.length} KPIs collected`);

const liveReport = evaluate(allKpis);

// --- Hard gate 判定 ---
if (!liveReport.summary.hardGatePass) {
  for (const kpi of liveReport.kpis) {
    if (kpi.status === "fail") {
      errors.push(
        `Hard gate fail: ${kpi.id} = ${kpi.value} (budget: ${kpi.budget})`,
      );
    }
  }
}
console.log(
  `[docs:check] Hard gate: ${liveReport.summary.hardGatePass ? "PASS" : "FAIL"}`,
);

// ---------------------------------------------------------------------------
// B. Committed 正本との意味比較
// ---------------------------------------------------------------------------
console.log("[docs:check] Semantic diff against committed health.json...");

const healthJsonPath = resolve(
  repoRoot,
  "references/02-status/generated/architecture-health.json",
);

if (!existsSync(healthJsonPath)) {
  errors.push(
    "Missing: architecture-health.json — run `npm run docs:generate`",
  );
} else {
  const committed: HealthReport = JSON.parse(
    readFileSync(healthJsonPath, "utf-8"),
  );

  // --- KPI の id / value / status を比較 ---
  const liveMap = new Map(liveReport.kpis.map((k) => [k.id, k]));
  const committedMap = new Map(committed.kpis.map((k) => [k.id, k]));

  // live にあるが committed にない KPI
  // source: 'build-artifact' の KPI は、ローカルで committed 値を引き継いでいるため
  // CI で live 計算された新しい値と committed の古い値の差分は value 比較で検出する
  for (const [id, liveKpi] of liveMap) {
    if (!committedMap.has(id)) {
      // build-artifact 系は dist/ の有無で生成状態が変わる — 非破壊 collector で
      // committed から引き継がれるはずなので、ここに到達するのは初回のみ
      const source = (liveKpi as { source?: string }).source;
      if (source === "build-artifact") {
        // 初回（committed にまだ入っていない）→ regenerate を促す
        errors.push(
          `KPI missing from committed: ${id} — run docs:generate after build`,
        );
      } else {
        errors.push(`KPI missing from committed: ${id} — regenerate required`);
      }
    }
  }

  // committed にあるが live にない KPI（環境差異で bundle/obligation が増減する場合は許容）
  // ただし snapshot/guard/docs(obsolete/stale) 系は必須
  const REQUIRED_PREFIXES = [
    "allowlist.",
    "compat.",
    "complexity.",
    "boundary.",
    "guard.",
  ];
  const REQUIRED_EXACT = [
    "docs.obsoleteTerms.count",
    "docs.generatedSections.stale",
  ];
  for (const [id] of committedMap) {
    if (!liveMap.has(id)) {
      const isRequired =
        REQUIRED_PREFIXES.some((p) => id.startsWith(p)) ||
        REQUIRED_EXACT.includes(id);
      if (isRequired) {
        errors.push(`Required KPI missing from live: ${id}`);
      }
    }
  }

  // value / status の不一致（構造系 KPI のみ — perf/obligation は環境差異を許容）
  for (const [id, liveKpi] of liveMap) {
    const committedKpi = committedMap.get(id);
    if (!committedKpi) continue;

    // perf 系は value の差異を許容（環境依存）
    if (id.startsWith("perf.")) continue;
    // obligation は CI 環境で git history が異なるため許容
    if (id.startsWith("docs.obligation")) continue;

    if (liveKpi.value !== committedKpi.value) {
      errors.push(
        `KPI drift: ${id} — committed: ${committedKpi.value}, live: ${liveKpi.value}`,
      );
    }
    if (liveKpi.status !== committedKpi.status) {
      errors.push(
        `Status drift: ${id} — committed: ${committedKpi.status}, live: ${liveKpi.status}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// C. Generated section マーカー + 本文の整合性
// ---------------------------------------------------------------------------
console.log("[docs:check] Checking generated sections...");

const SECTION_FILES = [
  "CLAUDE.md",
  "references/02-status/technical-debt-roadmap.md",
] as const;

const SECTION_ID = "architecture-health-summary";

// live でインライン内容を生成し、committed と比較（timestamp 行を除外）
const assessment = assessOverall(liveReport);
const indicators = buildCompositeIndicators(liveReport);
const risks = detectTopRisks(liveReport);
const actions = generateRecommendations(liveReport);
const hardGateRules = HEALTH_RULES.filter((r) => r.type === "hard_gate");
const hardGateDetails = hardGateRules.map((rule) => {
  const kpi = liveReport.kpis.find((k) => k.id === rule.id);
  return { label: kpi?.label ?? rule.id, pass: kpi?.status !== "fail" };
});
const liveInline = renderCertificateInline({
  report: liveReport,
  assessment,
  indicators,
  risks,
  changes: [],
  actions,
  hardGateDetails,
});

/**
 * 比較用にテキストを正規化する。
 * - timestamp 行を除外
 * - verdict 行を除外（obligation 有無で変動する）
 * - Next/推奨アクション行を除外（同上）
 * - 大きな数値を正規化（perf値の環境差異を吸収）
 */
function normalize(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.startsWith("> 生成:"))
    .filter(
      (line) =>
        !line.startsWith("**Healthy") &&
        !line.startsWith("**Watch") &&
        !line.startsWith("**RISK"),
    )
    .filter((line) => !line.startsWith("**Next:"))
    .filter((line) => !line.startsWith("- "))
    .map((line) => line.replace(/\d{4,}/g, "N"))
    .join("\n")
    .trim();
}

for (const file of SECTION_FILES) {
  const absPath = resolve(repoRoot, file);
  if (!existsSync(absPath)) {
    errors.push(`Missing file: ${file}`);
    continue;
  }
  const content = readFileSync(absPath, "utf-8");
  const startTag = `<!-- GENERATED:START ${SECTION_ID} -->`;
  const endTag = `<!-- GENERATED:END ${SECTION_ID} -->`;

  const startIdx = content.indexOf(startTag);
  const endIdx = content.indexOf(endTag);

  if (startIdx === -1 || endIdx === -1) {
    errors.push(`Missing generated section markers in ${file}`);
    continue;
  }

  const committedSection = content
    .slice(startIdx + startTag.length, endIdx)
    .trim();
  if (committedSection.length === 0) {
    errors.push(`Empty generated section in ${file}`);
    continue;
  }

  // 正規化して比較
  if (normalize(committedSection) !== normalize(liveInline)) {
    errors.push(
      `Generated section stale in ${file} — content differs from live calculation`,
    );
  }
}

// ---------------------------------------------------------------------------
// D. Certificate の存在
// ---------------------------------------------------------------------------
const certPath = resolve(
  repoRoot,
  "references/02-status/generated/architecture-health-certificate.md",
);
if (!existsSync(certPath)) {
  errors.push(
    "Missing: architecture-health-certificate.md — run `npm run docs:generate`",
  );
}

// ---------------------------------------------------------------------------
// E. architecture-debt-recovery Remediation drift (ADR-D-005 PR3)
// ---------------------------------------------------------------------------
const umbrellaInquiryPath = resolve(
  repoRoot,
  "projects/architecture-debt-recovery/inquiry/15-remediation-plan.md",
);
if (existsSync(umbrellaInquiryPath)) {
  // umbrella が active なら remediation 生成物も存在する必要がある
  const remJsonPath = resolve(
    repoRoot,
    "references/02-status/generated/architecture-debt-recovery-remediation.json",
  );
  const remMdPath = resolve(
    repoRoot,
    "references/02-status/generated/architecture-debt-recovery-remediation.md",
  );
  if (!existsSync(remJsonPath)) {
    errors.push(
      "Missing: architecture-debt-recovery-remediation.json — run `npm run docs:generate`",
    );
  } else {
    // 構造的な consistency チェック: itemCount / breakingChangeCount / legacyCount /
    // subProjectCount が inquiry から推定される値と一致するか（timestamp 除外）
    try {
      const committed = JSON.parse(readFileSync(remJsonPath, "utf-8")) as {
        readonly itemCount: number;
        readonly breakingChangeCount: number;
        readonly legacyCount: number;
        readonly subProjectCount: number;
        readonly guardImplementedCount: number;
      };
      const countTokens = (file: string, re: RegExp): number => {
        if (!existsSync(file)) return 0;
        const c = readFileSync(file, "utf-8");
        return new Set(c.match(re) ?? []).size;
      };
      const liveCounts = {
        itemCount: countTokens(umbrellaInquiryPath, /ADR-[A-D]-\d+/g),
        breakingChangeCount: countTokens(
          resolve(
            repoRoot,
            "projects/architecture-debt-recovery/inquiry/16-breaking-changes.md",
          ),
          /BC-\d+/g,
        ),
        legacyCount: countTokens(
          resolve(
            repoRoot,
            "projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md",
          ),
          /LEG-\d+/g,
        ),
        subProjectCount: countTokens(
          resolve(
            repoRoot,
            "projects/architecture-debt-recovery/inquiry/18-sub-project-map.md",
          ),
          /SP-[A-D]/g,
        ),
      };
      for (const [k, live] of Object.entries(liveCounts)) {
        const c = (committed as unknown as Record<string, number>)[k];
        if (c !== live) {
          errors.push(
            `remediation.json drift: ${k} committed=${c} live=${live} — run \`npm run docs:generate\``,
          );
        }
      }
    } catch (e) {
      errors.push(`remediation.json parse error: ${String(e)}`);
    }
  }
  if (!existsSync(remMdPath)) {
    errors.push(
      "Missing: architecture-debt-recovery-remediation.md — run `npm run docs:generate`",
    );
  }
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------
console.log("");
if (errors.length > 0) {
  console.error(`[docs:check] FAIL — ${errors.length} error(s):`);
  for (const err of errors) {
    console.error(`  ✗ ${err}`);
  }
  console.error("");
  console.error("Fix: run `npm run docs:generate` and commit the changes.");
  process.exit(1);
}

console.log(
  "[docs:check] PASS — health gate passed, KPIs match committed, sections valid.",
);

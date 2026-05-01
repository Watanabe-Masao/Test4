/**
 * app-domain/integrity/parsing/yamlFrontmatter.ts —
 * Markdown frontmatter parser (Phase B Step B-3)
 *
 * `contentSpecHelpers.ts` の `parseSpecFrontmatter` を直接 extract。
 * 副作用 (file 読み込み) を排除し、文字列入力 → 構造化出力の純関数に変換。
 * I/O は caller (guard 側) が `readFileSync` で行い、その content を渡す。
 *
 * 設計: integrity-domain-architecture.md §3.2 (yamlFrontmatter primitive)
 * 起源: `contentSpecHelpers.ts:parseSpecFrontmatter` (Phase J 完遂、reference 実装)
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ (引数 string のみ)
 * - 外部 import なし (Node API 不可)
 */

export type SpecKind =
  | "widget"
  | "read-model"
  | "calculation"
  | "chart"
  | "ui-component";

export type LifecycleStatus =
  | "proposed"
  | "active"
  | "deprecated"
  | "sunsetting"
  | "retired"
  | "archived";

export type EvidenceLevel =
  | "generated"
  | "tested"
  | "guarded"
  | "reviewed"
  | "asserted"
  | "unknown";

export type RiskLevel = "high" | "medium" | "low";

export interface BehaviorClaim {
  readonly id: string;
  readonly claim: string;
  readonly evidenceLevel: EvidenceLevel;
  readonly riskLevel: RiskLevel;
  readonly evidence: {
    readonly tests: readonly string[];
    readonly guards: readonly string[];
    readonly reviewedBy?: string | null;
  };
}

export interface SpecFrontmatter {
  readonly id: string;
  readonly kind: SpecKind;
  readonly widgetDefId: string;
  readonly registry: string;
  readonly registrySource: string;
  readonly registryLine: number;
  readonly exportName: string;
  readonly sourceRef: string;
  readonly sourceLine: number;
  readonly contractId: string | null;
  readonly canonicalRegistration: string | null;
  readonly lifecycleStatus: LifecycleStatus;
  readonly replacedBy: string | null;
  readonly supersedes: string | null;
  readonly sunsetCondition: string | null;
  readonly deadline: string | null;
  readonly owner: string | null;
  readonly lastSourceCommit: string | null;
  readonly raw: Record<string, unknown>;
}

/** id prefix から kind を推定する。未知の prefix は null。 */
export function inferKindFromId(id: string): SpecKind | null {
  if (/^WID-\d{3}$/.test(id)) return "widget";
  if (/^RM-\d{3}$/.test(id)) return "read-model";
  if (/^CALC-\d{3}$/.test(id)) return "calculation";
  if (/^CHART-\d{3}$/.test(id)) return "chart";
  if (/^UIC-\d{3}$/.test(id)) return "ui-component";
  return null;
}

/**
 * parseSpecFrontmatter — Markdown 先頭の `---` で囲まれた YAML frontmatter を
 * SpecFrontmatter にパース。
 *
 * @param content - Markdown ファイル全文
 * @param sourceLabel - エラーメッセージ用の出所識別子 (file path 等)
 * @throws frontmatter が見つからない場合
 */
export function parseSpecFrontmatter(
  content: string,
  sourceLabel: string,
): SpecFrontmatter {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) {
    throw new Error(`Invalid frontmatter in ${sourceLabel}`);
  }
  const raw: Record<string, unknown> = {};
  const lines = m[1].split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const km = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!km) {
      i++;
      continue;
    }
    const key = km[1];
    const valueRaw = km[2].trim();
    if (valueRaw === "") {
      const block: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        if (next.trim() === "" || next.trim().startsWith("#")) {
          j++;
          continue;
        }
        if (!next.startsWith("  ")) break;
        block.push(next);
        j++;
      }
      if (block.length > 0 && block.every((l) => l.trim().startsWith("- "))) {
        raw[key] = block.map((l) => parseScalar(l.trim().slice(2).trim()));
      } else if (block.length > 0) {
        const obj: Record<string, unknown> = {};
        for (const l of block) {
          const om = l.trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/);
          if (om) obj[om[1]] = parseScalar(om[2].trim());
        }
        raw[key] = obj;
      } else {
        raw[key] = [];
      }
      i = j;
    } else {
      raw[key] = parseScalar(valueRaw);
      i++;
    }
  }
  const idStr = String(raw.id ?? "");
  const kind = inferKindFromId(idStr) ?? "widget";
  const lifecycleStatus = (
    typeof raw.lifecycleStatus === "string" ? raw.lifecycleStatus : "active"
  ) as LifecycleStatus;
  return {
    id: idStr,
    kind,
    widgetDefId: String(raw.widgetDefId ?? ""),
    registry: String(raw.registry ?? ""),
    registrySource: String(raw.registrySource ?? ""),
    registryLine: typeof raw.registryLine === "number" ? raw.registryLine : 0,
    exportName: String(raw.exportName ?? ""),
    sourceRef: String(raw.sourceRef ?? ""),
    sourceLine: typeof raw.sourceLine === "number" ? raw.sourceLine : 0,
    contractId: typeof raw.contractId === "string" ? raw.contractId : null,
    canonicalRegistration:
      typeof raw.canonicalRegistration === "string"
        ? raw.canonicalRegistration
        : null,
    lifecycleStatus,
    replacedBy: typeof raw.replacedBy === "string" ? raw.replacedBy : null,
    supersedes: typeof raw.supersedes === "string" ? raw.supersedes : null,
    sunsetCondition:
      typeof raw.sunsetCondition === "string" ? raw.sunsetCondition : null,
    deadline: typeof raw.deadline === "string" ? raw.deadline : null,
    owner: typeof raw.owner === "string" ? raw.owner : null,
    lastSourceCommit:
      typeof raw.lastSourceCommit === "string"
        ? raw.lastSourceCommit
        : null,
    raw,
  };
}

function parseScalar(s: string): unknown {
  if (s === "null" || s === "~" || s === "") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "[]") return [];
  if (s === "{}") return {};
  if (/^-?\d+$/.test(s)) return Number(s);
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

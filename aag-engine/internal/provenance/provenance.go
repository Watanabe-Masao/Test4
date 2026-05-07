// Package provenance articulates 出典 metadata for AI-consumable AAG output。
//
// 全 v4.2 substrate command output に共通する provenance block の articulate を
// 単一 source-of-truth で articulate する。describe / list / introspect / 他 後続
// command は本 package の Provenance を import + Compute() で articulate。
//
// Substrate philosophy:
//   - AI が data だけでなく **trustability metadata** (= computedAt / sourceCommit /
//     confidence / computedFrom) を articulate なしで判断できる substrate を articulate
//   - confidence は 4 段階 articulate (= canonical / observed / inferred / heuristic)
//   - sourceCommit は git rev-parse HEAD で best-effort articulate (= git 環境外は空)
//
// 不可侵原則:
//   1. JSON-first
//   3. Read-only first (= git rev-parse のみ)
//   6. Additive-only (= 各 command output に optional な provenance block を追加)
package provenance

import (
	"os/exec"
	"strings"
	"time"
)

// Confidence levels for AI to assess trustability of articulated data.
const (
	// Canonical: schema-backed source-of-truth (= e.g., describe.commandTable).
	Canonical = "canonical"
	// Observed: 計測値 (= e.g., file size、commit hash)。
	Observed = "observed"
	// Inferred: 計算 / heuristic (= e.g., recommendedNextCommand)。
	Inferred = "inferred"
	// Heuristic: weak signal (= e.g., openObligations が 0 の時の "all clear")。
	Heuristic = "heuristic"
)

// Provenance は AAG output に embed される出典 metadata block。
type Provenance struct {
	ComputedAt   string `json:"computedAt"`
	SourceCommit string `json:"sourceCommit,omitempty"`
	Confidence   string `json:"confidence"`
	ComputedFrom string `json:"computedFrom"`
}

// Compute は provenance block を articulate する。
//
// confidence と computedFrom は caller が articulate (= 各 command 自身の文脈で articulate)。
// computedAt は now() で articulate、sourceCommit は git rev-parse HEAD で best-effort articulate。
func Compute(confidence, computedFrom string) Provenance {
	return Provenance{
		ComputedAt:   time.Now().UTC().Format(time.RFC3339),
		SourceCommit: detectSourceCommit(),
		Confidence:   confidence,
		ComputedFrom: computedFrom,
	}
}

// detectSourceCommit は git rev-parse HEAD で current commit hash を articulate する。
// git 環境外 / 失敗時は空文字列を articulate (= JSON omitempty で省略)。
func detectSourceCommit() string {
	cmd := exec.Command("git", "rev-parse", "HEAD")
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

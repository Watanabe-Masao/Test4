// Package responsewrap implements `aag wrap` — improvement A
// (= reposteward-ai-ops-platform、stdin pipeline envelope の additive articulation)。
//
// 全 14 command の output を破壊変更せず、別 command (= aag wrap) で stdin から
// 読み込んだ JSON を pipeline envelope で wrap して articulate する。
//
// Naming note (= v4.2 seed で確定、DA-γ-001):
//   - 旧 schemaVersion 名は "aag-response-v2"。これは既存 TS 側 `aag-response-v1` schema
//     (= docs/contracts/aag/aag-response.schema.json、guard / obligations / health
//     の統一 response 契約) と name conflict を起こすため rename。
//   - 新 schemaVersion 名: "aag-pipeline-envelope-v1" (= stdin pipe 文脈を articulate、
//     既存 aag-response-v1 と直交した別 family であることを articulate)。
//   - Go struct 名 (= WrappedResponse) は internal で同一意味なので変更なし。
//
// 設計判断:
//   - existing command の output は不変 (= breaking change を articulate しない)
//   - `aag wrap` は stdin pipeline で composable (= improvement D との整合)
//   - pipeline envelope は既存 aag-response.schema.json と **別 family** (= DA-γ-001)
//
// 使用例:
//   aag where-am-i --repo . | aag wrap --command where-am-i
//   aag stats files --bucket loc.301_plus | aag wrap --command stats-files
//
// 不可侵原則:
//   1. JSON-first
//   3. Read-only first (= stdin 読込み + JSON wrap のみ)
//   6. Additive-only (= 既存 command の output を変更しない)
package responsewrap

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"time"
)

// WrappedResponse is the pipeline envelope (= aag-pipeline-envelope-v1) that wraps
// any command's existing output as `data`。
//
// Naming (= v4.2 seed、DA-γ-001):
//   - schemaVersion = "aag-pipeline-envelope-v1" (= 旧 "aag-response-v2" から rename)
//   - 既存 TS 側 aag-response-v1 (= docs/contracts/aag/aag-response.schema.json) とは
//     **別 family**。同名 confusion 防止のため rename 実施。
//
// Field articulation:
//   - schemaVersion: 本 envelope の version anchor
//   - command: wrap 対象の command 名 (= --command flag で articulate)
//   - source: 出力元 binary (= "aag-engine")
//   - timestamp: wrap 時刻 (= 元 command の出力時刻ではない)
//   - summary: optional 1 文 summary (= 元 data に summary field があれば echo)
//   - data: 元 command の JSON output を articulate (= 任意 shape)
type WrappedResponse struct {
	SchemaVersion string          `json:"schemaVersion"`
	Command       string          `json:"command"`
	Source        string          `json:"source"`
	Timestamp     string          `json:"timestamp"`
	Summary       string          `json:"summary,omitempty"`
	Data          json.RawMessage `json:"data"`
}

// WrapSchemaVersion is the const articulated in WrappedResponse.schemaVersion.
//
// v4.2 seed で旧 "aag-response-v2" から rename (= DA-γ-001)。既存 TS 側
// aag-response-v1 (= guard / obligations / health の統一 response 契約) との
// name conflict を解消し、stdin pipeline 文脈を articulate する命名に articulate。
const WrapSchemaVersion = "aag-pipeline-envelope-v1"

// SourceName is the const articulated in WrappedResponse.source.
const SourceName = "aag-engine"

// WrapInput controls Wrap.
type WrapInput struct {
	Stdin   io.Reader
	Command string
	NowFn   func() time.Time // optional override for test
}

// Wrap reads JSON from stdin and articulates it inside a pipeline envelope
// (= aag-pipeline-envelope-v1)。
//
// Errors:
//   - Stdin nil → error
//   - Command empty → error
//   - stdin が valid JSON でない → error (= envelope に invalid data を articulate しない)
//
// summary の articulation: 入力 JSON が top-level `summary` field (= string) を
// articulate していれば echo、それ以外は省略。
func Wrap(input WrapInput) (WrappedResponse, error) {
	if input.Stdin == nil {
		return WrappedResponse{}, fmt.Errorf("Wrap: Stdin must be set")
	}
	if input.Command == "" {
		return WrappedResponse{}, fmt.Errorf("Wrap: --command must be set")
	}

	raw, err := io.ReadAll(input.Stdin)
	if err != nil {
		return WrappedResponse{}, fmt.Errorf("Wrap: failed to read stdin: %w", err)
	}
	if len(bytes.TrimSpace(raw)) == 0 {
		return WrappedResponse{}, fmt.Errorf("Wrap: stdin was empty (= input JSON が articulate されていない)")
	}

	// stdin が valid JSON か事前 check
	var probe json.RawMessage
	if err := json.Unmarshal(raw, &probe); err != nil {
		return WrappedResponse{}, fmt.Errorf("Wrap: stdin is not valid JSON: %w", err)
	}

	// summary field を best-effort で抽出
	var summaryProbe struct {
		Summary string `json:"summary"`
	}
	_ = json.Unmarshal(raw, &summaryProbe) // silently ignore if no summary

	now := input.NowFn
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}

	return WrappedResponse{
		SchemaVersion: WrapSchemaVersion,
		Command:       input.Command,
		Source:        SourceName,
		Timestamp:     now().Format(time.RFC3339),
		Summary:       summaryProbe.Summary,
		Data:          probe,
	}, nil
}

// MarshalJSON returns the indented JSON serialization (= AI consumer 読了性、
// SetEscapeHTML(false) で `&` / `<` / `>` literal articulate)。
func MarshalJSON(out WrappedResponse) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(out); err != nil {
		return nil, err
	}
	b := buf.Bytes()
	if n := len(b); n > 0 && b[n-1] == '\n' {
		b = b[:n-1]
	}
	return b, nil
}

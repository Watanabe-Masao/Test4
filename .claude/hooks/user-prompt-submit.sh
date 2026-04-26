#!/bin/bash
# UserPromptSubmit hook — manifest 駆動 context 注入
#
# 役割:
#   AI が prompt を送信した時に、prompt 内のキーワードと
#   .claude/manifest.json の discovery.byTopic を照合し、
#   関連する docs path を additionalContext として inject する。
#
# 設計原則:
#   - hint-only — AI を縛らず、見つけやすさだけ提供
#   - fail-open — 何か壊れても session を妨げない（exit 0 で抜ける）
#   - 軽量 — grep / jq のみ、< 100ms 目標
#   - 過信しない — 一致がなければ何も inject しない（無音）
#
# Hook contract（Claude Code）:
#   stdin: { "prompt": "...", ... }
#   stdout: { "hookSpecificOutput": { "hookEventName": "UserPromptSubmit", "additionalContext": "..." } }
#   stderr: 無視される（debug 用）
#
# 学習ソース: 2026-04-26 PR4.5 Phase 2

set -uo pipefail

# Read input JSON from stdin (silent on failure)
INPUT=$(cat 2>/dev/null || echo '{}')

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
MANIFEST="$REPO_ROOT/.claude/manifest.json"

# Pre-flight: required tools and files
[ -f "$MANIFEST" ] || exit 0
command -v jq > /dev/null 2>&1 || exit 0

# Extract prompt
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""' 2>/dev/null || echo "")
[ -z "$PROMPT" ] && exit 0

# Match prompt against manifest.discovery.byTopic keys
# Skip $-prefixed meta keys
TOPIC_KEYS=$(jq -r '.discovery.byTopic | keys[]? | select(startswith("$") | not)' "$MANIFEST" 2>/dev/null || true)
[ -z "$TOPIC_KEYS" ] && exit 0

# Collect matched topics
MATCHED=""
while IFS= read -r topic; do
  [ -z "$topic" ] && continue
  # Substring match (case-insensitive 不要、業務用語は日本語のため正確一致で十分)
  if echo "$PROMPT" | grep -qF "$topic"; then
    MATCHED="${MATCHED}${topic}\n"
  fi
done <<< "$TOPIC_KEYS"

# If no match, exit silently
[ -z "$MATCHED" ] && exit 0

# Build additionalContext text
CONTEXT_BODY=""
while IFS= read -r topic; do
  [ -z "$topic" ] && continue
  DOCS=$(jq -r --arg t "$topic" '.discovery.byTopic[$t][]?' "$MANIFEST" 2>/dev/null || true)
  [ -z "$DOCS" ] && continue
  CONTEXT_BODY="${CONTEXT_BODY}- ${topic}:\n"
  while IFS= read -r doc; do
    [ -z "$doc" ] && continue
    CONTEXT_BODY="${CONTEXT_BODY}    ${doc}\n"
  done <<< "$DOCS"
done <<< "$(echo -e "$MATCHED")"

[ -z "$CONTEXT_BODY" ] && exit 0

# Compose final additionalContext
FINAL_CONTEXT=$(printf '[manifest discovery] prompt から関連する可能性がある docs:\n%b\n参照は任意（hint）。AI の判断で必要なものだけ Read してください。' "$CONTEXT_BODY")

# Output JSON for Claude Code
jq -n --arg ctx "$FINAL_CONTEXT" \
  '{ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: $ctx } }' \
  2>/dev/null || exit 0

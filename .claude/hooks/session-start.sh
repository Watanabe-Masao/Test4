#!/bin/bash
# session-start hook — Claude Code SessionStart event handler
#
# 役割:
#   1. tools/git-hooks/pre-push を .git/hooks/pre-push に install (常時)
#   2. Claude Code on the web セッションで app/ npm 依存を install (web 限定)
#
# 設計原則:
#   - 同期実行 (async モードを使わない)。pre-push install は ms 単位で完了する
#     ため async 化のメリットがない
#   - 冪等性 (複数回実行しても安全)
#   - 非対話的 (ユーザー入力を要求しない)
#   - 失敗しても session 起動を妨げない (set -e ではなく逐次エラーチェック)
#
# 学習ソース:
#   - 2026-04-13 PR #1015 で testSignalIntegrityGuard.test.ts (新規追加ファイル) が
#     CI format:check で fail。原因は .git/hooks/pre-push が install されておらず
#     pre-push の check_format / check_format_added_files が走っていなかったこと。
#     本 hook が install 漏れを構造的に防ぐ
#   - tools/git-hooks/pre-push 冒頭コメント L69-70 のセットアップ手順を自動化

set -uo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$REPO_ROOT" || {
  echo "[session-start] cannot cd to repo root: $REPO_ROOT" >&2
  exit 0
}

# ─── 1. Install pre-push git hook (always) ──────────────────────────
#
# tools/git-hooks/pre-push が存在し .git/hooks/ ディレクトリがある場合、
# 内容が異なれば cp + chmod する。
# 既に同一なら何もしない (sessio start 出力を最小化)。

if [ -f "tools/git-hooks/pre-push" ] && [ -d ".git/hooks" ]; then
  if ! cmp -s "tools/git-hooks/pre-push" ".git/hooks/pre-push" 2>/dev/null; then
    if cp tools/git-hooks/pre-push .git/hooks/pre-push 2>/dev/null && \
       chmod +x .git/hooks/pre-push 2>/dev/null; then
      echo "[session-start] pre-push hook installed/updated -> .git/hooks/pre-push"
    else
      echo "[session-start] WARN: failed to install pre-push hook (continuing)" >&2
    fi
  fi
fi

# ─── 2. Web-only: install npm dependencies if missing ─────────────────
#
# Claude Code on the web (CLAUDE_CODE_REMOTE=true) でセッション開始時に
# app/ の node_modules が無ければ install する。
#
# 注意:
#   - WASM build (cd ../wasm/.../wasm-pack build) は重い + rust toolchain
#     必須なので本 hook では実行しない
#   - WASM が pre-built されていることを前提とする
#   - app/package.json は file:../wasm/.../pkg 依存を含むため WASM 未ビルドの
#     状態で npm install すると失敗する → その場合は手動 npm run setup を促す
#   - local セッションでは初回 npm run setup 済みの想定で skip

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  if [ -f "app/package.json" ] && [ ! -d "app/node_modules" ]; then
    echo "[session-start] Installing app/ npm dependencies (web session)..."
    if (cd app && npm install --no-fund --no-audit 2>&1 | tail -20); then
      echo "[session-start] app/ npm dependencies installed"
    else
      echo "[session-start] WARN: npm install failed in app/. WASM may not be" >&2
      echo "                    pre-built. Run 'npm run setup' from repo root manually." >&2
    fi
  fi
fi

exit 0

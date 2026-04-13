/**
 * Version Sync Registry — Schema 層
 *
 * 同じバージョン値が複数文書に重複して存在する箇所を **宣言的に登録** する。
 * 整合性は `app/src/test/guards/versionSyncGuard.test.ts` が registry を loop して
 * 機械的に検証する。
 *
 * **新しい同期ペアの追加方法:**
 * 1. 本ファイルの `VERSION_SYNC_REGISTRY` に 1 entry 追加するだけ
 * 2. guard ファイルは触らない（generic loop で自動的に検査される）
 *
 * AAG レイヤー: Layer 2 Schema（宣言的契約）。
 * 検出実装は `versionSyncGuard.test.ts` の Layer 3 Execution に閉じる。
 *
 * 参照: `references/03-guides/project-checklist-governance.md`（同様の宣言的設計）
 */

export interface VersionSyncPair {
  /** ペア ID — テスト名と error message に使う */
  readonly id: string
  /** 何の値を同期しているか（人間向け説明） */
  readonly description: string
  /** 比較元 */
  readonly source: {
    readonly file: string // repo 相対
    readonly extract: (content: string) => string | undefined
    readonly label: string
  }
  /** 比較先（通常は project-metadata.json appVersion） */
  readonly target: {
    readonly file: string // repo 相対
    readonly extract: (content: string) => string | undefined
    readonly label: string
  }
}

const PROJECT_METADATA_TARGET = {
  file: 'docs/contracts/project-metadata.json',
  extract: (content: string): string | undefined => {
    try {
      const json = JSON.parse(content) as { appVersion?: string }
      return json.appVersion
    } catch {
      return undefined
    }
  },
  label: 'project-metadata.json appVersion',
} as const

export const VERSION_SYNC_REGISTRY: readonly VersionSyncPair[] = [
  {
    id: 'package.json ↔ project-metadata.json',
    description: 'app/package.json の version と project-metadata.json appVersion の一致',
    source: {
      file: 'app/package.json',
      extract: (content: string): string | undefined => {
        try {
          const json = JSON.parse(content) as { version?: string }
          return json.version
        } catch {
          return undefined
        }
      },
      label: 'package.json version',
    },
    target: PROJECT_METADATA_TARGET,
  },
  {
    id: 'CHANGELOG.md latest ↔ project-metadata.json',
    description: 'CHANGELOG.md の最新リリース版と project-metadata.json appVersion の一致',
    source: {
      file: 'CHANGELOG.md',
      extract: (content: string): string | undefined => {
        const match = /## \[v([\d.]+)\]/.exec(content)
        return match?.[1]
      },
      label: 'CHANGELOG.md 最新 [v...]',
    },
    target: PROJECT_METADATA_TARGET,
  },
  {
    id: 'recent-changes.md latest ↔ project-metadata.json',
    description:
      'recent-changes.md の最新バージョン見出しと project-metadata.json appVersion の一致',
    source: {
      file: 'references/02-status/recent-changes.md',
      // `## v1.8.0 — ...` 形式の最初の出現を拾う
      extract: (content: string): string | undefined => {
        const match = /^## v([\d.]+)/m.exec(content)
        return match?.[1]
      },
      label: 'recent-changes.md 最新 ## v...',
    },
    target: PROJECT_METADATA_TARGET,
  },
  {
    id: 'package.json ↔ package-lock.json',
    description:
      'app/package.json の version と app/package-lock.json の root version / packages[""].version の一致（npm install 実行漏れ検出）',
    source: {
      file: 'app/package.json',
      extract: (content: string): string | undefined => {
        try {
          const json = JSON.parse(content) as { version?: string }
          return json.version
        } catch {
          return undefined
        }
      },
      label: 'package.json version',
    },
    target: {
      file: 'app/package-lock.json',
      extract: (content: string): string | undefined => {
        try {
          const json = JSON.parse(content) as {
            version?: string
            packages?: Record<string, { version?: string }>
          }
          // root entry (空 key) の version を優先、なければ top-level version
          return json.packages?.['']?.version ?? json.version
        } catch {
          return undefined
        }
      },
      label: 'package-lock.json root version',
    },
  },
] as const

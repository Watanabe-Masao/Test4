import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { calculateLegacyOutput } from '../src/legacy.js';
import { calculateNewTsOutput } from '../src/new-ts.js';
import { Dataset, Output } from '../src/types.js';

const metricDiff = (a: number, b: number): number => Math.round((b - a) * 1_000_000) / 1_000_000;

function getRustOutput(dataset: Dataset): Output {
  const run = spawnSync('cargo', ['run', '--quiet', '--manifest-path', 'rust_engine/Cargo.toml'], {
    input: JSON.stringify(dataset),
    encoding: 'utf8'
  });
  if (run.status !== 0) {
    throw new Error(run.stderr || 'failed to execute rust engine');
  }
  return JSON.parse(run.stdout) as Output;
}

async function main(): Promise<void> {
  const raw = await readFile('fixtures/representative-dataset.json', 'utf8');
  const dataset = JSON.parse(raw) as Dataset;

  const legacy = calculateLegacyOutput(dataset);
  const tsNew = calculateNewTsOutput(dataset);
  const rustNew = getRustOutput(dataset);

  const markdown = `# 差分監視ダッシュボード\n\n` +
`- legacy 基準 totalGrossProfit: ${legacy.report.totalGrossProfit}\n` +
`- new-ts 差分: ${metricDiff(legacy.report.totalGrossProfit, tsNew.report.totalGrossProfit)}\n` +
`- new-rust 差分: ${metricDiff(legacy.report.totalGrossProfit, rustNew.report.totalGrossProfit)}\n\n` +
`## 並行運用期間\n` +
`- 2026-03-01 〜 2026-04-30: legacy/new-ts/new-rust を同時実行\n` +
`- 2026-05-01: 乖離ゼロ継続を確認後に legacy 廃止判定\n`;

  await writeFile('snapshots/diff-dashboard.md', markdown, 'utf8');
  process.stdout.write('dashboard generated\n');
}

main().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});

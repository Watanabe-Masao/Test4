import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { calculateLegacyOutput } from '../src/legacy.js';
import { calculateNewTsOutput } from '../src/new-ts.js';
import { Dataset, Output } from '../src/types.js';

const EPSILON = 1e-6;

function expectClose(actual: unknown, expected: unknown, path = '$'): void {
  if (typeof actual === 'number' && typeof expected === 'number') {
    assert.ok(Math.abs(actual - expected) <= EPSILON, `mismatch at ${path}: ${actual} != ${expected}`);
    return;
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    assert.equal(actual.length, expected.length, `length mismatch at ${path}`);
    actual.forEach((v, i) => expectClose(v, expected[i], `${path}[${i}]`));
    return;
  }

  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const keys = new Set([
      ...Object.keys(actual as Record<string, unknown>),
      ...Object.keys(expected as Record<string, unknown>)
    ]);
    [...keys].forEach((key) => {
      expectClose(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
        `${path}.${key}`
      );
    });
    return;
  }

  assert.deepEqual(actual, expected, `mismatch at ${path}`);
}

async function loadFixture(): Promise<Dataset> {
  const raw = await readFile('fixtures/representative-dataset.json', 'utf8');
  return JSON.parse(raw) as Dataset;
}

test('legacy TS and new TS implementation produce equivalent output', async () => {
  const dataset = await loadFixture();
  const legacy = calculateLegacyOutput(dataset);
  const newer = calculateNewTsOutput(dataset);

  expectClose(newer.storeGrossProfit, legacy.storeGrossProfit, '$.storeGrossProfit');
  expectClose(newer.dailyTrend, legacy.dailyTrend, '$.dailyTrend');
  expectClose(newer.report, legacy.report, '$.report');
});

test('legacy TS and new Rust implementation produce equivalent output', async () => {
  const dataset = await loadFixture();
  const legacy = calculateLegacyOutput(dataset);

  const run = spawnSync('cargo', ['run', '--quiet', '--manifest-path', 'rust_engine/Cargo.toml'], {
    input: JSON.stringify(dataset),
    encoding: 'utf8'
  });

  assert.equal(run.status, 0, run.stderr);
  const rustOutput = JSON.parse(run.stdout) as Output;

  expectClose(rustOutput.storeGrossProfit, legacy.storeGrossProfit, '$.storeGrossProfit');
  expectClose(rustOutput.dailyTrend, legacy.dailyTrend, '$.dailyTrend');
  expectClose(rustOutput.report, legacy.report, '$.report');
});

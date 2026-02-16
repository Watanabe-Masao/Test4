import { readFile } from 'node:fs/promises';
import { calculateLegacyOutput } from '../src/legacy.js';
import { Dataset, Output } from '../src/types.js';

const EPSILON = 1e-6;

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPSILON;
}

function deepCompare(actual: unknown, expected: unknown, path = '$'): string[] {
  if (typeof actual === 'number' && typeof expected === 'number') {
    return approxEqual(actual, expected) ? [] : [`${path}: ${actual} != ${expected}`];
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) {
      return [`${path}: length ${actual.length} != ${expected.length}`];
    }
    return actual.flatMap((item, i) => deepCompare(item, expected[i], `${path}[${i}]`));
  }

  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const actualEntries = Object.entries(actual as Record<string, unknown>);
    const expectedEntries = Object.entries(expected as Record<string, unknown>);

    const keys = new Set([...actualEntries.map(([k]) => k), ...expectedEntries.map(([k]) => k)]);
    return [...keys].flatMap((key) =>
      deepCompare(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
        `${path}.${key}`
      )
    );
  }

  return actual === expected ? [] : [`${path}: ${String(actual)} != ${String(expected)}`];
}

async function main(): Promise<void> {
  const [rawDataset, rawExpected] = await Promise.all([
    readFile('fixtures/representative-dataset.json', 'utf8'),
    readFile('snapshots/expected-output.json', 'utf8')
  ]);

  const dataset = JSON.parse(rawDataset) as Dataset;
  const expected = JSON.parse(rawExpected) as Output;
  const actual = calculateLegacyOutput(dataset);

  const errors = deepCompare(actual, expected);
  if (errors.length > 0) {
    throw new Error(`Snapshot mismatch:\n${errors.join('\n')}`);
  }

  process.stdout.write('snapshot compare passed\n');
}

main().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});

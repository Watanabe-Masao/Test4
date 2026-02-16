import { readFile, writeFile } from 'node:fs/promises';
import { calculateLegacyOutput } from '../src/legacy.js';
import { Dataset } from '../src/types.js';

async function main(): Promise<void> {
  const raw = await readFile('fixtures/representative-dataset.json', 'utf8');
  const dataset = JSON.parse(raw) as Dataset;
  const output = calculateLegacyOutput(dataset);

  await writeFile(
    'snapshots/expected-output.json',
    `${JSON.stringify(output, null, 2)}\n`,
    'utf8'
  );

  process.stdout.write('snapshot generated\n');
}

main().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});

import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

const patterns = ['src/**/*.ts', 'scripts/**/*.ts', 'tests/**/*.ts'];
const errors = [];

for (const pattern of patterns) {
  for await (const file of glob(pattern)) {
    const text = await readFile(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      if (/\s+$/.test(line)) {
        errors.push(`${file}:${idx + 1}: trailing whitespace`);
      }
      if (line.length > 140) {
        errors.push(`${file}:${idx + 1}: line too long (${line.length})`);
      }
    });
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('lint passed');

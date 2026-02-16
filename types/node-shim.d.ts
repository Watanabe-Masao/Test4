declare module 'node:fs/promises' {
  export function readFile(path: string | URL, encoding: string): Promise<string>;
  export function writeFile(path: string | URL, data: string, encoding: string): Promise<void>;
  export function glob(pattern: string): AsyncIterable<string>;
}

declare module 'node:child_process' {
  interface SpawnSyncResult {
    status: number | null;
    stdout: string;
    stderr: string;
  }
  export function spawnSync(command: string, args: string[], options: {
    input?: string;
    encoding?: string;
  }): SpawnSyncResult;
}

declare module 'node:test' {
  const test: (name: string, fn: () => Promise<void> | void) => void;
  export default test;
}

declare module 'node:assert/strict' {
  const assert: {
    ok(value: unknown, message?: string): void;
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
  };
  export default assert;
}

declare const process: {
  stdout: { write: (text: string) => void };
  stderr: { write: (text: string) => void };
  exitCode?: number;
};

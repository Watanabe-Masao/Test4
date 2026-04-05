#!/usr/bin/env node

/**
 * Bootstrap Contract: 依存ツールの存在チェック
 *
 * npm run setup の最初に実行され、必要なツールが揃っていることを保証する。
 * 不足時は明確なエラーメッセージとインストール手順を表示する。
 */

const { execSync } = require('child_process')

const errors = []

function getVersion(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    return null
  }
}

function checkSemver(version, minMajor) {
  const match = version.match(/(\d+)/)
  return match ? parseInt(match[1], 10) >= minMajor : false
}

// Node.js >= 22
const nodeVersion = getVersion('node --version')
if (!nodeVersion || !checkSemver(nodeVersion, 22)) {
  errors.push(
    `Node.js >= 22 required (found: ${nodeVersion || 'not installed'})` +
      '\n  Install: https://nodejs.org/ or use nvm: nvm install 22',
  )
}

// npm >= 10
const npmVersion = getVersion('npm --version')
if (!npmVersion || !checkSemver(npmVersion, 10)) {
  errors.push(
    `npm >= 10 required (found: ${npmVersion || 'not installed'})` +
      '\n  Bundled with Node.js 22+. Run: npm install -g npm@latest',
  )
}

// Rust (rustc)
const rustVersion = getVersion('rustc --version')
if (!rustVersion) {
  errors.push(
    'Rust toolchain required (rustc not found)' +
      '\n  Install: https://rustup.rs/ — curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh',
  )
}

// wasm-pack
const wasmPackVersion = getVersion('wasm-pack --version')
if (!wasmPackVersion) {
  errors.push(
    'wasm-pack required (not found)' +
      '\n  Install: cargo install wasm-pack@0.13.1',
  )
}

if (errors.length > 0) {
  console.error('\n\x1b[31m✗ Missing dependencies:\x1b[0m\n')
  errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}\n`))
  process.exit(1)
} else {
  console.log('\x1b[32m✓ All dependencies satisfied\x1b[0m')
  console.log(`  Node ${nodeVersion}, npm ${npmVersion}, ${rustVersion}, ${wasmPackVersion}`)
}

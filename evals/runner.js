#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const root = process.cwd()
const evalPath = join(root, 'evals', 'tasks', 'basic-platform-eval.json')
const spec = JSON.parse(readFileSync(evalPath, 'utf-8'))

let passed = 0
let failed = 0

for (const check of spec.checks) {
  if (check.type === 'file_exists') {
    const ok = existsSync(join(root, check.path))
    if (ok) {
      passed += 1
      console.log(`PASS file_exists ${check.path}`)
    } else {
      failed += 1
      console.log(`FAIL file_exists ${check.path}`)
    }
  } else {
    failed += 1
    console.log(`FAIL unsupported_check ${check.type}`)
  }
}

console.log(`\nSummary: passed=${passed} failed=${failed}`)
process.exit(failed > 0 ? 1 : 0)


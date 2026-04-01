#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

const filesToCheck = [
  'evals/runner.js',
  'evals/lint.js',
  'evals/build.js',
  'evals/tests/providers.integration.test.js',
  'src/services/Integrations/providers.js',
]

for (const file of filesToCheck) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' })
}

console.log(`Lint checks passed for ${filesToCheck.length} file(s)`)


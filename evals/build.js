#!/usr/bin/env node
import { statSync } from 'node:fs'

const requiredArtifacts = [
  'package.json',
  'bun.lock',
  'src/main.tsx',
  'src/tools.ts',
]

for (const artifact of requiredArtifacts) {
  statSync(artifact)
}

console.log('Build verification passed: required packaged artifacts are present')

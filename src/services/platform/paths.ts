import { mkdir } from 'fs/promises'
import { join } from 'path'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'

export function getPlatformDataDir(): string {
  return join(getClaudeConfigHomeDir(), 'platform')
}

export async function ensurePlatformDataDir(): Promise<string> {
  const dir = getPlatformDataDir()
  await mkdir(dir, { recursive: true, mode: 0o700 })
  return dir
}


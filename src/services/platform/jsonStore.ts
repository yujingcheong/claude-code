import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { ensurePlatformDataDir } from './paths.js'

export async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const dir = await ensurePlatformDataDir()
    const path = join(dir, filename)
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const dir = await ensurePlatformDataDir()
  const path = join(dir, filename)
  await writeFile(path, JSON.stringify(data, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  })
}

